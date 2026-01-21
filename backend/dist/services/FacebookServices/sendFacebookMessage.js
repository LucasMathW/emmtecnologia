"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFacebookMessageWithoutTicket = exports.sendFacebookMessage = void 0;
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Message_1 = __importDefault(require("../../models/Message"));
const graphAPI_1 = require("./graphAPI");
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const sequelize_1 = require("sequelize");
const sendFacebookMessage = async ({ body, ticket, quotedMsg }) => {
    const { number } = ticket.contact;
    try {
        const lastMessage = await Message_1.default.findOne({
            where: {
                ticketId: { [sequelize_1.Op.lte]: ticket.id },
                companyId: ticket.companyId,
                contactId: ticket.contactId,
                fromMe: false
            },
            order: [["createdAt", "DESC"]],
            limit: 1
        });
        // console.log("lastMessage", lastMessage)
        // console.log("channel", ticket.channel)
        // console.log("lastMessage?.createdAt", lastMessage?.createdAt)
        // console.log("new Date(Date.now() - 1000 * 60 * 5)", new Date(Date.now() - 1000 * 60 * 5))
        const twentyFourHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 24);
        let tag = null;
        if (!lastMessage || lastMessage.createdAt < twentyFourHoursAgo) {
            if (ticket.channel !== "instagram") {
                tag = "ACCOUNT_UPDATE";
            }
        }
        console.log("tag", tag);
        const send = await (0, graphAPI_1.sendText)(number, (0, Mustache_1.default)(body, ticket), ticket.whatsapp.facebookUserToken, tag);
        await ticket.update({ lastMessage: body, fromMe: true });
        return send;
    }
    catch (err) {
        console.log(err);
        throw new AppError_1.default("ERR_SENDING_FACEBOOK_MSG");
    }
};
exports.sendFacebookMessage = sendFacebookMessage;
const sendFacebookMessageWithoutTicket = async ({ body, number, whatsapp }) => {
    const { facebookUserToken } = whatsapp;
    try {
        const send = await (0, graphAPI_1.sendText)(number, body, facebookUserToken, null);
        return send;
    }
    catch (err) {
        console.log(err);
        throw new AppError_1.default("ERR_SENDING_FACEBOOK_MSG");
    }
};
exports.sendFacebookMessageWithoutTicket = sendFacebookMessageWithoutTicket;
