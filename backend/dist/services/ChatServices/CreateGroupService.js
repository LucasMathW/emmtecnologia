"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Chat_1 = __importDefault(require("../../models/Chat"));
const ChatUser_1 = __importDefault(require("../../models/ChatUser"));
const CreateGroupService = async ({ name, userIds, companyId, groupAdminId }) => {
    const chat = await Chat_1.default.create({
        title: name,
        isGroup: true,
        groupName: name,
        groupAdminId,
        companyId
    });
    await Promise.all(userIds.map(userId => ChatUser_1.default.create({
        chatId: chat.id,
        userId,
        companyId
    })));
    return chat;
};
exports.default = CreateGroupService;
