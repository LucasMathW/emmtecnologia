"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Message_1 = __importDefault(require("../../models/Message"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const SearchContactMessagesService = async ({ contactId, companyId, searchParam, pageNumber = "1" }) => {
    const limit = 20;
    const offset = limit * (+pageNumber - 1);
    // Buscar todos os tickets do contato
    const tickets = await Ticket_1.default.findAll({
        where: {
            contactId,
            companyId
        },
        attributes: ["id"]
    });
    const ticketIds = tickets.map(ticket => ticket.id);
    if (ticketIds.length === 0) {
        return {
            messages: [],
            count: 0,
            hasMore: false
        };
    }
    const whereCondition = {
        ticketId: {
            [sequelize_1.Op.in]: ticketIds
        },
        body: {
            [sequelize_1.Op.iLike]: `%${searchParam}%`
        },
        isDeleted: false
    };
    const { count, rows: messages } = await Message_1.default.findAndCountAll({
        where: whereCondition,
        include: [
            {
                model: Contact_1.default,
                as: "contact",
                attributes: ["id", "name"]
            },
            {
                model: Ticket_1.default,
                as: "ticket",
                attributes: ["id", "uuid"]
            }
        ],
        attributes: [
            "id",
            "wid",
            "body",
            "fromMe",
            "mediaType",
            "mediaUrl",
            "createdAt",
            "ticketId"
        ],
        limit,
        offset,
        order: [["createdAt", "DESC"]]
    });
    const hasMore = count > offset + messages.length;
    return {
        messages,
        count,
        hasMore
    };
};
exports.default = SearchContactMessagesService;
