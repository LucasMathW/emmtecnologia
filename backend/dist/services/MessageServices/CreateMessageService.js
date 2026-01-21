"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_1 = require("../../libs/socket");
const Contact_1 = __importDefault(require("../../models/Contact"));
const Message_1 = __importDefault(require("../../models/Message"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const Tag_1 = __importDefault(require("../../models/Tag"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const User_1 = __importDefault(require("../../models/User"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const CreateMessageService = async ({ messageData, companyId }) => {
    const correctMediaType = (data) => {
        // Se já tem mediaType definido como audio, manter
        if (data.mediaType === 'audio') {
            return data;
        }
        // Verificar se deveria ser áudio baseado na URL ou outros indicadores
        const shouldBeAudio = (data) => {
            // Verificar pela URL
            if (data.mediaUrl) {
                const audioExtensions = ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac'];
                const url = data.mediaUrl.toLowerCase();
                if (audioExtensions.some(ext => url.includes(ext))) {
                    return true;
                }
                // Verificar se tem padrão de nome de áudio
                if (url.includes('audio_')) {
                    return true;
                }
            }
            // Verificar pelo body
            if (data.body && typeof data.body === 'string') {
                const body = data.body.toLowerCase();
                if (body.includes('áudio gravado') || body.includes('🎵 arquivo de áudio')) {
                    return true;
                }
            }
            return false;
        };
        // Se deveria ser áudio, corrigir o tipo
        if (shouldBeAudio(data)) {
            console.log(`🎵 Corrigindo tipo de mídia de '${data.mediaType}' para 'audio'`);
            return {
                ...data,
                mediaType: 'audio'
            };
        }
        return data;
    };
    const correctedMessageData = correctMediaType(messageData);
    await Message_1.default.upsert({ ...correctedMessageData, companyId });
    const message = await Message_1.default.findOne({
        where: {
            wid: correctedMessageData.wid,
            companyId
        },
        include: [
            "contact",
            {
                model: Ticket_1.default,
                as: "ticket",
                include: [
                    {
                        model: Contact_1.default,
                        attributes: ["id", "name", "number", "email", "profilePicUrl", "acceptAudioMessage", "active", "urlPicture", "companyId"],
                        include: ["extraInfo", "tags"]
                    },
                    {
                        model: Queue_1.default,
                        attributes: ["id", "name", "color"]
                    },
                    {
                        model: Whatsapp_1.default,
                        attributes: ["id", "name", "groupAsTicket", "color"]
                    },
                    {
                        model: User_1.default,
                        attributes: ["id", "name"]
                    },
                    {
                        model: Tag_1.default,
                        as: "tags",
                        attributes: ["id", "name", "color"]
                    }
                ]
            },
            {
                model: Message_1.default,
                as: "quotedMsg",
                include: ["contact"]
            }
        ]
    });
    if (message.ticket.queueId !== null && message.queueId === null) {
        await message.update({ queueId: message.ticket.queueId });
    }
    if (message.isPrivate) {
        await message.update({ wid: `PVT${message.id}` });
    }
    if (!message) {
        throw new Error("ERR_CREATING_MESSAGE");
    }
    const io = (0, socket_1.getIO)();
    if (!messageData?.ticketImported) {
        io.of(String(companyId))
            .emit(`company-${companyId}-appMessage`, {
            action: "create",
            message,
            ticket: message.ticket,
            contact: message.ticket.contact
        });
    }
    return message;
};
exports.default = CreateMessageService;
