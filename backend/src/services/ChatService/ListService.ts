import { Op } from "sequelize";
import Chat from "../../models/Chat";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";
import ChatMessage from "../../models/ChatMessage";

interface Request {
  ownerId: number;
  companyId?: number;
  pageNumber?: string;
}

interface ChatWithLastMessage extends ReturnType<Chat["toJSON"]> {
  lastMessage: ChatMessage | null;
}

interface Response {
  records: ChatWithLastMessage[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  ownerId,
  companyId,
  pageNumber = "1"
}: Request): Promise<Response> => {
  // [PERF] instrumentação temporária para diagnosticar latência da rota GET /chats
  const __perfStart = Date.now();

  const __t_chatUsers = Date.now();
  const chatUsers = await ChatUser.findAll({
    where: { userId: ownerId }
  });
  console.log(
    `[PERF][ChatService.ListService] ChatUser.findAll: ${
      Date.now() - __t_chatUsers
    }ms (${chatUsers.length} chats do usuário)`
  );

  const chatIds = chatUsers.map(chat => chat.chatId);

  const limit = 100;
  const offset = limit * (+pageNumber - 1);

  const whereClause: any = {
    id: {
      [Op.in]: chatIds
    }
  };
  if (companyId) {
    whereClause.companyId = companyId;
  }

  const __t_mainQuery = Date.now();
  const { count, rows: records } = await Chat.findAndCountAll({
    where: whereClause,
    include: [
      { model: User, as: "owner" },
      { model: ChatUser, as: "users", include: [{ model: User, as: "user" }] },
      {
        model: ChatMessage,
        as: "messages",
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "name", "profileImage"]
          },
          {
            model: ChatMessage,
            as: "replyTo",
            include: [
              {
                model: User,
                as: "sender",
                attributes: ["id", "name", "profileImage"]
              }
            ],
            attributes: ["id", "message"]
          }
        ]
      }
    ],
    limit,
    offset,
    order: [["updatedAt", "DESC"]]
  });
  console.log(
    `[PERF][ChatService.ListService] Chat.findAndCountAll (JOIN com users+messages+replyTo, sem distinct/limit no include hasMany -> risco de multiplicação de linhas; ${
      records.length
    } registros de ${count} total): ${Date.now() - __t_mainQuery}ms`
  );

  const __t_filter = Date.now();
  // Filter out chats where any user no longer exists
  const validRecords = records.filter(chat => {
    // Check if owner exists
    if (!chat.owner) return false;

    // For non-group chats, check if the other user exists
    if (!chat.isGroup) {
      const otherUser = chat.users.find(u => u.userId !== ownerId);
      if (!otherUser || !otherUser.user) return false;
    }

    // For group chats, check if at least 2 users exist (including owner)
    if (chat.isGroup) {
      const validUsers = chat.users.filter(u => u.user).length;
      if (validUsers < 2) return false;
    }

    return true;
  });
  console.log(
    `[PERF][ChatService.ListService] filter validRecords (JS): ${
      Date.now() - __t_filter
    }ms (${validRecords.length} de ${records.length} válidos)`
  );

  // [PERF] N+1: 1 query (com 2 JOINs) por chat, disparadas em paralelo via Promise.all.
  // Com limit=100 isso pode disparar até 100 queries concorrentes, saturando o pool de conexões do DB.
  const __t_n1 = Date.now();
  const recordsWithLastMessage = await Promise.all(
    validRecords.map(async chat => {
      const lastMessage = await ChatMessage.findOne({
        where: { chatId: chat.id },
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "name", "profileImage"]
          },
          {
            model: ChatMessage,
            as: "replyTo",
            include: [
              {
                model: User,
                as: "sender",
                attributes: ["id", "name", "profileImage"]
              }
            ],
            attributes: ["id", "message"]
          }
        ]
      });
      return { ...chat.toJSON(), lastMessage };
    })
  );
  console.log(
    `[PERF][ChatService.ListService] Promise.all ChatMessage.findOne (N+1, ${
      validRecords.length
    } queries concorrentes): ${Date.now() - __t_n1}ms`
  );

  console.log(
    `[PERF][ChatService.ListService] TOTAL service: ${
      Date.now() - __perfStart
    }ms`
  );

  const hasMore = count > offset + records.length;

  return {
    records: recordsWithLastMessage,
    count: validRecords.length,
    hasMore
  };
};

export default ListService;
