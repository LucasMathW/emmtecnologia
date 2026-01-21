"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Message_1 = __importDefault(require("../../models/Message"));
const CreateMessageService_1 = __importDefault(require("../MessageServices/CreateMessageService"));
const ReceivedWhatsApp_1 = require("./ReceivedWhatsApp");
const getTimestampMessage = (msgTimestamp) => {
    return msgTimestamp * 1;
};
const verifyMessageOficial = async (message, ticket, contact, companyId, fileName, fromNumber, data, quoteMessageId) => {
    let bodyMessage = message.text;
    if (message.type === "contacts" && Array.isArray(data?.message?.text?.contacts)) {
        const contact = data?.message?.text?.contacts[0];
        bodyMessage = await (0, ReceivedWhatsApp_1.generateVCard)(contact);
    }
    let quotedMsgId = null;
    if (quoteMessageId) {
        const quotedMessage = await Message_1.default.findOne({
            where: {
                wid: quoteMessageId,
                companyId: companyId
            }
        });
        quotedMsgId = quotedMessage?.id || null;
    }
    const messageData = {
        wid: message.idMessage,
        ticketId: ticket.id,
        contactId: contact.id,
        body: message.type === "contacts" ? bodyMessage : !!message.text ? message.text : '',
        fromMe: false,
        mediaType: message.type === "contacts" ? "contactMessage" : data.message.type,
        mediaUrl: fileName,
        // read: false,
        read: false,
        quotedMsgId: quotedMsgId,
        // ack: 2,
        ack: 0,
        channel: 'whatsapp_oficial',
        remoteJid: `${fromNumber}@s.whatsapp.net`,
        participant: null,
        dataJson: JSON.stringify(data),
        ticketTrakingId: null,
        isPrivate: false,
        createdAt: new Date(Math.floor(getTimestampMessage(message.timestamp) * 1000)).toISOString(),
        ticketImported: null,
        isForwarded: false
    };
    // const io = getIO();
    // io.of(String(ticket.companyId))
    //     .emit(`company-${ticket.companyId}-appMessage`, {
    //         action: "create",
    //         message: messageData,
    //         ticket: ticket,
    //         contact: ticket.contact
    //     });
    await (0, CreateMessageService_1.default)({ messageData, companyId: companyId });
};
exports.default = verifyMessageOficial;
