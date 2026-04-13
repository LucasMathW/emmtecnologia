import {
  Op,
  fn,
  where,
  col,
  Filterable,
  Includeable,
  literal
} from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

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

import MessageReaction from "../../models/MessageReaction";

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
  const user = await ShowUserService(userId, companyId);

  const showTicketAllQueues = user.allHistoric === "enabled";
  const showTicketWithoutQueue = user.allTicket === "enable";
  const showGroups = user.allowGroup === true;
  const isAdmin = user.profile === "admin";
  const canUseShowAll = isAdmin || user.allUserChat === "enabled";

  const showPendingNotification = await FindCompanySettingOneService({
    companyId,
    column: "showNotificationPending"
  });

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

  const limit = 40;
  const offset = limit * (+pageNumber - 1);

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

  for (const ticket of tickets) {
    const lastMessage = await Message.findOne({
      where: { ticketId: ticket.id },
      order: [["updatedAt", "DESC"]],
      attributes: ["id", "body", "updatedAt"]
    });

    if (!lastMessage) {
      (ticket as any).setDataValue("reactionPreview", null);
      continue;
    }

    const lastReaction = await MessageReaction.findOne({
      attributes: ["id", "emoji", "userId", "updatedAt", "messageId"],
      include: [
        {
          model: Message,
          as: "message",
          attributes: ["body", "updatedAt"],
          required: true,
          where: { ticketId: ticket.id }
        }
      ],
      order: [["updatedAt", "DESC"]]
    });

    if (!lastReaction) {
      (ticket as any).setDataValue("reactionPreview", null);
      continue;
    }

    const lastMessageReaction = await Message.findOne({
      where: { id: lastReaction.messageId },
      attributes: ["id", "body", "updatedAt"]
    });

    if (!lastMessageReaction) {
      (ticket as any).setDataValue("reactionPreview", null);
      continue;
    }

    if (lastReaction.updatedAt > lastMessage.updatedAt) {
      (ticket as any).setDataValue("reactionPreview", {
        emoji: lastReaction.emoji,
        messagePreview: lastMessageReaction.body,
        reactionUserId: lastReaction.userId
      });
    } else {
      (ticket as any).setDataValue("reactionPreview", null);
    }
  }

  const hasMore = count > offset + tickets.length;

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsService;
