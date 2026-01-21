"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ContactTag_1 = __importDefault(require("../../models/ContactTag"));
const ShowContactService_1 = __importDefault(require("../ContactServices/ShowContactService"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const sequelize_1 = require("sequelize");
const ShowTicketService_1 = __importDefault(require("../TicketServices/ShowTicketService"));
const socket_1 = require("../../libs/socket");
const SyncTags = async ({ tags, contactId, companyId }) => {
    const tagList = tags.map(t => ({ tagId: t.id, contactId }));
    await ContactTag_1.default.destroy({ where: { contactId } });
    await ContactTag_1.default.bulkCreate(tagList);
    const contact = await (0, ShowContactService_1.default)(contactId, companyId);
    const _ticket = await Ticket_1.default.findOne({ where: { contactId, status: { [sequelize_1.Op.or]: ["open", "group"] } } });
    if (_ticket) {
        const ticket = await (0, ShowTicketService_1.default)(_ticket?.id, companyId);
        const io = (0, socket_1.getIO)();
        io.of(String(companyId))
            .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket
        });
    }
    return contact;
};
exports.default = SyncTags;
