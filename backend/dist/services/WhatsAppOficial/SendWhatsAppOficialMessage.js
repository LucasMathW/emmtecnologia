"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Sentry = __importStar(require("@sentry/node"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const lodash_1 = require("lodash");
const whatsAppOficial_service_1 = require("../../libs/whatsAppOficial/whatsAppOficial.service");
const CreateMessageService_1 = __importDefault(require("../MessageServices/CreateMessageService"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const getTypeMessage = (type) => {
    console.log("type", type);
    switch (type) {
        case 'video':
            return 'video';
        case 'audio':
            return 'audio';
        case 'image':
            return 'image';
        case 'application':
            return 'document';
        case 'document':
            return 'document';
        case 'text':
            return 'text';
        case 'interactive':
            return 'interactive';
        case 'contacts':
            return 'contacts';
        case 'location':
            return 'location';
        case 'template':
            return 'template';
        case 'reaction':
            return 'reaction';
        default:
            return null;
    }
};
const SendWhatsAppOficialMessage = async ({ body, ticket, media, type, vCard, template, interative, quotedMsg, bodyToSave }) => {
    console.error(`Chegou SendWhatsAppOficialMessage - ticketId: ${ticket.id} - contactId: ${ticket.contactId}`);
    const pathMedia = !!media ? media.path : null;
    let options = {};
    const typeMessage = !!media ? media.mimetype.split("/")[0] : null;
    let bodyTicket = "";
    let mediaType;
    const bodyMsg = body ? (0, Mustache_1.default)(body, ticket) : null;
    type = !type ? getTypeMessage(typeMessage) : type;
    switch (type) {
        case 'video':
            options.body_video = { caption: bodyMsg };
            options.type = 'video';
            options.fileName = media.originalname.replace('/', '-');
            bodyTicket = "🎥 Arquivo de vídeo";
            mediaType = 'video';
            break;
        case 'audio':
            options.type = 'audio';
            options.fileName = media.originalname.replace('/', '-');
            bodyTicket = "🎵 Arquivo de áudio";
            mediaType = 'audio';
            break;
        case 'document':
            options.type = 'document';
            options.body_document = { caption: bodyMsg };
            options.fileName = media.originalname.replace('/', '-');
            bodyTicket = "📂 Arquivo de Documento";
            mediaType = 'document';
            break;
        case 'image':
            options.body_image = { caption: bodyMsg };
            options.fileName = media.originalname.replace('/', '-');
            bodyTicket = "📷 Arquivo de Imagem";
            mediaType = 'image';
            break;
        case 'text':
            options.body_text = { body: bodyMsg };
            mediaType = 'conversation';
            break;
        case 'interactive':
            mediaType = interative.type == 'button' ? 'interative' : 'listMessage';
            options.body_interactive = interative;
            break;
        case 'contacts':
            mediaType = 'contactMessage';
            const first_name = vCard?.name?.split(' ')[0];
            const last_name = String(vCard?.name).replace(vCard?.name?.split(' ')[0], '');
            options.body_contacts = {
                name: { first_name: first_name, last_name: last_name, formatted_name: `${first_name} ${last_name}`.trim() },
                phones: [{ phone: `+${vCard?.number}`, wa_id: +vCard?.number, type: 'CELL' }],
                emails: [{ email: vCard?.email }]
            };
            break;
        case 'location':
            throw new Error(`Tipo ${type} não configurado para enviar mensagem a Meta`);
        case 'template':
            // Para templates, o body já vem formatado do storeTemplate com texto + botões
            // Formato: "texto do template||||[botões em JSON]"
            bodyTicket = bodyMsg || `📋 Template: ${template?.name || 'Mensagem'}`;
            options.body_template = template;
            mediaType = 'template';
            break;
        case 'reaction':
            throw new Error(`Tipo ${type} não configurado para enviar mensagem a Meta`);
        default:
            throw new Error(`Tipo ${type} não configurado para enviar mensagem a Meta`);
    }
    const contact = await Contact_1.default.findByPk(ticket.contactId);
    let vcard;
    if (!(0, lodash_1.isNil)(vCard)) {
        console.log(vCard);
        const numberContact = vCard.number;
        const firstName = vCard.name.split(' ')[0];
        const lastName = String(vCard.name).replace(vCard.name.split(' ')[0], '');
        vcard = `BEGIN:VCARD\n`
            + `VERSION:3.0\n`
            + `N:${lastName};${firstName};;;\n`
            + `FN:${vCard.name}\n`
            + `TEL;type=CELL;waid=${numberContact}:+${numberContact}\n`
            + `END:VCARD`;
        console.log(vcard);
    }
    options.to = `+${contact.number}`;
    options.type = type;
    options.quotedId = quotedMsg?.wid;
    try {
        const tokenFromTicket = ticket?.whatsapp?.token;
        let sendToken = tokenFromTicket;
        if (!sendToken) {
            const wapp = await Whatsapp_1.default.findByPk(ticket.whatsappId);
            if (!wapp || !wapp.token) {
                throw new AppError_1.default("ERR_NO_WAPP_FOUND");
            }
            sendToken = wapp.token;
        }
        const sendMessage = await (0, whatsAppOficial_service_1.sendMessageWhatsAppOficial)(pathMedia, sendToken, options);
        await ticket.update({ lastMessage: !bodyMsg && (!!media || type === 'template') ? bodyTicket : bodyMsg, imported: null, unreadMessages: 0 });
        const wid = sendMessage;
        const bodyMessage = !(0, lodash_1.isNil)(vCard) ? vcard : !bodyMsg ? '' : bodyMsg;
        const messageData = {
            wid: wid?.idMessageWhatsApp[0],
            ticketId: ticket.id,
            contactId: contact.id,
            body: type === 'interactive' ? bodyToSave : (type === 'template' ? bodyTicket : bodyMessage),
            fromMe: true,
            mediaType: mediaType,
            mediaUrl: !!media ? media.filename : null,
            read: true,
            quotedMsgId: quotedMsg?.id || null,
            ack: 2,
            channel: 'whatsapp_oficial',
            remoteJid: `${contact.number}@s.whatsapp.net`,
            participant: null,
            dataJson: JSON.stringify(body),
            ticketTrakingId: null,
            isPrivate: false,
            createdAt: new Date().toISOString(),
            ticketImported: ticket.imported,
            isForwarded: false,
            originalName: !!media ? media.filename : null
        };
        await (0, CreateMessageService_1.default)({ messageData, companyId: ticket.companyId });
        // const io = getIO();
        // io.of(String(ticket.companyId))
        //   .emit(`company-${ticket.companyId}-appMessage`, {
        //     action: "create",
        //     message: messageData,
        //     ticket: ticket,
        //     contact: ticket.contact
        //   });
        return sendMessage;
    }
    catch (err) {
        console.log(`erro ao enviar mensagem na company ${ticket.companyId} - `, body);
        Sentry.captureException(err);
        console.log(err);
        throw new AppError_1.default("ERR_SENDING_WAPP_MSG");
    }
};
exports.default = SendWhatsAppOficialMessage;
