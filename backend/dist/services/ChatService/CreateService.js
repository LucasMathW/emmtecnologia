"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Chat_1 = __importDefault(require("../../models/Chat"));
const ChatUser_1 = __importDefault(require("../../models/ChatUser"));
const User_1 = __importDefault(require("../../models/User"));
const CreateService = async (data) => {
    const { ownerId, companyId, users, title, description = "", groupImage = "", isGroup } = data;
    const record = await Chat_1.default.create({
        ownerId,
        companyId,
        title,
        isGroup: isGroup !== undefined ? isGroup : users.length > 1,
        groupName: users.length > 1 ? title : "",
        groupAdminId: ownerId,
        description,
        groupImage
    });
    if (Array.isArray(users) && users.length > 0) {
        await ChatUser_1.default.create({ chatId: record.id, userId: ownerId });
        for (let user of users) {
            if (user.id !== ownerId) {
                await ChatUser_1.default.create({ chatId: record.id, userId: user.id });
            }
        }
    }
    await record.reload({
        include: [
            { model: ChatUser_1.default, as: "users", include: [{ model: User_1.default, as: "user" }] },
            { model: User_1.default, as: "owner" }
        ]
    });
    return record;
};
exports.default = CreateService;
