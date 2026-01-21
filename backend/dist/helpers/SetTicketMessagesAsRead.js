"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = __importDefault(require("../libs/cache"));
const socket_1 = require("../libs/socket");
const Message_1 = __importDefault(require("../models/Message"));
const logger_1 = __importDefault(require("../utils/logger"));
const whatsAppOficial_service_1 = require("../libs/whatsAppOficial/whatsAppOficial.service");
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const wbot_1 = require("../libs/wbot");
const SetTicketMessagesAsRead = async (ticket) => {
    if (ticket.whatsappId) {
        // console.log("SETTING MESSAGES AS READ", ticket.whatsappId)
        const whatsapp = await Whatsapp_1.default.findOne({ where: { id: ticket.whatsappId, companyId: ticket.companyId } });
        if (["open", "group"].includes(ticket.status) && whatsapp && whatsapp.status === 'CONNECTED' && ticket.unreadMessages > 0) {
            try {
                // no baileys temos que marcar cada mensagem como lida
                // não o chat inteiro como é feito no legacy
                const getJsonMessage = await Message_1.default.findAll({
                    where: {
                        ticketId: ticket.id,
                        fromMe: false,
                        read: false
                    },
                    order: [["createdAt", "DESC"]]
                });
                if (['whatsapp_oficial'].includes(ticket.channel)) {
                    getJsonMessage.forEach(async (message) => {
                        (0, whatsAppOficial_service_1.setReadMessageWhatsAppOficial)(whatsapp.token, message.wid);
                    });
                }
                else if (ticket.channel == 'whatsapp') {
                    const wbot = await (0, wbot_1.getWbot)(ticket.whatsappId);
                    if (getJsonMessage.length > 0) {
                        getJsonMessage.forEach(async (message) => {
                            const msg = JSON.parse(message.dataJson);
                            if (msg.key && msg.key.fromMe === false && !ticket.isBot && (ticket.userId || ticket.isGroup)) {
                                // if (wbot?.ws?.socket?._readyState !== 1) {
                                //   console.log("Aguardando socket Message as Read no MarkAsRead ", wbot?.ws?.socket?._readyState)
                                //   await delay(150);
                                // }
                                await wbot.readMessages([msg.key]);
                            }
                        });
                    }
                }
                await Message_1.default.update({ read: true }, {
                    where: {
                        ticketId: ticket.id,
                        read: false
                    }
                });
                await ticket.update({ unreadMessages: 0 });
                await cache_1.default.set(`contacts:${ticket.contactId}:unreads`, "0");
                const io = (0, socket_1.getIO)();
                io.of(ticket.companyId.toString())
                    // .to(ticket.status).to("notification")
                    .emit(`company-${ticket.companyId}-ticket`, {
                    action: "updateUnread",
                    ticketId: ticket.id
                });
            }
            catch (err) {
                logger_1.default.warn(`Could not mark messages as read. Maybe whatsapp session disconnected? Err: ${err}`);
            }
        }
    }
};
exports.default = SetTicketMessagesAsRead;
