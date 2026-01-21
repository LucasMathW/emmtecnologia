"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadGroupImage = exports.forwardMessage = exports.deleteMessage = exports.editMessage = exports.backfillChats = exports.messages = exports.checkAsRead = exports.saveMessage = exports.remove = exports.show = exports.update = exports.store = exports.index = void 0;
const socket_1 = require("../libs/socket");
const sequelize_1 = require("sequelize");
const CreateService_1 = __importDefault(require("../services/ChatService/CreateService"));
const ListService_1 = __importDefault(require("../services/ChatService/ListService"));
const ShowFromUuidService_1 = __importDefault(require("../services/ChatService/ShowFromUuidService"));
const DeleteService_1 = __importDefault(require("../services/ChatService/DeleteService"));
const FindMessages_1 = __importDefault(require("../services/ChatService/FindMessages"));
const UpdateService_1 = __importDefault(require("../services/ChatService/UpdateService"));
const Chat_1 = __importDefault(require("../models/Chat"));
const CreateMessageService_1 = __importDefault(require("../services/ChatService/CreateMessageService"));
const User_1 = __importDefault(require("../models/User"));
const ChatUser_1 = __importDefault(require("../models/ChatUser"));
const Company_1 = __importDefault(require("../models/Company"));
const EditMessageService_1 = __importDefault(require("../services/ChatService/EditMessageService"));
const DeleteMessageService_1 = __importDefault(require("../services/ChatService/DeleteMessageService"));
const ForwardMessageService_1 = __importDefault(require("../services/ChatService/ForwardMessageService"));
const getMediaTypeFromMimeType = (mimetype) => {
    const documentMimeTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.oasis.opendocument.text",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.oasis.opendocument.presentation",
        "application/vnd.oasis.opendocument.graphics",
        "application/rtf",
        "text/plain",
        "text/csv",
        "text/html",
        "text/xml",
        "application/xml",
        "application/json",
        "application/ofx",
        "application/vnd.ms-outlook",
        "application/vnd.apple.keynote",
        "application/vnd.apple.numbers",
        "application/vnd.apple.pages",
        "application/x-pkcs12",
        "application/ofx",
        "application/x-msdownload",
        "application/x-executable",
        "application/x-ret"
    ];
    const archiveMimeTypes = [
        "application/zip",
        "application/x-rar-compressed",
        "application/x-7z-compressed",
        "application/x-tar",
        "application/gzip",
        "application/x-bzip2"
    ];
    if (documentMimeTypes.includes(mimetype)) {
        return "document";
    }
    if (archiveMimeTypes.includes(mimetype)) {
        return "document";
    }
    return mimetype.split("/")[0];
};
const index = async (req, res) => {
    const { pageNumber } = req.query;
    const ownerId = +req.user.id;
    const companyId = +req.user.companyId;
    const { records, count, hasMore } = await (0, ListService_1.default)({
        ownerId,
        companyId,
        pageNumber
    });
    return res.json({ records, count, hasMore });
};
exports.index = index;
const store = async (req, res) => {
    const { companyId } = req.user;
    const ownerId = +req.user.id;
    const data = req.body;
    const record = await (0, CreateService_1.default)({
        ...data,
        ownerId,
        companyId
    });
    const io = (0, socket_1.getIO)();
    record.users.forEach(user => {
        console.log(user.id);
        io.of(String(companyId)).emit(`company-${companyId}-chat-user-${user.id}`, {
            action: "create",
            record
        });
    });
    return res.status(200).json(record);
};
exports.store = store;
const update = async (req, res) => {
    const { companyId } = req.user;
    const data = req.body;
    const { id } = req.params;
    const record = await (0, UpdateService_1.default)({
        ...data,
        id: +id
    });
    const io = (0, socket_1.getIO)();
    record.users.forEach(user => {
        io.of(String(companyId)).emit(`company-${companyId}-chat-user-${user.id}`, {
            action: "update",
            record,
            userId: user.userId
        });
    });
    return res.status(200).json(record);
};
exports.update = update;
const show = async (req, res) => {
    const { id } = req.params;
    const record = await (0, ShowFromUuidService_1.default)(id);
    return res.status(200).json(record);
};
exports.show = show;
const remove = async (req, res) => {
    const { id } = req.params;
    const { companyId, profile } = req.user;
    // Verificar se o usuário é admin
    if (profile !== "admin") {
        return res.status(403).json({
            error: "Acesso negado. Apenas administradores podem deletar chats."
        });
    }
    await (0, DeleteService_1.default)(id);
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-chat`, {
        action: "delete",
        id
    });
    return res.status(200).json({ message: "Chat deleted" });
};
exports.remove = remove;
const saveMessage = async (req, res) => {
    const medias = req.files;
    const { companyId } = req.user;
    const { message } = req.body;
    const { id } = req.params;
    const senderId = +req.user.id;
    const chatId = +id;
    let newMessage = null;
    if (medias) {
        await Promise.all(medias.map(async (media) => {
            newMessage = await (0, CreateMessageService_1.default)({
                chatId,
                senderId,
                message: media.originalname,
                mediaPath: media.filename,
                mediaName: media.originalname,
                mediaType: getMediaTypeFromMimeType(media.mimetype),
                companyId,
                replyToId: req.body.replyToId
            });
        }));
    }
    else {
        newMessage = await (0, CreateMessageService_1.default)({
            chatId,
            senderId,
            message,
            companyId,
            replyToId: req.body.replyToId
        });
    }
    const chat = await Chat_1.default.findByPk(chatId, {
        include: [
            { model: User_1.default, as: "owner" },
            { model: ChatUser_1.default, as: "users", include: [{ model: User_1.default, as: "user" }] }
        ]
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-chat-${chatId}`, {
        action: "new-message",
        newMessage,
        chat
    });
    io.of(String(companyId)).emit(`company-${companyId}-chat`, {
        action: "new-message",
        newMessage,
        chat
    });
    return res.json(newMessage);
};
exports.saveMessage = saveMessage;
const checkAsRead = async (req, res) => {
    const { companyId } = req.user;
    const { userId } = req.body;
    const { id } = req.params;
    const chatUser = await ChatUser_1.default.findOne({ where: { chatId: id, userId } });
    await chatUser.update({ unreads: 0 });
    const chat = await Chat_1.default.findByPk(id, {
        include: [
            { model: User_1.default, as: "owner" },
            { model: ChatUser_1.default, as: "users" }
        ]
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-chat-${id}`, {
        action: "update",
        chat
    });
    io.of(String(companyId)).emit(`company-${companyId}-chat`, {
        action: "update",
        chat
    });
    return res.json(chat);
};
exports.checkAsRead = checkAsRead;
const messages = async (req, res) => {
    const { pageNumber } = req.query;
    const { id: chatId } = req.params;
    const ownerId = +req.user.id;
    const { records, count, hasMore } = await (0, FindMessages_1.default)({
        chatId,
        ownerId,
        pageNumber
    });
    return res.json({ records, count, hasMore });
};
exports.messages = messages;
const backfillChats = async (req, res) => {
    try {
        console.log("Starting backfillChats process...");
        const companies = await Company_1.default.findAll();
        console.log(`Found ${companies.length} companies.`);
        for (const company of companies) {
            console.log(`Processing company: ${company.name} (ID: ${company.id})`);
            const users = await User_1.default.findAll({ where: { companyId: company.id } });
            console.log(`Found ${users.length} users in company ${company.id}.`);
            if (users.length < 2) {
                console.log(`Skipping company ${company.id}: Not enough users for private chats.`);
                continue;
            }
            for (let i = 0; i < users.length; i++) {
                for (let j = i + 1; j < users.length; j++) {
                    const user1 = users[i];
                    const user2 = users[j];
                    console.log(`Checking chat for pair: User ${user1.id} (${user1.name}) and User ${user2.id} (${user2.name})`);
                    // NOVA LÓGICA PARA VERIFICAR SE JÁ EXISTE UM CHAT PRIVADO
                    // 1. Encontrar todos os IDs de chat associados ao user1
                    const chatUsersForUser1 = await ChatUser_1.default.findAll({
                        attributes: ["chatId"],
                        where: { userId: user1.id }
                    });
                    const user1ChatIds = chatUsersForUser1.map(cu => cu.chatId);
                    console.log(`User1 Chat IDs: ${user1ChatIds.join(", ")}`);
                    // 2. Encontrar todos os IDs de chat associados ao user2
                    const chatUsersForUser2 = await ChatUser_1.default.findAll({
                        attributes: ["chatId"],
                        where: { userId: user2.id }
                    });
                    const user2ChatIds = chatUsersForUser2.map(cu => cu.chatId);
                    console.log(`User2 Chat IDs: ${user2ChatIds.join(", ")}`);
                    // 3. Encontrar a intersecção dos IDs de chat
                    const commonChatIds = user1ChatIds.filter(id => user2ChatIds.includes(id));
                    console.log(`Common Chat IDs: ${commonChatIds.join(", ")}`);
                    // 4. Encontrar um chat comum que seja privado e pertença à mesma empresa
                    let commonPrivateChat = null;
                    if (commonChatIds.length > 0) {
                        commonPrivateChat = await Chat_1.default.findOne({
                            where: {
                                id: { [sequelize_1.Op.in]: commonChatIds },
                                isGroup: false,
                                companyId: company.id
                            }
                        });
                        console.log(`Found existing common private chat: ${!!commonPrivateChat}`);
                    }
                    if (!commonPrivateChat) {
                        console.log(`Creating new chat for User ${user1.id} and User ${user2.id}`);
                        await (0, CreateService_1.default)({
                            ownerId: user1.id,
                            companyId: company.id,
                            users: [{ id: user1.id }, { id: user2.id }],
                            title: "",
                            isGroup: false
                        });
                        console.log(`Chat created for User ${user1.id} and User ${user2.id}`);
                    }
                    else {
                        console.log(`Chat already exists for User ${user1.id} and User ${user2.id}. Skipping.`);
                    }
                }
            }
        }
        console.log("BackfillChats process finished successfully!");
        return res.status(200).json({ message: "Chats backfilled successfully!" });
    }
    catch (error) {
        console.error("Error backfilling chats:", error);
        return res.status(500).json({ error: "Failed to backfill chats" });
    }
};
exports.backfillChats = backfillChats;
const editMessage = async (req, res) => {
    const { messageId } = req.params;
    const { message } = req.body;
    const { companyId } = req.user;
    const userId = +req.user.id;
    const editedMessage = await (0, EditMessageService_1.default)({
        messageId: +messageId,
        message,
        userId,
        companyId
    });
    return res.json(editedMessage);
};
exports.editMessage = editMessage;
const deleteMessage = async (req, res) => {
    const { messageId } = req.params;
    const { companyId } = req.user;
    const userId = +req.user.id;
    const deletedMessage = await (0, DeleteMessageService_1.default)({
        messageId: +messageId,
        userId,
        companyId
    });
    return res.json(deletedMessage);
};
exports.deleteMessage = deleteMessage;
const forwardMessage = async (req, res) => {
    const { messageId } = req.params;
    const { targetChatId } = req.body;
    const { companyId } = req.user;
    const userId = +req.user.id;
    const forwardedMessage = await (0, ForwardMessageService_1.default)({
        messageId: +messageId,
        targetChatId: +targetChatId,
        userId,
        companyId
    });
    return res.json(forwardedMessage);
};
exports.forwardMessage = forwardMessage;
const uploadGroupImage = async (req, res) => {
    const { companyId } = req.user;
    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    console.log("🖼️ Group image upload - Arquivo processado:", {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        companyId
    });
    // Retorna o caminho para imagem de grupo: company{id}/groups
    return res.status(200).json({
        fileName: file.filename,
        url: `/public/company${companyId}/groups/${file.filename}`
    });
};
exports.uploadGroupImage = uploadGroupImage;
exports.default = {
    index: exports.index,
    store: exports.store,
    update: exports.update,
    show: exports.show,
    remove: exports.remove,
    saveMessage: exports.saveMessage,
    checkAsRead: exports.checkAsRead,
    messages: exports.messages,
    backfillChats: exports.backfillChats,
    editMessage: exports.editMessage,
    deleteMessage: exports.deleteMessage,
    forwardMessage: exports.forwardMessage,
    uploadGroupImage: exports.uploadGroupImage
};
