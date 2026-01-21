"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_1 = require("../../libs/socket");
const ChatMessage_1 = __importDefault(require("../../models/ChatMessage"));
const User_1 = __importDefault(require("../../models/User"));
const CreateMessageService_1 = __importDefault(require("./CreateMessageService"));
const ForwardMessageService = async ({ messageId, targetChatId, userId, companyId }) => {
    const originalMessage = await ChatMessage_1.default.findByPk(messageId, {
        include: [
            { model: User_1.default, as: "sender", attributes: ["id", "name", "profileImage"] },
            {
                model: ChatMessage_1.default,
                as: "replyTo",
                include: [
                    {
                        model: User_1.default,
                        as: "sender",
                        attributes: ["id", "name", "profileImage"]
                    }
                ],
                attributes: ["id", "message"]
            }
        ]
    });
    if (!originalMessage) {
        throw new Error("Original message not found");
    }
    const newMessage = await (0, CreateMessageService_1.default)({
        chatId: targetChatId,
        senderId: userId,
        message: originalMessage.message,
        mediaName: originalMessage.mediaName,
        mediaPath: originalMessage.mediaPath,
        mediaType: originalMessage.mediaType,
        companyId,
        forwardedFromId: originalMessage.id
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-chat-${targetChatId}`, {
        action: "new-message",
        message: newMessage
    });
    return newMessage;
};
exports.default = ForwardMessageService;
