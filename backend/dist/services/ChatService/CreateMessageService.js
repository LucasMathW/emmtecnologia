"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Chat_1 = __importDefault(require("../../models/Chat"));
const ChatMessage_1 = __importDefault(require("../../models/ChatMessage"));
const ChatUser_1 = __importDefault(require("../../models/ChatUser"));
const User_1 = __importDefault(require("../../models/User"));
async function CreateMessageService({ senderId, chatId, message, mediaName, mediaPath, mediaType = "text", companyId, replyToId, forwardedFromId }) {
    const newMessage = await ChatMessage_1.default.create({
        senderId,
        chatId,
        message,
        mediaName,
        mediaPath,
        mediaType,
        companyId,
        replyToId,
        forwardedFromId
    });
    await newMessage.reload({
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
            },
            {
                model: Chat_1.default,
                as: "chat",
                include: [{ model: ChatUser_1.default, as: "users" }]
            }
        ]
    });
    const sender = await User_1.default.findByPk(senderId);
    await newMessage.chat.update({
        lastMessage: `${sender.name}: ${mediaName != null ? mediaName : message}`,
        updatedAt: new Date()
    });
    const chatUsers = await ChatUser_1.default.findAll({
        where: { chatId }
    });
    for (let chatUser of chatUsers) {
        if (chatUser.userId === senderId) {
            await chatUser.update({ unreads: 0 });
        }
        else {
            await chatUser.update({ unreads: chatUser.unreads + 1 });
        }
    }
    return newMessage;
}
exports.default = CreateMessageService;
