import {
  Op,
  fn,
  where,
  col,
  Filterable,
  Includeable,
  literal,
  QueryTypes
} from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import sequelize from "../../database";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import User from "../../models/User";
import ShowUserService from "../UserServices/ShowUserService";
import Tag from "../../models/Tag";

import { intersection } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import ContactTag from "../../models/ContactTag";
import ContactWallet from "../../models/ContactWallet";

import removeAccents from "remove-accents";

import FindCompanySettingOneService from "../CompaniesSettings/FindCompanySettingOneService";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  date?: string;
  dateStart?: string;
  dateEnd?: string;
  updatedAt?: string;
  showAll?: string;
  userId: number;
  withUnreadMessages?: string;
  queueIds: number[];
  tags: number[];
  users: number[];
  contacts?: string[];
  updatedStart?: string;
  updatedEnd?: string;
  connections?: string[];
  whatsappIds?: number[];
  statusFilters?: string[];
  queuesFilter?: string[];
  isGroup?: string;
  companyId: number;
  allTicket?: string;
  sortTickets?: string;
  searchOnMessages?: string;
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const ListTicketsService = async ({
  searchParam = "",
  pageNumber = "1",
  queueIds,
  tags,
  users,
  status,
  date,
  dateStart,
  dateEnd,
  updatedAt,
  showAll,
  userId,
  withUnreadMessages = "false",
  whatsappIds,
  statusFilters,
  companyId,
  sortTickets = "DESC",
  searchOnMessages = "false"
}: Request): Promise<Response> => {
  // [PERF] instrumentação temporária para diagnosticar latência da rota GET /tickets
  const __perfStart = Date.now();

  const __t_user = Date.now();
  const user = await ShowUserService(userId, companyId);
  console.log(
    `[PERF][ListTicketsService] ShowUserService: ${
      Date.now() - __t_user
    }ms (status=${status})`
  );

  const showTicketAllQueues = user.allHistoric === "enabled";
  const showTicketWithoutQueue = user.allTicket === "enable";
  const showGroups = user.allowGroup === true;
  const isAdmin = user.profile === "admin";
  const canUseShowAll = isAdmin || user.allUserChat === "enabled";

  const __t_settings = Date.now();
  const showPendingNotification = await FindCompanySettingOneService({
    companyId,
    column: "showNotificationPending"
  });
  console.log(
    `[PERF][ListTicketsService] FindCompanySettingOneService: ${
      Date.now() - __t_settings
    }ms (status=${status})`
  );

  const showNotificationPendingValue =
    showPendingNotification[0].showNotificationPending;

  const userQueueIds = user.queues.map(queue => queue.id);

  // Usuário comum: nunca confiar no queueIds vindo do frontend.
  // Admin: pode usar o filtro enviado pelo frontend.
  const allowedQueueIds = isAdmin
    ? queueIds?.length
      ? queueIds
      : userQueueIds
    : queueIds?.length
    ? queueIds.filter(id => userQueueIds.includes(id))
    : userQueueIds;

  const queueFilterWithNull = { [Op.or]: [allowedQueueIds, null] };
  const queueFilterOnly = { [Op.in]: allowedQueueIds };

  let whereCondition: Filterable["where"] = {
    companyId,
    queueId: showTicketWithoutQueue ? queueFilterWithNull : queueFilterOnly,
    [Op.or]: [
      { userId },
      {
        status: "pending",
        queueId: showTicketWithoutQueue ? queueFilterWithNull : queueFilterOnly
      }
    ]
  };

  let includeCondition: Includeable[] = [
    {
      model: Contact,
      as: "contact",
      attributes: [
        "id",
        "name",
        "number",
        "email",
        "profilePicUrl",
        "acceptAudioMessage",
        "active",
        "urlPicture",
        "companyId",
        "isGroup",
        "remoteJid"
      ],
      include: [
        "extraInfo",
        "tags",
        {
          model: ContactWallet,
          include: [
            {
              model: User,
              attributes: ["id", "name"]
            },
            {
              model: Queue,
              attributes: ["id", "name"]
            }
          ]
        }
      ]
    },
    {
      model: Queue,
      as: "queue",
      attributes: ["id", "name", "color"]
    },
    {
      model: User,
      as: "user",
      attributes: ["id", "name"]
    },
    {
      model: Tag,
      as: "tags",
      attributes: ["id", "name", "color"]
    },
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["id", "name", "expiresTicket", "groupAsTicket", "color"]
    }
  ];

  // [PERF] mede todo o bloco de montagem condicional do whereCondition
  // (inclui as sub-queries de status=pending/closed/search, tags, etc.)
  const __t_prequery = Date.now();

  if (status === "open") {
    whereCondition = {
      companyId,
      userId,
      queueId: queueFilterOnly
    };
  } else if (status === "group" && user.allowGroup && user.whatsappId) {
    whereCondition = {
      companyId,
      whatsappId: user.whatsappId,
      queueId: showTicketWithoutQueue ? queueFilterWithNull : queueFilterOnly
    };
  } else if (status === "group" && user.allowGroup && !user.whatsappId) {
    whereCondition = {
      companyId,
      queueId: showTicketWithoutQueue ? queueFilterWithNull : queueFilterOnly
    };
  } else if (status === "chatbot") {
    if (isAdmin || showAll === "true") {
      whereCondition = {
        companyId,
        status: "chatbot",
        queueId: showTicketWithoutQueue ? queueFilterWithNull : queueFilterOnly
      };
    } else {
      whereCondition = {
        companyId,
        status: "chatbot",
        [Op.or]: [{ userId }, { userId: null }],
        queueId: showTicketWithoutQueue ? queueFilterWithNull : queueFilterOnly
      };
    }
  } else if (
    user.profile === "user" &&
    status === "pending" &&
    showTicketWithoutQueue
  ) {
    const TicketsUserFilter: number[][] = [];
    let ticketsIds = [];

    if (!showTicketAllQueues) {
      ticketsIds = await Ticket.findAll({
        where: {
          userId: { [Op.or]: [user.id, null] },
          queueId: queueFilterWithNull,
          status: "pending",
          companyId
        }
      });
    } else {
      ticketsIds = await Ticket.findAll({
        where: {
          userId: { [Op.or]: [user.id, null] },
          status: "pending",
          companyId,
          queueId: queueFilterWithNull
        }
      });
    }

    if (ticketsIds) {
      TicketsUserFilter.push(ticketsIds.map(t => t.id));
    }

    const ticketsIntersection: number[] = intersection(...TicketsUserFilter);

    whereCondition = {
      ...whereCondition,
      id: ticketsIntersection
    };
  } else if (
    user.profile === "user" &&
    status === "pending" &&
    !showTicketWithoutQueue
  ) {
    const TicketsUserFilter: number[][] = [];
    let ticketsIds = [];

    if (!showTicketAllQueues) {
      ticketsIds = await Ticket.findAll({
        where: {
          companyId,
          userId: { [Op.or]: [user.id, null] },
          status: "pending",
          queueId: queueFilterOnly
        }
      });
    } else {
      ticketsIds = await Ticket.findAll({
        where: {
          companyId,
          [Op.or]: [
            { userId: { [Op.or]: [user.id, null] } },
            { status: "pending" }
          ],
          status: "pending",
          queueId: queueFilterOnly
        }
      });
    }

    if (ticketsIds) {
      TicketsUserFilter.push(ticketsIds.map(t => t.id));
    }

    const ticketsIntersection: number[] = intersection(...TicketsUserFilter);

    whereCondition = {
      ...whereCondition,
      id: ticketsIntersection
    };
  }

  // Blindagem do showAll:
  // admin pode ampliar visão conforme permissões.
  // usuário comum com allUserChat só amplia dentro das filas dele.
  if (showAll === "true" && canUseShowAll && status !== "search") {
    if (isAdmin) {
      if (user.allHistoric === "enabled" && showTicketWithoutQueue) {
        whereCondition = { companyId };
      } else if (user.allHistoric === "enabled" && !showTicketWithoutQueue) {
        whereCondition = { companyId, queueId: { [Op.ne]: null } };
      } else if (user.allHistoric === "disabled" && showTicketWithoutQueue) {
        whereCondition = { companyId, queueId: queueFilterWithNull };
      } else if (user.allHistoric === "disabled" && !showTicketWithoutQueue) {
        whereCondition = { companyId, queueId: queueFilterOnly };
      }
    } else {
      whereCondition = {
        companyId,
        queueId: showTicketWithoutQueue ? queueFilterWithNull : queueFilterOnly
      };
    }
  }

  if (status && status !== "search") {
    whereCondition = {
      ...whereCondition,
      status:
        showAll === "true" && status === "pending"
          ? { [Op.or]: [status, "lgpd"] }
          : status
    };
  }

  if (status === "closed") {
    let latestTickets;

    let whereCondition2: Filterable["where"] = {
      companyId,
      status: "closed"
    };

    if (showAll === "true" && canUseShowAll) {
      if (isAdmin) {
        whereCondition2 = {
          ...whereCondition2,
          queueId: showTicketWithoutQueue
            ? queueFilterWithNull
            : queueFilterOnly
        };
      } else {
        whereCondition2 = {
          ...whereCondition2,
          queueId: showTicketWithoutQueue
            ? queueFilterWithNull
            : queueFilterOnly
        };
      }
    } else {
      whereCondition2 = {
        ...whereCondition2,
        queueId: showTicketWithoutQueue ? queueFilterWithNull : queueFilterOnly,
        userId
      };
    }

    latestTickets = await Ticket.findAll({
      attributes: [
        "companyId",
        "contactId",
        "whatsappId",
        [literal('MAX("id")'), "id"]
      ],
      where: whereCondition2,
      group: ["companyId", "contactId", "whatsappId"]
    });

    const ticketIds = latestTickets.map(t => t.id);

    whereCondition = {
      id: ticketIds,
      companyId
    };
  } else if (status === "search") {
    whereCondition = { companyId };

    let latestTickets;

    if (!showTicketAllQueues && user.profile === "user") {
      latestTickets = await Ticket.findAll({
        attributes: [
          "companyId",
          "contactId",
          "whatsappId",
          [literal('MAX("id")'), "id"]
        ],
        where: {
          [Op.or]: [
            { userId },
            { status: ["pending", "closed", "group", "chatbot"] }
          ],
          queueId:
            showAll === "true" || showTicketWithoutQueue
              ? queueFilterWithNull
              : queueFilterOnly,
          companyId
        },
        group: ["companyId", "contactId", "whatsappId"]
      });
    } else {
      let whereCondition2: Filterable["where"] = {
        companyId,
        [Op.or]: [
          { userId },
          { status: ["pending", "closed", "group", "chatbot"] }
        ]
      };

      if (isAdmin && showAll === "false") {
        whereCondition2 = {
          ...whereCondition2,
          queueId: queueFilterOnly
        };
      } else if (isAdmin && showAll === "true") {
        whereCondition2 = {
          companyId,
          queueId: queueFilterWithNull
        };
      } else {
        whereCondition2 = {
          ...whereCondition2,
          queueId: showTicketWithoutQueue
            ? queueFilterWithNull
            : queueFilterOnly
        };
      }

      latestTickets = await Ticket.findAll({
        attributes: [
          "companyId",
          "contactId",
          "whatsappId",
          [literal('MAX("id")'), "id"]
        ],
        where: whereCondition2,
        group: ["companyId", "contactId", "whatsappId"]
      });
    }

    const ticketIds = latestTickets.map(t => t.id);

    whereCondition = {
      ...whereCondition,
      id: ticketIds
    };

    if (searchParam) {
      const sanitizedSearchParam = removeAccents(
        searchParam.toLocaleLowerCase().trim()
      );

      if (searchOnMessages === "true") {
        includeCondition = [
          ...includeCondition,
          {
            model: Message,
            as: "messages",
            attributes: ["id", "body"],
            where: {
              body: where(
                fn("LOWER", fn("unaccent", col("body"))),
                "LIKE",
                `%${sanitizedSearchParam}%`
              )
            },
            required: false,
            duplicating: false
          }
        ];

        whereCondition = {
          ...whereCondition,
          [Op.or]: [
            {
              "$contact.name$": where(
                fn("LOWER", fn("unaccent", col("contact.name"))),
                "LIKE",
                `%${sanitizedSearchParam}%`
              )
            },
            { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } },
            {
              "$message.body$": where(
                fn("LOWER", fn("unaccent", col("body"))),
                "LIKE",
                `%${sanitizedSearchParam}%`
              )
            }
          ]
        };
      } else {
        whereCondition = {
          ...whereCondition,
          [Op.or]: [
            {
              "$contact.name$": where(
                fn("LOWER", fn("unaccent", col("contact.name"))),
                "LIKE",
                `%${sanitizedSearchParam}%`
              )
            },
            { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } }
          ]
        };
      }
    }

    if (Array.isArray(tags) && tags.length > 0) {
      const contactTagFilter: number[][] = [];
      const contactTags = await ContactTag.findAll({
        where: { tagId: tags }
      });

      if (contactTags) {
        contactTagFilter.push(contactTags.map(t => t.contactId));
      }

      const contactsIntersection: number[] = intersection(...contactTagFilter);

      whereCondition = {
        ...whereCondition,
        contactId: contactsIntersection
      };
    }

    if (Array.isArray(users) && users.length > 0) {
      whereCondition = {
        ...whereCondition,
        userId: users
      };
    }

    if (Array.isArray(whatsappIds) && whatsappIds.length > 0) {
      whereCondition = {
        ...whereCondition,
        whatsappId: whatsappIds
      };
    }

    if (Array.isArray(statusFilters) && statusFilters.length > 0) {
      whereCondition = {
        ...whereCondition,
        status: { [Op.in]: statusFilters }
      };
    }
  } else if (withUnreadMessages === "true") {
    whereCondition = {
      [Op.or]: [
        {
          userId,
          status: showNotificationPendingValue
            ? { [Op.notIn]: ["closed", "lgpd", "nps"] }
            : { [Op.notIn]: ["pending", "closed", "lgpd", "nps", "group"] },
          queueId: { [Op.in]: userQueueIds },
          unreadMessages: { [Op.gt]: 0 },
          companyId,
          isGroup: showGroups ? { [Op.or]: [true, false] } : false
        },
        {
          status: showNotificationPendingValue
            ? { [Op.in]: ["pending", "group", "chatbot"] }
            : { [Op.in]: ["group", "chatbot"] },
          queueId: showTicketWithoutQueue
            ? { [Op.or]: [userQueueIds, null] }
            : { [Op.in]: userQueueIds },
          unreadMessages: { [Op.gt]: 0 },
          companyId,
          isGroup: showGroups ? { [Op.or]: [true, false] } : false
        }
      ]
    };

    if (status === "group" && (user.allowGroup || showAll === "true")) {
      whereCondition = {
        ...whereCondition,
        queueId: { [Op.or]: [userQueueIds, null] }
      };
    }
  }

  whereCondition = {
    ...whereCondition,
    companyId
  };
  console.log(
    `[PERF][ListTicketsService] montagem condicional do whereCondition (inclui sub-queries de pending/closed/search/tags): ${
      Date.now() - __t_prequery
    }ms (status=${status})`
  );

  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  const __t_mainQuery = Date.now();
  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    attributes: [
      "id",
      "uuid",
      "userId",
      "queueId",
      "isGroup",
      "channel",
      "status",
      "contactId",
      "useIntegration",
      "lastMessage",
      "updatedAt",
      "unreadMessages"
    ],
    distinct: true,
    limit,
    offset,
    order: [["updatedAt", sortTickets]],
    subQuery: false
  });
  console.log(
    `[PERF][ListTicketsService] Ticket.findAndCountAll (query principal, ${
      tickets.length
    } tickets de ${count} total): ${
      Date.now() - __t_mainQuery
    }ms (status=${status})`
  );

  // [PERF] CORRIGIDO: loop N+1 (até 3 queries sequenciais por ticket) substituído por
  // 2 queries em batch (WHERE ticketId IN (...) / JOIN ... WHERE ticketId IN (...)),
  // independente de quantos tickets vieram na página.
  const __t_n1loop = Date.now();

  const previewTicketIds = tickets.map(t => t.id);

  // Batch 1: última mensagem de cada ticket, em uma única query (Postgres DISTINCT ON).
  const __t_batchLastMessages = Date.now();
  const lastMessageRows: Array<{
    ticketId: number;
    id: number;
    body: string;
    updatedAt: Date;
  }> = previewTicketIds.length
    ? await sequelize.query(
        `
          SELECT DISTINCT ON ("ticketId") "ticketId", "id", "body", "updatedAt"
          FROM "Messages"
          WHERE "ticketId" IN (:ticketIds)
          ORDER BY "ticketId", "updatedAt" DESC
        `,
        {
          replacements: { ticketIds: previewTicketIds },
          type: QueryTypes.SELECT
        }
      )
    : [];
  console.log(
    `[PERF][ListTicketsService] batch última mensagem por ticket (1 query no lugar de até ${
      previewTicketIds.length
    }): ${Date.now() - __t_batchLastMessages}ms (${
      lastMessageRows.length
    } tickets com mensagem)`
  );

  const lastMessageByTicketId = new Map<
    number,
    { id: number; body: string; updatedAt: Date }
  >();
  lastMessageRows.forEach(row => {
    lastMessageByTicketId.set(row.ticketId, row);
  });

  // Batch 2: última reação (com o body da mensagem reagida já via JOIN) de cada ticket,
  // em uma única query. Elimina também a 3ª query redundante do código original
  // (que buscava de novo, separadamente, uma mensagem já trazida pelo JOIN acima).
  const __t_batchLastReactions = Date.now();
  const lastReactionRows: Array<{
    ticketId: number;
    emoji: string;
    userId: number;
    reactionUpdatedAt: Date;
    messageBody: string;
  }> = previewTicketIds.length
    ? await sequelize.query(
        `
          SELECT DISTINCT ON (m."ticketId")
            m."ticketId" AS "ticketId",
            mr."emoji" AS "emoji",
            mr."userId" AS "userId",
            mr."updatedAt" AS "reactionUpdatedAt",
            m."body" AS "messageBody"
          FROM "MessageReactions" mr
          INNER JOIN "Messages" m ON m."id" = mr."messageId"
          WHERE m."ticketId" IN (:ticketIds)
          ORDER BY m."ticketId", mr."updatedAt" DESC
        `,
        {
          replacements: { ticketIds: previewTicketIds },
          type: QueryTypes.SELECT
        }
      )
    : [];
  console.log(
    `[PERF][ListTicketsService] batch última reação por ticket (1 query no lugar de até ${
      previewTicketIds.length
    }): ${Date.now() - __t_batchLastReactions}ms (${
      lastReactionRows.length
    } tickets com reação)`
  );

  const lastReactionByTicketId = new Map<
    number,
    {
      emoji: string;
      userId: number;
      reactionUpdatedAt: Date;
      messageBody: string;
    }
  >();
  lastReactionRows.forEach(row => {
    lastReactionByTicketId.set(row.ticketId, row);
  });

  // Loop agora é 100% em memória (sem I/O de banco) — mesma lógica de negócio de antes.
  for (const ticket of tickets) {
    const lastMessage = lastMessageByTicketId.get(ticket.id);

    if (!lastMessage) {
      (ticket as any).setDataValue("reactionPreview", null);
      continue;
    }

    const lastReaction = lastReactionByTicketId.get(ticket.id);

    if (!lastReaction) {
      (ticket as any).setDataValue("reactionPreview", null);
      continue;
    }

    if (
      new Date(lastReaction.reactionUpdatedAt) > new Date(lastMessage.updatedAt)
    ) {
      (ticket as any).setDataValue("reactionPreview", {
        emoji: lastReaction.emoji,
        messagePreview: lastReaction.messageBody,
        reactionUserId: lastReaction.userId
      });
    } else {
      (ticket as any).setDataValue("reactionPreview", null);
    }
  }
  console.log(
    `[PERF][ListTicketsService] loop N+1 pós-query (reactionPreview) [AGORA BATCH: 2 queries totais em vez de até 3x${
      tickets.length
    } sequenciais]: ${Date.now() - __t_n1loop}ms (status=${status})`
  );

  console.log(
    `[PERF][ListTicketsService] TOTAL service: ${
      Date.now() - __perfStart
    }ms (status=${status})`
  );

  const hasMore = count > offset + tickets.length;

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsService;
