"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Chat_1 = __importDefault(require("../../models/Chat"));
const ChatUser_1 = __importDefault(require("../../models/ChatUser"));
const User_1 = __importDefault(require("../../models/User"));
const ChatMessage_1 = __importDefault(require("../../models/ChatMessage"));
const ListService = async ({ ownerId, companyId, pageNumber = "1" }) => {
    const chatUsers = await ChatUser_1.default.findAll({
        where: { userId: ownerId }
    });
    const chatIds = chatUsers.map(chat => chat.chatId);
    const limit = 100;
    const offset = limit * (+pageNumber - 1);
    const whereClause = {
        id: {
            [sequelize_1.Op.in]: chatIds
        }
    };
    if (companyId) {
        whereClause.companyId = companyId;
    }
    const { count, rows: records } = await Chat_1.default.findAndCountAll({
        where: whereClause,
        include: [
            { model: User_1.default, as: "owner" },
            { model: ChatUser_1.default, as: "users", include: [{ model: User_1.default, as: "user" }] },
            {
                model: ChatMessage_1.default,
                as: "messages",
                include: [
                    {
                        model: User_1.default,
                        as: "sender",
                        attributes: ["id", "name", "profileImage"]
                    },
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
            }
        ],
        limit,
        offset,
        order: [["updatedAt", "DESC"]]
    });
    // Filter out chats where any user no longer exists
    const validRecords = records.filter(chat => {
        // Check if owner exists
        if (!chat.owner)
            return false;
        // For non-group chats, check if the other user exists
        if (!chat.isGroup) {
            const otherUser = chat.users.find(u => u.userId !== ownerId);
            if (!otherUser || !otherUser.user)
                return false;
        }
        // For group chats, check if at least 2 users exist (including owner)
        if (chat.isGroup) {
            const validUsers = chat.users.filter(u => u.user).length;
            if (validUsers < 2)
                return false;
        }
        return true;
    });
    const recordsWithLastMessage = await Promise.all(validRecords.map(async (chat) => {
        const lastMessage = await ChatMessage_1.default.findOne({
            where: { chatId: chat.id },
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: User_1.default,
                    as: "sender",
                    attributes: ["id", "name", "profileImage"]
                },
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
        return { ...chat.toJSON(), lastMessage };
    }));
    const hasMore = count > offset + records.length;
    return {
        records: recordsWithLastMessage,
        count: validRecords.length,
        hasMore
    };
};
exports.default = ListService;
