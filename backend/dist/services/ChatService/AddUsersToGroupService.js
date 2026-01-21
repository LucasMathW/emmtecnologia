"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Chat_1 = __importDefault(require("../../models/Chat"));
const ChatUser_1 = __importDefault(require("../../models/ChatUser"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const AddUsersToGroupService = async ({ chatId, userIds, companyId }) => {
    const chat = await Chat_1.default.findByPk(chatId);
    if (!chat) {
        throw new AppError_1.default("ERR_CHAT_NOT_FOUND", 404);
    }
    if (!chat.isGroup) {
        throw new AppError_1.default("ERR_CHAT_IS_NOT_GROUP", 400);
    }
    await Promise.all(userIds.map(userId => ChatUser_1.default.create({
        chatId,
        userId,
        companyId
    })));
};
exports.default = AddUsersToGroupService;
