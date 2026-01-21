"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Chat_1 = __importDefault(require("../../models/Chat"));
const ChatUser_1 = __importDefault(require("../../models/ChatUser"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const RemoveUserFromGroupService = async ({ chatId, userId }) => {
    const chat = await Chat_1.default.findByPk(chatId);
    if (!chat) {
        throw new AppError_1.default("ERR_CHAT_NOT_FOUND", 404);
    }
    if (!chat.isGroup) {
        throw new AppError_1.default("ERR_CHAT_IS_NOT_GROUP", 400);
    }
    if (chat.groupAdminId === userId) {
        throw new AppError_1.default("ERR_CANNOT_REMOVE_GROUP_ADMIN", 400);
    }
    await ChatUser_1.default.destroy({
        where: {
            chatId,
            userId
        }
    });
};
exports.default = RemoveUserFromGroupService;
