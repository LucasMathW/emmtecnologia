"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_1 = require("../../libs/socket");
const ChatMessage_1 = __importDefault(require("../../models/ChatMessage"));
const User_1 = __importDefault(require("../../models/User"));
const EditMessageService = async ({ messageId, message, userId, companyId }) => {
    const chatMessage = await ChatMessage_1.default.findByPk(messageId, {
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
    if (!chatMessage) {
        throw new Error("Message not found");
    }
    if (chatMessage.senderId !== userId) {
        throw new Error("You can only edit your own messages");
    }
    await chatMessage.update({
        message,
        isEdited: true
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-chat-${chatMessage.chatId}`, {
        action: "edit-message",
        message: chatMessage
    });
    return chatMessage;
};
exports.default = EditMessageService;
