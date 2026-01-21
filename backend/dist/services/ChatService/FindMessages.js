"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const ChatMessage_1 = __importDefault(require("../../models/ChatMessage"));
const ChatUser_1 = __importDefault(require("../../models/ChatUser"));
const User_1 = __importDefault(require("../../models/User"));
const FindMessages = async ({ chatId, ownerId, pageNumber = "1" }) => {
    // Removidos logs de debug
    const userInChat = await ChatUser_1.default.count({
        where: { chatId, userId: ownerId }
    });
    if (userInChat === 0) {
        throw new AppError_1.default("UNAUTHORIZED", 400);
    }
    // Verificar se existem mensagens neste chat
    const totalMessages = await ChatMessage_1.default.count({
        where: { chatId }
    });
    // Lógica de paginação simplificada
    const limit = 10; // Sempre carregar 10 mensagens por vez
    const page = parseInt(pageNumber) || 1;
    const offset = (page - 1) * limit;
    // Buscar mensagens paginadas
    const { count, rows: records } = await ChatMessage_1.default.findAndCountAll({
        where: {
            chatId
        },
        include: [
            {
                model: User_1.default,
                as: "sender",
                attributes: ["id", "name", "profileImage"]
            }
        ],
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        subQuery: false
    });
    // Buscar todas as replyToId que não vieram no resultado
    const replyToIds = records.map(msg => msg.replyToId).filter(id => !!id);
    // Buscar as mensagens replyTo
    let replyToMessages = [];
    if (replyToIds.length > 0) {
        replyToMessages = await ChatMessage_1.default.findAll({
            where: { id: replyToIds },
            include: [
                {
                    model: User_1.default,
                    as: "sender",
                    attributes: ["id", "name", "profileImage"]
                }
            ],
            attributes: ["id", "message", "mediaType", "mediaPath"]
        });
    }
    // Mapear por id para acesso rápido
    const replyToMap = new Map();
    replyToMessages.forEach(msg => {
        replyToMap.set(msg.id, msg);
    });
    // Atribuir manualmente o campo replyTo
    const recordsWithReply = records.map(msg => {
        const plain = msg.toJSON();
        if (msg.replyToId) {
            plain.replyTo = replyToMap.get(msg.replyToId) || null;
        }
        else {
            plain.replyTo = null;
        }
        return plain;
    });
    // Inverter para exibir do mais antigo para o mais novo
    const recordsOrdered = recordsWithReply.reverse();
    // Calcular se há mais mensagens para carregar
    const hasMore = count > offset + records.length;
    return {
        records: recordsOrdered,
        count,
        hasMore
    };
};
exports.default = FindMessages;
