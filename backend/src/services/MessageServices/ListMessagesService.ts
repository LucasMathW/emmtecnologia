import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { Op } from "sequelize";
import { intersection } from "lodash";
import User from "../../models/User";
import isQueueIdHistoryBlocked from "../UserServices/isQueueIdHistoryBlocked";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import MessageReaction from "../../models/MessageReaction";

interface Request {
  ticketId: string;
  companyId: number;
  pageNumber?: string;
  queues?: number[];
  user?: User;
}

interface Response {
  messages: Message[];
  ticket: Ticket;
  count: number;
  hasMore: boolean;
}

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId,
  companyId,
  queues = [],
  user
}: Request): Promise<Response> => {
  // [PERF] instrumentação temporária para diagnosticar latência da rota GET /messages/:ticketId
  const __perfServiceStart = Date.now();
  const __origTicketId = ticketId;

  if (!isNaN(Number(ticketId))) {
    const __t_uuid = Date.now();
    const uuid = await Ticket.findOne({
      where: {
        id: ticketId,
        companyId
      },
      attributes: ["uuid"]
    });
    console.log(
      `[PERF][ListMessagesService] Ticket.findOne (uuid lookup): ${
        Date.now() - __t_uuid
      }ms (ticketId=${__origTicketId})`
    );
    ticketId = uuid.uuid;
  }

  const __t_ticket = Date.now();
  const ticket = await Ticket.findOne({
    where: {
      uuid: ticketId,
      companyId
    }
  });
  console.log(
    `[PERF][ListMessagesService] Ticket.findOne (main ticket): ${
      Date.now() - __t_ticket
    }ms (ticketId=${__origTicketId})`
  );

  const ticketsFilter: any[] | null = [];

  const __t_historyBlocked = Date.now();
  const isAllHistoricEnabled = await isQueueIdHistoryBlocked({
    userRequest: user.id
  });
  console.log(
    `[PERF][ListMessagesService] isQueueIdHistoryBlocked (User.findByPk redundante): ${
      Date.now() - __t_historyBlocked
    }ms (ticketId=${__origTicketId})`
  );

  let ticketIds = [];
  const __t_siblingTickets = Date.now();
  if (!isAllHistoricEnabled) {
    ticketIds = await Ticket.findAll({
      where: {
        id: { [Op.lte]: ticket.id },
        companyId: ticket.companyId,
        contactId: ticket.contactId,
        whatsappId: ticket.whatsappId,
        isGroup: ticket.isGroup,
        queueId:
          user.profile === "admin" ||
          user.allTicket === "enable" ||
          (ticket.isGroup && user.allowGroup)
            ? {
                [Op.or]: [queues, null]
              }
            : { [Op.in]: queues }
      },
      attributes: ["id"]
    });
  } else {
    ticketIds = await Ticket.findAll({
      where: {
        id: { [Op.lte]: ticket.id },
        companyId: ticket.companyId,
        contactId: ticket.contactId,
        whatsappId: ticket.whatsappId,
        isGroup: ticket.isGroup
      },
      attributes: ["id"]
    });
  }
  console.log(
    `[PERF][ListMessagesService] Ticket.findAll (tickets irmãos, ${
      ticketIds.length
    } encontrados): ${
      Date.now() - __t_siblingTickets
    }ms (ticketId=${__origTicketId})`
  );

  if (ticketIds) {
    ticketsFilter.push(ticketIds.map(t => t.id));
  }
  // }

  const tickets: number[] = intersection(...ticketsFilter);

  if (!tickets) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // await setMessagesAsRead(ticket);
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const __t_messages = Date.now();
  const { count, rows: messages } = await Message.findAndCountAll({
    where: { ticketId: tickets, companyId },
    attributes: [
      "id",
      "wid",
      "fromMe",
      "mediaUrl",
      "body",
      "mediaType",
      "ack",
      "createdAt",
      "ticketId",
      "isDeleted",
      "queueId",
      "isForwarded",
      "isEdited",
      "isPrivate",
      "companyId",
      "transcribed"
    ],
    limit,
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name"]
      },
      {
        model: Message,
        attributes: [
          "id",
          "wid",
          "fromMe",
          "mediaUrl",
          "body",
          "mediaType",
          "companyId"
        ],
        as: "quotedMsg",
        include: [
          {
            model: Contact,
            as: "contact",
            attributes: ["id", "name"]
          }
        ],
        required: false
      },
      {
        model: Ticket,
        required: true,
        attributes: ["id", "whatsappId", "queueId"],
        include: [
          {
            model: Queue,
            as: "queue",
            attributes: ["id", "name", "color"]
          }
        ]
      },
      {
        model: MessageReaction,
        as: "reactions",
        attributes: ["id", "emoji", "userId", "createdAt"],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name"]
          }
        ]
      }
    ],
    distinct: true,
    offset,
    subQuery: false,
    order: [["createdAt", "DESC"]]
  });
  console.log(
    `[PERF][ListMessagesService] Message.findAndCountAll (query principal com 4 JOINs, ${
      messages.length
    } mensagens de ${count} total): ${
      Date.now() - __t_messages
    }ms (ticketId=${__origTicketId})`
  );

  const __t_reverse = Date.now();
  const hasMore = count > offset + messages.length;
  const reversedMessages = messages.reverse();
  console.log(
    `[PERF][ListMessagesService] messages.reverse() (processamento JS): ${
      Date.now() - __t_reverse
    }ms (ticketId=${__origTicketId})`
  );

  console.log(
    `[PERF][ListMessagesService] TOTAL service: ${
      Date.now() - __perfServiceStart
    }ms (ticketId=${__origTicketId})`
  );

  return {
    messages: reversedMessages,
    ticket,
    count,
    hasMore
  };
};

export default ListMessagesService;
