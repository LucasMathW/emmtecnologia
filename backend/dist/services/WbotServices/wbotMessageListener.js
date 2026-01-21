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
exports.handleMsgAck = exports.getTypeMessage = exports.isValidMsg = exports.handleMessage = exports.wbotMessageListener = exports.handleMessageIntegration = exports.flowbuilderIntegration = exports.transferQueue = exports.keepOnlySpecifiedChars = exports.convertTextToSpeechAndSaveToFile = exports.handleRating = exports.verifyRating = exports.verifyMessage = exports.verifyMediaMessage = exports.getQuotedMessageId = exports.getQuotedMessage = exports.getBodyMessage = void 0;
const path_1 = __importStar(require("path"));
const fs_1 = require("fs");
const fs_2 = __importDefault(require("fs"));
const fs_3 = require("fs");
const Sentry = __importStar(require("@sentry/node"));
const lodash_1 = require("lodash");
const redis_1 = require("../../config/redis");
const baileys_1 = require("baileys");
const Contact_1 = __importDefault(require("../../models/Contact"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Message_1 = __importDefault(require("../../models/Message"));
const async_mutex_1 = require("async-mutex");
const socket_1 = require("../../libs/socket");
const CreateMessageService_1 = __importDefault(require("../MessageServices/CreateMessageService"));
const logger_1 = __importDefault(require("../../utils/logger"));
const CreateOrUpdateContactService_1 = __importDefault(require("../ContactServices/CreateOrUpdateContactService"));
const FindOrCreateTicketService_1 = __importDefault(require("../TicketServices/FindOrCreateTicketService"));
const ShowWhatsAppService_1 = __importDefault(require("../WhatsappService/ShowWhatsAppService"));
const Debounce_1 = require("../../helpers/Debounce");
const UpdateTicketService_1 = __importDefault(require("../TicketServices/UpdateTicketService"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const UserRating_1 = __importDefault(require("../../models/UserRating"));
const SendWhatsAppMessage_1 = __importDefault(require("./SendWhatsAppMessage"));
const sendFacebookMessage_1 = require("../FacebookServices/sendFacebookMessage");
const moment_1 = __importDefault(require("moment"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const FindOrCreateATicketTrakingService_1 = __importDefault(require("../TicketServices/FindOrCreateATicketTrakingService"));
const VerifyCurrentSchedule_1 = __importDefault(require("../CompanyService/VerifyCurrentSchedule"));
const Campaign_1 = __importDefault(require("../../models/Campaign"));
const CampaignShipping_1 = __importDefault(require("../../models/CampaignShipping"));
const sequelize_1 = require("sequelize");
const queues_1 = require("../../queues");
const User_1 = __importDefault(require("../../models/User"));
const ChatBotListener_1 = require("./ChatBotListener");
const MarkDeleteWhatsAppMessage_1 = __importDefault(require("./MarkDeleteWhatsAppMessage"));
const ListUserQueueServices_1 = __importDefault(require("../UserQueueServices/ListUserQueueServices"));
const cache_1 = __importDefault(require("../../libs/cache"));
const addLogs_1 = require("../../helpers/addLogs");
const SendWhatsAppMedia_1 = __importStar(require("./SendWhatsAppMedia"));
const ShowQueueIntegrationService_1 = __importDefault(require("../QueueIntegrationServices/ShowQueueIntegrationService"));
const CreateSessionDialogflow_1 = require("../QueueIntegrationServices/CreateSessionDialogflow");
const QueryDialogflow_1 = require("../QueueIntegrationServices/QueryDialogflow");
const CompaniesSettings_1 = __importDefault(require("../../models/CompaniesSettings"));
const CreateLogTicketService_1 = __importDefault(require("../TicketServices/CreateLogTicketService"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const ShowService_1 = __importDefault(require("../FileServices/ShowService"));
const openai_1 = __importDefault(require("openai"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const microsoft_cognitiveservices_speech_sdk_1 = require("microsoft-cognitiveservices-speech-sdk");
const typebotListener_1 = __importDefault(require("../TypebotServices/typebotListener"));
const Tag_1 = __importDefault(require("../../models/Tag"));
const TicketTag_1 = __importDefault(require("../../models/TicketTag"));
const queue_1 = __importDefault(require("../../libs/queue"));
const FlowBuilder_1 = require("../../models/FlowBuilder");
const ActionsWebhookService_1 = require("../WebhookService/ActionsWebhookService");
const Webhook_1 = require("../../models/Webhook");
const FlowCampaign_1 = require("../../models/FlowCampaign");
const ShowContactService_1 = __importDefault(require("../ContactServices/ShowContactService"));
const debug_1 = require("../../config/debug");
const utils_1 = require("../../utils");
const OpenAiService_1 = require("../IntegrationsServices/OpenAiService");
const getJidOf_1 = require("./getJidOf");
const verifyContact_1 = require("./verifyContact");
// import { verifyContact } from "./verifyContact";
const os_1 = __importDefault(require("os"));
const request_1 = __importDefault(require("request"));
const RedisGroupCache_1 = require("../../utils/RedisGroupCache");
const sgpListenerOficial_1 = __importDefault(require("../IntegrationsServices/Sgp/sgpListenerOficial"));
let ffmpegPath;
if (os_1.default.platform() === "win32") {
    // Windows
    ffmpegPath = "C:\\ffmpeg\\ffmpeg.exe"; // Substitua pelo caminho correto no Windows
}
else if (os_1.default.platform() === "darwin") {
    // macOS
    ffmpegPath = "/opt/homebrew/bin/ffmpeg"; // Substitua pelo caminho correto no macOS
}
else {
    // Outros sistemas operacionais (Linux, etc.)
    ffmpegPath = "/usr/bin/ffmpeg"; // Substitua pelo caminho correto em sistemas Unix-like
}
fluent_ffmpeg_1.default.setFfmpegPath(ffmpegPath);
let i = 0;
setInterval(() => {
    i = 0;
}, 5000);
const lidUpdateMutex = new async_mutex_1.Mutex();
const sessionsOpenAi = [];
// Removido promisify(writeFile); usando fs.promises.writeFile
function removeFile(directory) {
    fs_2.default.unlink(directory, error => {
        if (error)
            throw error;
    });
}
const getTimestampMessage = (msgTimestamp) => {
    return msgTimestamp * 1;
};
const multVecardGet = function (param) {
    let output = " ";
    let name = param
        .split("\n")[2]
        .replace(";;;", "\n")
        .replace("N:", "")
        .replace(";", "")
        .replace(";", " ")
        .replace(";;", " ")
        .replace("\n", "");
    let inicio = param.split("\n")[4].indexOf("=");
    let fim = param.split("\n")[4].indexOf(":");
    let contact = param
        .split("\n")[4]
        .substring(inicio + 1, fim)
        .replace(";", "");
    let contactSemWhats = param.split("\n")[4].replace("item1.TEL:", "");
    //console.log(contact);
    if (contact != "item1.TEL") {
        output = output + name + ": 📞" + contact + "" + "\n";
    }
    else
        output = output + name + ": 📞" + contactSemWhats + "" + "\n";
    return output;
};
const contactsArrayMessageGet = (msg) => {
    let contactsArray = msg.message?.contactsArrayMessage?.contacts;
    let vcardMulti = contactsArray.map(function (item, indice) {
        return item.vcard;
    });
    let bodymessage = ``;
    vcardMulti.forEach(function (vcard, indice) {
        bodymessage += vcard + "\n\n" + "";
    });
    let contacts = bodymessage.split("BEGIN:");
    contacts.shift();
    let finalContacts = "";
    for (let contact of contacts) {
        finalContacts = finalContacts + multVecardGet(contact);
    }
    return finalContacts;
};
const getTypeMessage = (msg) => {
    const msgType = (0, baileys_1.getContentType)(msg.message);
    if (msg.message?.extendedTextMessage && msg.message?.extendedTextMessage?.contextInfo && msg.message?.extendedTextMessage?.contextInfo?.externalAdReply) {
        return 'adMetaPreview'; // Adicionado para tratar mensagens de anúncios;
    }
    if (msg.message?.viewOnceMessageV2) {
        return "viewOnceMessageV2";
    }
    return msgType;
};
exports.getTypeMessage = getTypeMessage;
const getAd = (msg) => {
    if (msg.key.fromMe &&
        msg.message?.listResponseMessage?.contextInfo?.externalAdReply) {
        let bodyMessage = `*${msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.title}*`;
        bodyMessage += `\n\n${msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.body}`;
        return bodyMessage;
    }
};
const getBodyButton = (msg) => {
    try {
        if (msg?.messageType === "buttonsMessage" ||
            msg?.message?.buttonsMessage?.contentText) {
            let bodyMessage = `[BUTTON]\n\n*${msg?.message?.buttonsMessage?.contentText}*\n\n`;
            // eslint-disable-next-line no-restricted-syntax
            for (const button of msg.message?.buttonsMessage?.buttons) {
                bodyMessage += `*${button.buttonId}* - ${button.buttonText.displayText}\n`;
            }
            return bodyMessage;
        }
        if (msg?.messageType === "listMessage" ||
            msg?.message?.listMessage?.description) {
            let bodyMessage = `[LIST]\n\n*${msg?.message?.listMessage?.description}*\n\n`;
            // eslint-disable-next-line no-restricted-syntax
            for (const button of msg.message?.listMessage?.sections[0]?.rows) {
                bodyMessage += `${button.title}\n`;
            }
            return bodyMessage;
        }
    }
    catch (error) {
        logger_1.default.error(error);
    }
};
const msgLocation = (image, latitude, longitude) => {
    if (image) {
        var b64 = Buffer.from(image).toString("base64");
        let data = `data:image/png;base64, ${b64} | https://maps.google.com/maps?q=${latitude}%2C${longitude}&z=17&hl=pt-BR|${latitude}, ${longitude} `;
        return data;
    }
};
const getBodyMessage = (msg) => {
    try {
        let type = getTypeMessage(msg);
        if (type === undefined)
            console.log(JSON.stringify(msg));
        const types = {
            conversation: msg.message?.conversation,
            imageMessage: msg.message?.imageMessage?.caption,
            videoMessage: msg.message?.videoMessage?.caption,
            extendedTextMessage: msg?.message?.extendedTextMessage?.text,
            buttonsResponseMessage: msg.message?.buttonsResponseMessage?.selectedDisplayText,
            listResponseMessage: msg.message?.listResponseMessage?.title ||
                msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
            templateButtonReplyMessage: msg.message?.templateButtonReplyMessage?.selectedId,
            messageContextInfo: msg.message?.buttonsResponseMessage?.selectedButtonId ||
                msg.message?.listResponseMessage?.title,
            buttonsMessage: getBodyButton(msg) || msg.message?.listResponseMessage?.title,
            stickerMessage: "sticker",
            contactMessage: msg.message?.contactMessage?.vcard,
            contactsArrayMessage: msg.message?.contactsArrayMessage?.contacts &&
                contactsArrayMessageGet(msg),
            //locationMessage: `Latitude: ${msg.message.locationMessage?.degreesLatitude} - Longitude: ${msg.message.locationMessage?.degreesLongitude}`,
            locationMessage: msgLocation(msg.message?.locationMessage?.jpegThumbnail, msg.message?.locationMessage?.degreesLatitude, msg.message?.locationMessage?.degreesLongitude),
            liveLocationMessage: `Latitude: ${msg.message?.liveLocationMessage?.degreesLatitude} - Longitude: ${msg.message?.liveLocationMessage?.degreesLongitude}`,
            documentMessage: msg.message?.documentMessage?.caption,
            audioMessage: "Áudio",
            listMessage: getBodyButton(msg) || msg.message?.listResponseMessage?.title,
            viewOnceMessage: getBodyButton(msg),
            reactionMessage: msg.message?.reactionMessage?.text || "reaction",
            senderKeyDistributionMessage: msg?.message?.senderKeyDistributionMessage
                ?.axolotlSenderKeyDistributionMessage,
            documentWithCaptionMessage: msg.message?.documentWithCaptionMessage?.message?.documentMessage
                ?.caption,
            viewOnceMessageV2: msg.message?.viewOnceMessageV2?.message?.imageMessage?.caption,
            adMetaPreview: msgAdMetaPreview(msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.thumbnail, msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.title, msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.body, msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.sourceUrl, msg.message?.extendedTextMessage?.text),
            editedMessage: msg?.message?.protocolMessage?.editedMessage?.conversation ||
                msg?.message?.editedMessage?.message?.protocolMessage?.editedMessage
                    ?.conversation,
            ephemeralMessage: msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text,
            imageWhitCaptionMessage: msg?.message?.ephemeralMessage?.message?.imageMessage,
            highlyStructuredMessage: msg.message?.highlyStructuredMessage,
            protocolMessage: msg?.message?.protocolMessage?.editedMessage?.conversation,
            advertising: getAd(msg) ||
                msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.title
        };
        const objKey = Object.keys(types).find(key => key === type);
        if (!objKey) {
            logger_1.default.warn(`#### Nao achou o type 152: ${type} ${JSON.stringify(msg.message)}`);
            Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, type });
            Sentry.captureException(new Error("Novo Tipo de Mensagem em getTypeMessage"));
        }
        return types[type];
    }
    catch (error) {
        Sentry.setExtra("Error getTypeMessage", { msg, BodyMsg: msg?.message });
        Sentry.captureException(error);
        console.log(error);
    }
};
exports.getBodyMessage = getBodyMessage;
const msgAdMetaPreview = (image, title, body, sourceUrl, messageUser) => {
    if (image) {
        var b64 = Buffer.from(image).toString("base64");
        let data = `data:image/png;base64, ${b64} | ${sourceUrl} | ${title} | ${body} | ${messageUser}`;
        return data;
    }
};
const getQuotedMessage = (msg) => {
    const body = (0, baileys_1.extractMessageContent)(msg.message)[Object.keys(msg?.message).values().next().value];
    if (!body?.contextInfo?.quotedMessage)
        return;
    const quoted = (0, baileys_1.extractMessageContent)(body?.contextInfo?.quotedMessage[Object.keys(body?.contextInfo?.quotedMessage).values().next().value]);
    return quoted;
};
exports.getQuotedMessage = getQuotedMessage;
const getQuotedMessageId = (msg) => {
    const body = (0, baileys_1.extractMessageContent)(msg.message)[Object.keys(msg?.message).values().next().value];
    let reaction = msg?.message?.reactionMessage
        ? msg?.message?.reactionMessage?.key?.id
        : "";
    return reaction ? reaction : body?.contextInfo?.stanzaId;
};
exports.getQuotedMessageId = getQuotedMessageId;
const getMeSocket = (wbot) => {
    return {
        id: (0, baileys_1.jidNormalizedUser)(wbot.user.id),
        name: wbot.user.name
    };
};
const getSenderMessage = (msg, wbot) => {
    const me = getMeSocket(wbot);
    if (msg.key.fromMe)
        return me.id;
    const key = msg.key;
    console.log("[DEBUG RODRIGO] key", key.participant_pn, msg.participant, key.participant, key.remoteJid);
    const senderId = key.participant_pn || msg.participant || key.participant || key.remoteJid || undefined;
    return senderId && (0, baileys_1.jidNormalizedUser)(senderId);
};
const normalizeContactIdentifier = (msg) => {
    // @ts-ignore: lid pode não estar definido no tipo, mas existe na versão mais recente
    return (0, utils_1.normalizeJid)(msg.key.sender_lid || msg.key.remoteJid);
};
const getContactMessage = async (msg, wbot) => {
    const key = msg.key;
    const isGroup = msg.key.remoteJid.includes("g.us");
    const rawNumber = msg.key.remoteJid.replace(/\D/g, "");
    console.log("[DEBUG RODRIGO] key", JSON.stringify(key, null, 2));
    const lid = key.sender_lid && key?.sender_lid.includes("@lid") ? key.sender_lid : key.participant_lid && key?.participant_lid.includes("@lid") ? key.participant_lid : key.remoteJid && key?.remoteJid.includes("@lid") ? key.remoteJid : null;
    const senderPn = key.sender_pn && key.sender_pn.length > 0 ? key.sender_pn : key.participant_pn && key.participant_pn.length > 0 ? key.participant_pn : null;
    console.log("[DEBUG RODRIGO] senderPn", senderPn);
    const remoteJid = !key.remoteJid.includes("@lid") ? key.remoteJid : key.remoteJid.includes("@lid") && senderPn !== null ? senderPn : lid;
    console.log("[DEBUG RODRIGO] remoteJid", remoteJid);
    // Usa o identificador normalizado que considera o lid
    // const normalizedId = normalizeContactIdentifier(msg);
    return isGroup
        ? {
            id: getSenderMessage(msg, wbot),
            name: msg.pushName,
            lid: lid
        }
        : {
            id: remoteJid,
            name: msg.key.fromMe ? rawNumber : msg.pushName,
            lid: lid
        };
};
function findCaption(obj) {
    if (typeof obj !== "object" || obj === null) {
        return null;
    }
    for (const key in obj) {
        if (key === "caption" || key === "text" || key === "conversation") {
            return obj[key];
        }
        const result = findCaption(obj[key]);
        if (result) {
            return result;
        }
    }
    return null;
}
const allowedMimeTypes = [
    "text/plain",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/postscript",
    "application/x-zip-compressed",
    "application/zip",
    "application/octet-stream",
    "application/x-mtx",
    "application/x-aud",
    "application/x-rul",
    "application/x-exp",
    "application/x-plt",
    "application/x-mdl",
    "image/vnd.adobe.photoshop",
    "application/x-photoshop",
    "image/x-photoshop",
    "application/vnd.corel-draw",
    "application/illustrator",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
    "application/vnd.ms-word.document.macroEnabled.12",
    "application/x-msdownload",
    "application/x-executable",
    "application/x-ret"
];
const downloadMedia = async (msg, isImported = null, wbot) => {
    const mineType = msg.message?.imageMessage ||
        msg.message?.audioMessage ||
        msg.message?.videoMessage ||
        msg.message?.stickerMessage ||
        msg.message?.ephemeralMessage?.message?.stickerMessage ||
        msg.message?.documentMessage ||
        msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
        msg.message?.ephemeralMessage?.message?.audioMessage ||
        msg.message?.ephemeralMessage?.message?.documentMessage ||
        msg.message?.ephemeralMessage?.message?.videoMessage ||
        msg.message?.ephemeralMessage?.message?.imageMessage ||
        msg.message?.viewOnceMessage?.message?.imageMessage ||
        msg.message?.viewOnceMessage?.message?.videoMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
            ?.imageMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
            ?.videoMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
            ?.audioMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
            ?.documentMessage ||
        msg.message?.templateMessage?.hydratedTemplate?.imageMessage ||
        msg.message?.templateMessage?.hydratedTemplate?.documentMessage ||
        msg.message?.templateMessage?.hydratedTemplate?.videoMessage ||
        msg.message?.templateMessage?.hydratedFourRowTemplate?.imageMessage ||
        msg.message?.templateMessage?.hydratedFourRowTemplate?.documentMessage ||
        msg.message?.templateMessage?.hydratedFourRowTemplate?.videoMessage ||
        msg.message?.templateMessage?.fourRowTemplate?.imageMessage ||
        msg.message?.templateMessage?.fourRowTemplate?.documentMessage ||
        msg.message?.templateMessage?.fourRowTemplate?.videoMessage ||
        msg.message?.interactiveMessage?.header?.imageMessage ||
        msg.message?.interactiveMessage?.header?.documentMessage ||
        msg.message?.interactiveMessage?.header?.videoMessage;
    let filename = msg.message?.documentMessage?.fileName ||
        msg.message?.documentWithCaptionMessage?.message?.documentMessage
            ?.fileName ||
        msg.message?.extendedTextMessage?.text ||
        "";
    if (!filename && msg.message?.documentMessage?.title) {
        filename = msg.message.documentMessage.title;
    }
    // Se for um documento e tiver extensão, verifica se é permitido
    if (msg.message?.documentMessage && filename) {
        const ext = filename.split(".").pop().toLowerCase();
        const isAllowedExt = [
            "mtx",
            "aud",
            "rul",
            "exp",
            "zip",
            "plt",
            "mdl",
            "pdf",
            "psd",
            "cdr",
            "ai",
            "xls",
            "xlsx",
            "xlsm",
            "doc",
            "docx",
            "docm",
            "txt",
            // Novos formatos
            "odt",
            "ods",
            "odp",
            "odg",
            "xml",
            "ofx",
            "rtf",
            "csv",
            "html",
            "json",
            "rar",
            "7z",
            "tar",
            "gz",
            "bz2",
            "msg",
            "key",
            "numbers",
            "pages",
            "ppt",
            "pptx",
            // Executáveis e arquivos compactados
            "exe",
            // Imagens como documento
            "png",
            "jpg",
            "jpeg",
            "gif",
            "bmp",
            "webp",
            "dwg",
            "pfx",
            "p12",
            "ret"
        ].includes(ext);
        if (!isAllowedExt) {
            throw new Error("Invalid file type");
        }
    }
    if (!filename) {
        const mimeToExt = {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
            "application/vnd.ms-excel": "xls",
            "application/msword": "doc",
            "application/pdf": "pdf",
            "text/plain": "txt",
            "image/vnd.adobe.photoshop": "psd",
            "application/x-photoshop": "psd",
            "application/photoshop": "psd",
            "application/psd": "psd",
            "image/psd": "psd",
            "application/vnd.oasis.opendocument.text": "odt",
            "application/vnd.oasis.opendocument.spreadsheet": "ods",
            "application/vnd.oasis.opendocument.presentation": "odp",
            "application/vnd.oasis.opendocument.graphics": "odg",
            "application/xml": "xml",
            "text/xml": "xml",
            "application/ofx": "ofx",
            "application/vnd.ms-powerpoint": "ppt",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
            "application/rtf": "rtf",
            "text/csv": "csv",
            "text/html": "html",
            "application/json": "json",
            "application/zip": "zip",
            "application/x-rar-compressed": "rar",
            "application/x-7z-compressed": "7z",
            "application/x-tar": "tar",
            "application/gzip": "gz",
            "application/x-bzip2": "bz2",
            "application/vnd.ms-outlook": "msg",
            "application/vnd.apple.keynote": "key",
            "application/vnd.apple.numbers": "numbers",
            "application/vnd.apple.pages": "pages",
            "application/x-msdownload": "exe",
            "application/x-executable": "exe",
            "application/acad": "dwg",
            "image/vnd.dwg": "dwg",
            "application/dwg": "dwg",
            "application/x-dwg": "dwg",
            "image/x-dwg": "dwg",
            "application/x-pkcs12": "pfx",
            "application/pkcs-12": "pfx",
            "application/pkcs12": "pfx",
            "application/x-pkcs-12": "pfx",
            "application/pfx": "pfx"
        };
        const ext = mimeToExt[mineType.mimetype] ||
            mineType.mimetype.split("/")[1].split(";")[0];
        const shortId = String(new Date().getTime()).slice(-4);
        filename = `file_${shortId}.${ext}`;
    }
    else {
        const ext = filename.split(".").pop();
        const name = filename
            .split(".")
            .slice(0, -1)
            .join(".")
            .replace(/\s/g, "_")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const sanitizedName = `${name.trim()}.${ext}`;
        const folder = path_1.default.resolve(__dirname, "..", "..", "..", "public", `company${msg.key.remoteJid?.split("@")[0]}`);
        if (fs_2.default.existsSync(path_1.default.join(folder, sanitizedName))) {
            let counter = 1;
            let newName = `${name.trim()}_${counter}.${ext}`;
            while (fs_2.default.existsSync(path_1.default.join(folder, newName)) && counter < 100) {
                counter++;
                newName = `${name.trim()}_${counter}.${ext}`;
            }
            filename = newName;
        }
        else {
            filename = sanitizedName;
        }
    }
    if (msg.message?.stickerMessage) {
        const urlAnt = "https://web.whatsapp.net";
        const directPath = msg.message?.stickerMessage?.directPath;
        const newUrl = "https://mmg.whatsapp.net";
        const final = newUrl + directPath;
        if (msg.message?.stickerMessage?.url?.includes(urlAnt)) {
            msg.message.stickerMessage.url = msg.message?.stickerMessage.url.replace(urlAnt, final);
        }
    }
    let buffer;
    try {
        buffer = await (0, baileys_1.downloadMediaMessage)(msg, "buffer", {}, {
            logger: logger_1.default,
            reuploadRequest: wbot.updateMediaMessage
        });
    }
    catch (err) {
        if (isImported) {
            console.log("Falha ao fazer o download de uma mensagem importada, provavelmente a mensagem já não esta mais disponível");
        }
        else {
            console.error("Erro ao baixar mídia:", err);
        }
    }
    const media = {
        data: buffer,
        mimetype: mineType.mimetype,
        filename
    };
    return media;
};
const checkLIDStatus = async (wbot) => {
    try {
        const isLIDEnabled = wbot.user?.lid;
        return !!isLIDEnabled;
    }
    catch (error) {
        return false;
    }
};
const verifyQuotedMessage = async (msg) => {
    if (!msg)
        return null;
    const quoted = (0, exports.getQuotedMessageId)(msg);
    if (!quoted)
        return null;
    const quotedMsg = await Message_1.default.findOne({
        where: { wid: quoted }
    });
    if (!quotedMsg)
        return null;
    return quotedMsg;
};
const verifyMediaMessage = async (msg, ticket, contact, ticketTraking, isForwarded = false, isPrivate = false, wbot) => {
    const io = (0, socket_1.getIO)();
    const quotedMsg = await verifyQuotedMessage(msg);
    const companyId = ticket.companyId;
    try {
        const media = await downloadMedia(msg, ticket?.imported, wbot);
        if (!media && ticket.imported) {
            const body = "*System:* \nFalha no download da mídia verifique no dispositivo";
            const messageData = {
                //mensagem de texto
                wid: msg.key.id,
                ticketId: ticket.id,
                contactId: msg.key.fromMe ? undefined : ticket.contactId,
                body,
                reactionMessage: msg.message?.reactionMessage,
                fromMe: msg.key.fromMe,
                mediaType: getTypeMessage(msg),
                read: msg.key.fromMe,
                quotedMsgId: quotedMsg?.id || msg.message?.reactionMessage?.key?.id,
                ack: msg.status,
                companyId: companyId,
                remoteJid: msg.key.remoteJid,
                participant: msg.key.participant,
                timestamp: getTimestampMessage(msg.messageTimestamp),
                createdAt: new Date(Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)).toISOString(),
                dataJson: JSON.stringify(msg),
                ticketImported: ticket.imported,
                isForwarded,
                isPrivate
            };
            await ticket.update({
                lastMessage: body
            });
            logger_1.default.error(Error("ERR_WAPP_DOWNLOAD_MEDIA"));
            return (0, CreateMessageService_1.default)({ messageData, companyId: companyId });
        }
        if (!media) {
            throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
        }
        // if (!media.filename || media.mimetype === "audio/mp4") {
        //   const ext = media.mimetype === "audio/mp4" ? "m4a" : media.mimetype.split("/")[1].split(";")[0];
        //   media.filename = `${new Date().getTime()}.${ext}`;
        // } else {
        //   // ext = tudo depois do ultimo .
        //   const ext = media.filename.split(".").pop();
        //   // name = tudo antes do ultimo .
        //   const name = media.filename.split(".").slice(0, -1).join(".").replace(/\s/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        //   media.filename = `${name.trim()}_${new Date().getTime()}.${ext}`;
        // }
        if (!media.filename) {
            const ext = media.mimetype.split("/")[1].split(";")[0];
            media.filename = `${new Date().getTime()}.${ext}`;
        }
        else {
            // Preserva o nome original do arquivo, apenas sanitizando caracteres especiais
            const ext = media.filename.split(".").pop();
            const name = media.filename
                .split(".")
                .slice(0, -1)
                .join(".")
                .replace(/\s/g, "_")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            // Verifica se já existe um arquivo com o mesmo nome
            const folder = path_1.default.resolve(__dirname, "..", "..", "..", "public", `company${companyId}`);
            const sanitizedName = `${name.trim()}.${ext}`;
            if (fs_2.default.existsSync(path_1.default.join(folder, sanitizedName))) {
                // Se já existe um arquivo com o mesmo nome, adiciona timestamp
                media.filename = `${name.trim()}_${new Date().getTime()}.${ext}`;
            }
            else {
                // Se não existe, mantém o nome original sanitizado
                media.filename = sanitizedName;
            }
        }
        try {
            const folder = path_1.default.resolve(__dirname, "..", "..", "..", "public", `company${companyId}`);
            // const folder = `public/company${companyId}`; // Correção adicionada por Altemir 16-08-2023
            if (!fs_2.default.existsSync(folder)) {
                fs_2.default.mkdirSync(folder, { recursive: true }); // Correção adicionada por Altemir 16-08-2023
                fs_2.default.chmodSync(folder, 0o777);
            }
            await fs_3.promises.writeFile((0, path_1.join)(folder, media.filename), media.data.toString("base64"), "base64") // Correção adicionada por Altemir 16-08-2023
                .then(() => {
                // console.log("Arquivo salvo com sucesso!");
                if (media.mimetype.includes("audio")) {
                    console.log(media.mimetype);
                    const inputFile = path_1.default.join(folder, media.filename);
                    let outputFile;
                    if (inputFile.endsWith(".mpeg")) {
                        outputFile = inputFile.replace(".mpeg", ".mp3");
                    }
                    else if (inputFile.endsWith(".ogg")) {
                        outputFile = inputFile.replace(".ogg", ".mp3");
                    }
                    else {
                        // Trate outros formatos de arquivo conforme necessário
                        //console.error("Formato de arquivo não suportado:", inputFile);
                        return;
                    }
                    return new Promise((resolve, reject) => {
                        (0, fluent_ffmpeg_1.default)(inputFile)
                            .toFormat("mp3")
                            .save(outputFile)
                            .on("end", () => {
                            resolve();
                        })
                            .on("error", (err) => {
                            reject(err);
                        });
                    });
                }
            });
            // .then(() => {
            //   //console.log("Conversão concluída!");
            //   // Aqui você pode fazer o que desejar com o arquivo MP3 convertido.
            // })
        }
        catch (err) {
            Sentry.setExtra("Erro media", {
                companyId: companyId,
                ticket,
                contact,
                media,
                quotedMsg
            });
            Sentry.captureException(err);
            logger_1.default.error(err);
            console.log(msg);
        }
        const body = (0, exports.getBodyMessage)(msg);
        const messageData = {
            wid: msg.key.id,
            ticketId: ticket.id,
            contactId: msg.key.fromMe ? undefined : contact.id,
            body: body || media.filename,
            fromMe: msg.key.fromMe,
            read: msg.key.fromMe,
            mediaUrl: media.filename,
            mediaType: getMediaTypeFromMimeType(media.mimetype),
            quotedMsgId: quotedMsg?.id,
            ack: Number(String(msg.status).replace("PENDING", "2").replace("NaN", "1")) || 2,
            remoteJid: msg.key.remoteJid,
            participant: msg.key.participant,
            dataJson: JSON.stringify(msg),
            ticketTrakingId: ticketTraking?.id,
            createdAt: new Date(Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)).toISOString(),
            ticketImported: ticket.imported,
            isForwarded,
            isPrivate
        };
        await ticket.update({
            lastMessage: body || media.filename
        });
        const newMessage = await (0, CreateMessageService_1.default)({
            messageData,
            companyId: companyId
        });
        if (!msg.key.fromMe && ticket.status === "closed") {
            await ticket.update({ status: "pending" });
            await ticket.reload({
                attributes: [
                    "id",
                    "uuid",
                    "queueId",
                    "isGroup",
                    "channel",
                    "status",
                    "contactId",
                    "useIntegration",
                    "lastMessage",
                    "updatedAt",
                    "unreadMessages",
                    "companyId",
                    "whatsappId",
                    "imported",
                    "lgpdAcceptedAt",
                    "amountUsedBotQueues",
                    "useIntegration",
                    "integrationId",
                    "userId",
                    "amountUsedBotQueuesNPS",
                    "lgpdSendMessageAt",
                    "isBot"
                ],
                include: [
                    { model: Queue_1.default, as: "queue" },
                    { model: User_1.default, as: "user" },
                    { model: Contact_1.default, as: "contact" },
                    { model: Whatsapp_1.default, as: "whatsapp" }
                ]
            });
            io.of(String(companyId))
                // .to("closed")
                .emit(`company-${companyId}-ticket`, {
                action: "delete",
                ticket,
                ticketId: ticket.id
            });
            // console.log("emitiu socket 902", ticket.id)
            io.of(String(companyId))
                // .to(ticket.status)
                //   .to(ticket.id.toString())
                .emit(`company-${companyId}-ticket`, {
                action: "update",
                ticket,
                ticketId: ticket.id
            });
        }
        return newMessage;
    }
    catch (error) {
        console.log(error);
        logger_1.default.warn("Erro ao baixar media: ", JSON.stringify(msg));
    }
};
exports.verifyMediaMessage = verifyMediaMessage;
const verifyMessage = async (msg, ticket, contact, ticketTraking, isPrivate, isForwarded = false) => {
    const io = (0, socket_1.getIO)();
    const quotedMsg = await verifyQuotedMessage(msg);
    const body = (0, exports.getBodyMessage)(msg);
    const companyId = ticket.companyId;
    const messageData = {
        wid: msg.key.id,
        ticketId: ticket.id,
        contactId: msg.key.fromMe ? undefined : contact.id,
        body,
        fromMe: msg.key.fromMe,
        mediaType: getTypeMessage(msg),
        read: msg.key.fromMe,
        quotedMsgId: quotedMsg?.id,
        ack: Number(String(msg.status).replace("PENDING", "2").replace("NaN", "1")) ||
            2,
        remoteJid: msg.key.remoteJid,
        participant: msg.key.participant,
        dataJson: JSON.stringify(msg),
        ticketTrakingId: ticketTraking?.id,
        isPrivate,
        createdAt: new Date(Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)).toISOString(),
        ticketImported: ticket.imported,
        isForwarded
    };
    await ticket.update({
        lastMessage: body
    });
    await (0, CreateMessageService_1.default)({ messageData, companyId: companyId });
    if (!msg.key.fromMe && ticket.status === "closed") {
        await ticket.update({ status: "pending" });
        await ticket.reload({
            include: [
                { model: Queue_1.default, as: "queue" },
                { model: User_1.default, as: "user" },
                { model: Contact_1.default, as: "contact" },
                { model: Whatsapp_1.default, as: "whatsapp" }
            ]
        });
        // io.to("closed").emit(`company-${companyId}-ticket`, {
        //   action: "delete",
        //   ticket,
        //   ticketId: ticket.id
        // });
        if (!ticket.imported) {
            io.of(String(companyId))
                // .to(ticket.status)
                // .to(ticket.id.toString())
                .emit(`company-${companyId}-ticket`, {
                action: "update",
                ticket,
                ticketId: ticket.id
            });
        }
    }
};
exports.verifyMessage = verifyMessage;
const isValidMsg = (msg) => {
    if (msg.key.remoteJid === "status@broadcast")
        return false;
    try {
        const msgType = getTypeMessage(msg);
        if (!msgType) {
            return;
        }
        const ifType = msgType === "conversation" ||
            msgType === "extendedTextMessage" ||
            msgType === "audioMessage" ||
            msgType === "videoMessage" ||
            msgType === "ptvMessage" ||
            msgType === "imageMessage" ||
            msgType === "documentMessage" ||
            msgType === "stickerMessage" ||
            msgType === "buttonsResponseMessage" ||
            msgType === "buttonsMessage" ||
            msgType === "messageContextInfo" ||
            msgType === "locationMessage" ||
            msgType === "liveLocationMessage" ||
            msgType === "contactMessage" ||
            msgType === "voiceMessage" ||
            msgType === "mediaMessage" ||
            msgType === "contactsArrayMessage" ||
            msgType === "reactionMessage" ||
            msgType === "ephemeralMessage" ||
            msgType === "protocolMessage" ||
            msgType === "listResponseMessage" ||
            msgType === "listMessage" ||
            msgType === "interactiveMessage" ||
            msgType === "pollCreationMessageV3" ||
            msgType === "viewOnceMessage" ||
            msgType === "documentWithCaptionMessage" ||
            msgType === "viewOnceMessageV2" ||
            msgType === "editedMessage" ||
            msgType === "advertisingMessage" ||
            msgType === "highlyStructuredMessage" ||
            msgType === "eventMessage" ||
            msgType === "adMetaPreview";
        if (!ifType) {
            logger_1.default.warn(`#### Nao achou o type em isValidMsg: ${msgType}
${JSON.stringify(msg?.message)}`);
            Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, msgType });
            Sentry.captureException(new Error("Novo Tipo de Mensagem em isValidMsg"));
        }
        return !!ifType;
    }
    catch (error) {
        Sentry.setExtra("Error isValidMsg", { msg });
        Sentry.captureException(error);
    }
};
exports.isValidMsg = isValidMsg;
const sendDialogflowAwswer = async (wbot, ticket, msg, contact, inputAudio, companyId, queueIntegration) => {
    const session = await (0, CreateSessionDialogflow_1.createDialogflowSessionWithModel)(queueIntegration);
    if (session === undefined) {
        return;
    }
    wbot.presenceSubscribe(contact.remoteJid);
    await (0, baileys_1.delay)(500);
    let dialogFlowReply = await (0, QueryDialogflow_1.queryDialogFlow)(session, queueIntegration.projectName, contact.remoteJid, (0, exports.getBodyMessage)(msg), queueIntegration.language, inputAudio);
    if (!dialogFlowReply) {
        wbot.sendPresenceUpdate("composing", contact.remoteJid);
        const bodyDuvida = (0, Mustache_1.default)(`\u200e *${queueIntegration?.name}:* Não consegui entender sua dúvida.`);
        await (0, baileys_1.delay)(1000);
        await wbot.sendPresenceUpdate("paused", contact.remoteJid);
        const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket.contact), {
            text: bodyDuvida
        });
        wbot.store(sentMessage);
        await (0, exports.verifyMessage)(sentMessage, ticket, contact);
        return;
    }
    if (dialogFlowReply.endConversation) {
        await ticket.update({
            contactId: ticket.contact.id,
            useIntegration: false
        });
    }
    const image = dialogFlowReply.parameters.image?.stringValue ?? undefined;
    const react = dialogFlowReply.parameters.react?.stringValue ?? undefined;
    const audio = dialogFlowReply.encodedAudio.toString("base64") ?? undefined;
    wbot.sendPresenceUpdate("composing", contact.remoteJid);
    await (0, baileys_1.delay)(500);
    let lastMessage;
    for (let message of dialogFlowReply.responses) {
        lastMessage = message.text.text[0] ? message.text.text[0] : lastMessage;
    }
    for (let message of dialogFlowReply.responses) {
        if (message.text) {
            await sendDelayedMessages(wbot, ticket, contact, message.text.text[0], lastMessage, audio, queueIntegration);
        }
    }
};
async function sendDelayedMessages(wbot, ticket, contact, message, lastMessage, audio, queueIntegration) {
    const companyId = ticket.companyId;
    // console.log("GETTING WHATSAPP SEND DELAYED MESSAGES", ticket.whatsappId, wbot.id)
    const whatsapp = await (0, ShowWhatsAppService_1.default)(wbot.id, companyId);
    const farewellMessage = whatsapp.farewellMessage.replace(/[_*]/g, "");
    // if (react) {
    //   const test =
    //     /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g.test(
    //       react
    //     );
    //   if (test) {
    //     msg.react(react);
    //     await delay(1000);
    //   }
    // }
    const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, {
        text: `\u200e *${queueIntegration?.name}:* ` + message
    });
    wbot.store(sentMessage);
    await (0, exports.verifyMessage)(sentMessage, ticket, contact);
    if (message != lastMessage) {
        await (0, baileys_1.delay)(500);
        wbot.sendPresenceUpdate("composing", contact.remoteJid);
    }
    else if (audio) {
        wbot.sendPresenceUpdate("recording", contact.remoteJid);
        await (0, baileys_1.delay)(500);
        // if (audio && message === lastMessage) {
        //   const newMedia = new MessageMedia("audio/ogg", audio);
        //   const sentMessage = await wbot.sendMessage(
        //     `${contact.number}@c.us`,
        //     newMedia,
        //     {
        //       sendAudioAsVoice: true
        //     }
        //   );
        //   await verifyMessage(sentMessage, ticket, contact);
        // }
        // if (sendImage && message === lastMessage) {
        //   const newMedia = await MessageMedia.fromUrl(sendImage, {
        //     unsafeMime: true
        //   });
        //   const sentMessage = await wbot.sendMessage(
        //     `${contact.number}@c.us`,
        //     newMedia,
        //     {
        //       sendAudioAsVoice: true
        //     }
        //   );
        //   await verifyMessage(sentMessage, ticket, contact);
        //   await ticket.update({ lastMessage: "📷 Foto" });
        // }
        if (farewellMessage && message.includes(farewellMessage)) {
            await (0, baileys_1.delay)(1000);
            setTimeout(async () => {
                await ticket.update({
                    contactId: ticket.contact.id,
                    useIntegration: true
                });
                await (0, UpdateTicketService_1.default)({
                    ticketId: ticket.id,
                    ticketData: { status: "closed" },
                    companyId: companyId
                });
            }, 3000);
        }
    }
}
const verifyQueue = async (wbot, msg, ticket, contact, settings, ticketTraking) => {
    const companyId = ticket.companyId;
    // console.log("GETTING WHATSAPP VERIFY QUEUE", ticket.whatsappId, wbot.id)
    const { queues, greetingMessage, maxUseBotQueues, timeUseBotQueues, complationMessage } = await (0, ShowWhatsAppService_1.default)(wbot.id, companyId);
    let chatbot = false;
    if (queues.length === 1) {
        chatbot = queues[0]?.chatbots.length > 1;
    }
    const enableQueuePosition = settings.sendQueuePosition === "enabled";
    if (queues.length === 1 && !chatbot) {
        const sendGreetingMessageOneQueues = settings.sendGreetingMessageOneQueues === "enabled" || false;
        // integração: iniciar APENAS apos CPF no caso de SGP; outras integrações iniciam normalmente
        if (!msg.key.fromMe && !ticket.isGroup && queues[0].integrationId) {
            const integrations = await (0, ShowQueueIntegrationService_1.default)(queues[0].integrationId, companyId);
            if (String(integrations.type).toUpperCase() === "SGP") {
                // Não iniciar integração agora; apenas marcar integração no ticket
                await ticket.update({
                    useIntegration: true,
                    integrationId: integrations.id
                });
            }
            else {
                await (0, exports.handleMessageIntegration)(msg, wbot, companyId, integrations, ticket);
                if (msg.key.fromMe) {
                    await ticket.update({
                        typebotSessionTime: (0, moment_1.default)().toDate(),
                        useIntegration: true,
                        integrationId: integrations.id
                    });
                }
                else {
                    await ticket.update({
                        useIntegration: true,
                        integrationId: integrations.id
                    });
                }
            }
        }
        if (greetingMessage.length > 1 && sendGreetingMessageOneQueues) {
            const body = (0, Mustache_1.default)(`${greetingMessage}`, ticket);
            if (ticket.whatsapp.greetingMediaAttachment !== null) {
                const filePath = path_1.default.resolve("public", `company${companyId}`, ticket.whatsapp.greetingMediaAttachment);
                const fileExists = fs_2.default.existsSync(filePath);
                if (fileExists) {
                    const messagePath = ticket.whatsapp.greetingMediaAttachment;
                    const optionsMsg = await (0, SendWhatsAppMedia_1.getMessageOptions)(messagePath, filePath, String(companyId), body);
                    const debouncedSentgreetingMediaAttachment = (0, Debounce_1.debounce)(async () => {
                        const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), { ...optionsMsg });
                        wbot.store(sentMessage);
                        await (0, exports.verifyMediaMessage)(sentMessage, ticket, contact, ticketTraking, false, false, wbot);
                    }, 1000, ticket.id);
                    debouncedSentgreetingMediaAttachment();
                }
                else {
                    await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                        text: body
                    });
                }
            }
            else {
                const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                    text: body
                });
                wbot.store(sentMessage);
            }
        }
        if (!(0, lodash_1.isNil)(queues[0].fileListId)) {
            try {
                const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public");
                const files = await (0, ShowService_1.default)(queues[0].fileListId, ticket.companyId);
                const folder = path_1.default.resolve(publicFolder, `company${ticket.companyId}`, "fileList", String(files.id));
                for (const [index, file] of files.options.entries()) {
                    const mediaSrc = {
                        fieldname: "medias",
                        originalname: path_1.default.basename(file.path),
                        encoding: "7bit",
                        mimetype: file.mediaType,
                        filename: file.path,
                        path: path_1.default.resolve(folder, file.path)
                    };
                    await (0, SendWhatsAppMedia_1.default)({
                        media: mediaSrc,
                        ticket,
                        body: file.name,
                        isPrivate: false,
                        isForwarded: false
                    });
                }
            }
            catch (error) {
                logger_1.default.info(error);
            }
        }
        if (queues[0].closeTicket) {
            await (0, UpdateTicketService_1.default)({
                ticketData: {
                    status: "closed",
                    queueId: queues[0].id,
                    sendFarewellMessage: false
                },
                ticketId: ticket.id,
                companyId
            });
            return;
        }
        else {
            await (0, UpdateTicketService_1.default)({
                ticketData: {
                    queueId: queues[0].id,
                    status: ticket.status === "lgpd" ? "pending" : ticket.status
                },
                ticketId: ticket.id,
                companyId
            });
        }
        const count = await Ticket_1.default.findAndCountAll({
            where: {
                userId: null,
                status: "pending",
                companyId,
                queueId: queues[0].id,
                isGroup: false
            }
        });
        if (enableQueuePosition) {
            // Lógica para enviar posição da fila de atendimento
            const qtd = count.count === 0 ? 1 : count.count;
            const msgFila = `${settings.sendQueuePositionMessage} *${qtd}*`;
            // const msgFila = `*Assistente Virtual:*\n{{ms}} *{{name}}*, sua posição na fila de atendimento é: *${qtd}*`;
            const bodyFila = (0, Mustache_1.default)(`${msgFila}`, ticket);
            const debouncedSentMessagePosicao = (0, Debounce_1.debounce)(async () => {
                const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                    text: bodyFila
                });
                wbot.store(sentMessage);
            }, 3000, ticket.id);
            debouncedSentMessagePosicao();
        }
        return;
    }
    // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
    if (contact.disableBot) {
        return;
    }
    let selectedOption = "";
    if (ticket.status !== "lgpd") {
        selectedOption =
            msg?.message?.buttonsResponseMessage?.selectedButtonId ||
                msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
                (0, exports.getBodyMessage)(msg);
    }
    else {
        if (!(0, lodash_1.isNil)(ticket.lgpdAcceptedAt))
            await ticket.update({
                status: "pending"
            });
        await ticket.reload();
    }
    if (String(selectedOption).toLocaleLowerCase() === "sair") {
        // Enviar mensagem de conclusão antes de fechar para aparecer no frontend
        if (complationMessage) {
            await (0, SendWhatsAppMessage_1.default)({ body: complationMessage, ticket });
        }
        // Fechar ticket via serviço central para emitir sockets adequadamente
        await (0, UpdateTicketService_1.default)({
            ticketData: {
                isBot: false,
                status: "closed",
                // já enviamos a farewell acima
                sendFarewellMessage: false,
                amountUsedBotQueues: 0,
                useIntegration: null,
                integrationId: null,
            },
            ticketId: ticket.id,
            companyId
        });
        await ticketTraking.update({
            userId: ticket.userId,
            closedAt: (0, moment_1.default)().toDate(),
            finishedAt: (0, moment_1.default)().toDate()
        });
        await (0, CreateLogTicketService_1.default)({
            ticketId: ticket.id,
            type: "clientClosed",
            queueId: ticket.queueId
        });
        return;
    }
    let choosenQueue = chatbot && queues.length === 1
        ? queues[+selectedOption]
        : queues[+selectedOption - 1];
    const typeBot = settings?.chatBotType || "text";
    // Serviço p/ escolher consultor aleatório para o ticket, ao selecionar fila.
    let randomUserId;
    if (choosenQueue) {
        try {
            const userQueue = await (0, ListUserQueueServices_1.default)(choosenQueue.id);
            console.log("userQueue", userQueue.userId);
            if (userQueue.userId > -1) {
                randomUserId = userQueue.userId;
            }
        }
        catch (error) {
            console.error(error);
        }
    }
    // Ativar ou desativar opção de escolher consultor aleatório.
    /*   let settings = await CompaniesSettings.findOne({
        where: {
          companyId: companyId
        }
      }); */
    const botText = async () => {
        if (choosenQueue || (queues.length === 1 && chatbot)) {
            // console.log("entrou no choose", ticket.isOutOfHour, ticketTraking.chatbotAt)
            if (queues.length === 1)
                choosenQueue = queues[0];
            const queue = await Queue_1.default.findByPk(choosenQueue.id);
            if (ticket.isOutOfHour === false && ticketTraking.chatbotAt !== null) {
                await ticketTraking.update({
                    chatbotAt: null
                });
                await ticket.update({
                    amountUsedBotQueues: 0
                });
            }
            let currentSchedule;
            if (settings?.scheduleType === "queue") {
                currentSchedule = await (0, VerifyCurrentSchedule_1.default)(companyId, queue.id, 0);
            }
            if (settings?.scheduleType === "queue" &&
                ticket.status !== "open" &&
                !(0, lodash_1.isNil)(currentSchedule) &&
                (ticket.amountUsedBotQueues < maxUseBotQueues ||
                    maxUseBotQueues === 0) &&
                (!currentSchedule || currentSchedule.inActivity === false) &&
                (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")) {
                if (timeUseBotQueues !== "0") {
                    //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
                    //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
                    let dataLimite = new Date();
                    let Agora = new Date();
                    if (ticketTraking.chatbotAt !== null) {
                        dataLimite.setMinutes(ticketTraking.chatbotAt.getMinutes() + Number(timeUseBotQueues));
                        if (ticketTraking.chatbotAt !== null &&
                            Agora < dataLimite &&
                            timeUseBotQueues !== "0" &&
                            ticket.amountUsedBotQueues !== 0) {
                            return;
                        }
                    }
                    await ticketTraking.update({
                        chatbotAt: null
                    });
                }
                const outOfHoursMessage = queue.outOfHoursMessage;
                if (outOfHoursMessage !== "") {
                    // console.log("entrei3");
                    const body = (0, Mustache_1.default)(`${outOfHoursMessage}`, ticket);
                    const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                        const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                            text: body
                        });
                        wbot.store(sentMessage);
                    }, 1000, ticket.id);
                    debouncedSentMessage();
                    //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
                    // await ticket.update({
                    //   queueId: queue.id,
                    //   isOutOfHour: true,
                    //   amountUsedBotQueues: ticket.amountUsedBotQueues + 1
                    // });
                    // return;
                }
                //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
                await ticket.update({
                    queueId: queue.id,
                    isOutOfHour: true,
                    amountUsedBotQueues: ticket.amountUsedBotQueues + 1
                });
                return;
            }
            await (0, UpdateTicketService_1.default)({
                ticketData: { amountUsedBotQueues: 0, queueId: choosenQueue.id },
                // ticketData: { queueId: queues.length ===1 ? null : choosenQueue.id },
                ticketId: ticket.id,
                companyId
            });
            // }
            if (choosenQueue.chatbots.length > 0 && !ticket.isGroup) {
                let options = "";
                choosenQueue.chatbots.forEach((chatbot, index) => {
                    options += `*[ ${index + 1} ]* - ${chatbot.name}\n`;
                });
                const body = (0, Mustache_1.default)(`\u200e ${choosenQueue.greetingMessage}\n\n${options}\n*[ # ]* Voltar para o menu principal\n*[ Sair ]* Encerrar atendimento`, ticket);
                const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                    text: body
                });
                wbot.store(sentMessage);
                await (0, exports.verifyMessage)(sentMessage, ticket, contact, ticketTraking);
            }
            // Atribuir usuário imediatamente se randomização imediata estiver ativada
            if ((queue?.randomizeImmediate) || (settings?.settingsUserRandom === "enabled") && randomUserId) {
                await (0, UpdateTicketService_1.default)({
                    ticketData: { userId: randomUserId },
                    ticketId: ticket.id,
                    companyId
                });
                console.log(`[IMMEDIATE RANDOMIZATION] Ticket ${ticket.id} atribuído imediatamente para usuário ${randomUserId}`);
            }
            if (!choosenQueue.chatbots.length &&
                choosenQueue.greetingMessage.length !== 0) {
                const body = (0, Mustache_1.default)(`\u200e${choosenQueue.greetingMessage}`, ticket);
                const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                    text: body
                });
                wbot.store(sentMessage);
                await (0, exports.verifyMessage)(sentMessage, ticket, contact, ticketTraking);
            }
            // integração: iniciar APENAS apos CPF no caso de SGP; outras integrações iniciam normalmente
            if (!msg.key.fromMe && !ticket.isGroup && choosenQueue?.integrationId) {
                const integrations = await (0, ShowQueueIntegrationService_1.default)(choosenQueue.integrationId, companyId);
                if (String(integrations.type).toUpperCase() === "SGP") {
                    // Apenas marcar integração no ticket; aguardar CPF do cliente
                    if (msg.key.fromMe) {
                        await ticket.update({
                            typebotSessionTime: (0, moment_1.default)().toDate(),
                            useIntegration: true,
                            integrationId: choosenQueue.integrationId
                        });
                    }
                    else {
                        await ticket.update({
                            useIntegration: true,
                            integrationId: choosenQueue.integrationId
                        });
                    }
                }
                else {
                    await (0, exports.handleMessageIntegration)(msg, wbot, companyId, integrations, ticket);
                    if (msg.key.fromMe) {
                        await ticket.update({
                            typebotSessionTime: (0, moment_1.default)().toDate(),
                            useIntegration: true,
                            integrationId: choosenQueue.integrationId
                        });
                    }
                    else {
                        await ticket.update({
                            useIntegration: true,
                            integrationId: choosenQueue.integrationId
                        });
                    }
                }
            }
            if (!(0, lodash_1.isNil)(choosenQueue.fileListId)) {
                try {
                    const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public");
                    const files = await (0, ShowService_1.default)(choosenQueue.fileListId, ticket.companyId);
                    const folder = path_1.default.resolve(publicFolder, `company${ticket.companyId}`, "fileList", String(files.id));
                    for (const [index, file] of files.options.entries()) {
                        const mediaSrc = {
                            fieldname: "medias",
                            originalname: path_1.default.basename(file.path),
                            encoding: "7bit",
                            mimetype: file.mediaType,
                            filename: file.path,
                            path: path_1.default.resolve(folder, file.path)
                        };
                        // const debouncedSentMessagePosicao = debounce(
                        //   async () => {
                        const sentMessage = await (0, SendWhatsAppMedia_1.default)({
                            media: mediaSrc,
                            ticket,
                            body: `\u200e ${file.name}`,
                            isPrivate: false,
                            isForwarded: false
                        });
                        await (0, exports.verifyMediaMessage)(sentMessage, ticket, ticket.contact, ticketTraking, false, false, wbot);
                        //   },
                        //   2000,
                        //   ticket.id
                        // );
                        // debouncedSentMessagePosicao();
                    }
                }
                catch (error) {
                    logger_1.default.info(error);
                }
            }
            await (0, baileys_1.delay)(4000);
            //se fila está parametrizada para encerrar ticket automaticamente
            if (choosenQueue.closeTicket) {
                try {
                    await (0, UpdateTicketService_1.default)({
                        ticketData: {
                            status: "closed",
                            queueId: choosenQueue.id,
                            sendFarewellMessage: false,
                            useIntegration: null,
                            integrationId: null,
                        },
                        ticketId: ticket.id,
                        companyId
                    });
                }
                catch (error) {
                    logger_1.default.info(error);
                }
                return;
            }
            const count = await Ticket_1.default.findAndCountAll({
                where: {
                    userId: null,
                    status: "pending",
                    companyId,
                    queueId: choosenQueue.id,
                    whatsappId: wbot.id,
                    isGroup: false
                }
            });
            await (0, CreateLogTicketService_1.default)({
                ticketId: ticket.id,
                type: "queue",
                queueId: choosenQueue.id
            });
            if (enableQueuePosition && !choosenQueue.chatbots.length) {
                // Lógica para enviar posição da fila de atendimento
                const qtd = count.count === 0 ? 1 : count.count;
                const msgFila = `${settings.sendQueuePositionMessage} *${qtd}*`;
                // const msgFila = `*Assistente Virtual:*\n{{ms}} *{{name}}*, sua posição na fila de atendimento é: *${qtd}*`;
                const bodyFila = (0, Mustache_1.default)(`${msgFila}`, ticket);
                const debouncedSentMessagePosicao = (0, Debounce_1.debounce)(async () => {
                    const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                        text: bodyFila
                    });
                    wbot.store(sentMessage);
                }, 3000, ticket.id);
                debouncedSentMessagePosicao();
            }
        }
        else {
            if (ticket.isGroup)
                return;
            if (maxUseBotQueues &&
                maxUseBotQueues !== 0 &&
                ticket.amountUsedBotQueues >= maxUseBotQueues) {
                // await UpdateTicketService({
                //   ticketData: { queueId: queues[0].id },
                //   ticketId: ticket.id
                // });
                return;
            }
            if (timeUseBotQueues !== "0") {
                //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
                //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
                let dataLimite = new Date();
                let Agora = new Date();
                if (ticketTraking.chatbotAt !== null) {
                    dataLimite.setMinutes(ticketTraking.chatbotAt.getMinutes() + Number(timeUseBotQueues));
                    if (ticketTraking.chatbotAt !== null &&
                        Agora < dataLimite &&
                        timeUseBotQueues !== "0" &&
                        ticket.amountUsedBotQueues !== 0) {
                        return;
                    }
                }
                await ticketTraking.update({
                    chatbotAt: null
                });
            }
            // if (wbot.waitForSocketOpen()) {
            //   console.log("AGUARDANDO")
            //   console.log(wbot.waitForSocketOpen())
            // }
            wbot.presenceSubscribe(contact.remoteJid);
            let options = "";
            wbot.sendPresenceUpdate("composing", contact.remoteJid);
            queues.forEach((queue, index) => {
                options += `*[ ${index + 1} ]* - ${queue.name}\n`;
            });
            options += `\n*[ Sair ]* - Encerrar atendimento`;
            const body = (0, Mustache_1.default)(`\u200e${greetingMessage}\n\n${options}`, ticket);
            await (0, CreateLogTicketService_1.default)({
                ticketId: ticket.id,
                type: "chatBot"
            });
            await (0, baileys_1.delay)(1000);
            await wbot.sendPresenceUpdate("paused", contact.remoteJid);
            if (ticket.whatsapp.greetingMediaAttachment !== null) {
                const filePath = path_1.default.resolve("public", `company${companyId}`, ticket.whatsapp.greetingMediaAttachment);
                const fileExists = fs_2.default.existsSync(filePath);
                // console.log(fileExists);
                if (fileExists) {
                    const messagePath = ticket.whatsapp.greetingMediaAttachment;
                    const optionsMsg = await (0, SendWhatsAppMedia_1.getMessageOptions)(messagePath, filePath, String(companyId), body);
                    const debouncedSentgreetingMediaAttachment = (0, Debounce_1.debounce)(async () => {
                        const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), { ...optionsMsg });
                        wbot.store(sentMessage);
                        await (0, exports.verifyMediaMessage)(sentMessage, ticket, contact, ticketTraking, false, false, wbot);
                    }, 1000, ticket.id);
                    debouncedSentgreetingMediaAttachment();
                }
                else {
                    const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                        const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                            text: body
                        });
                        wbot.store(sentMessage);
                        await (0, exports.verifyMessage)(sentMessage, ticket, contact, ticketTraking);
                    }, 1000, ticket.id);
                    debouncedSentMessage();
                }
                await (0, UpdateTicketService_1.default)({
                    ticketData: { amountUsedBotQueues: ticket.amountUsedBotQueues + 1 },
                    ticketId: ticket.id,
                    companyId
                });
                return;
            }
            else {
                const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                    const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                        text: body
                    });
                    wbot.store(sentMessage);
                    await (0, exports.verifyMessage)(sentMessage, ticket, contact, ticketTraking);
                }, 1000, ticket.id);
                await (0, UpdateTicketService_1.default)({
                    ticketData: { amountUsedBotQueues: ticket.amountUsedBotQueues + 1 },
                    ticketId: ticket.id,
                    companyId
                });
                debouncedSentMessage();
            }
        }
    };
    if (typeBot === "text") {
        return botText();
    }
    if (typeBot === "button" && queues.length > 3) {
        return botText();
    }
};
const verifyRating = (ticketTraking) => {
    if (ticketTraking &&
        ticketTraking.finishedAt === null &&
        ticketTraking.closedAt !== null &&
        ticketTraking.userId !== null &&
        ticketTraking.ratingAt === null) {
        return true;
    }
    return false;
};
exports.verifyRating = verifyRating;
const handleRating = async (rate, ticket, ticketTraking) => {
    const io = (0, socket_1.getIO)();
    const companyId = ticket.companyId;
    // console.log("GETTING WHATSAPP HANDLE RATING", ticket.whatsappId, ticket.id)
    const { complationMessage } = await (0, ShowWhatsAppService_1.default)(ticket.whatsappId, companyId);
    let finalRate = rate;
    if (rate < 0) {
        finalRate = 0;
    }
    if (rate > 10) {
        finalRate = 10;
    }
    await UserRating_1.default.create({
        ticketId: ticketTraking.ticketId,
        companyId: ticketTraking.companyId,
        userId: ticketTraking.userId,
        rate: finalRate
    });
    if (!(0, lodash_1.isNil)(complationMessage) &&
        complationMessage !== "" &&
        !ticket.isGroup) {
        const body = (0, Mustache_1.default)(`\u200e${complationMessage}`, ticket);
        if (ticket.channel === "whatsapp") {
            const msg = await (0, SendWhatsAppMessage_1.default)({ body, ticket });
            await (0, exports.verifyMessage)(msg, ticket, ticket.contact, ticketTraking);
        }
        if (["facebook", "instagram"].includes(ticket.channel)) {
            await (0, sendFacebookMessage_1.sendFacebookMessage)({ body, ticket });
        }
    }
    await ticket.update({
        isBot: false,
        status: "closed",
        amountUsedBotQueuesNPS: 0,
        useIntegration: null,
        integrationId: null
    });
    //loga fim de atendimento
    await (0, CreateLogTicketService_1.default)({
        userId: ticket.userId,
        queueId: ticket.queueId,
        ticketId: ticket.id,
        type: "closed"
    });
    io.of(String(companyId))
        // .to("open")
        .emit(`company-${companyId}-ticket`, {
        action: "delete",
        ticket,
        ticketId: ticket.id
    });
    io.of(String(companyId))
        // .to(ticket.status)
        // .to(ticket.id.toString())
        .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id
    });
};
exports.handleRating = handleRating;
const sanitizeName = (name) => {
    let sanitized = name.split(" ")[0];
    sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, "");
    return sanitized.substring(0, 60);
};
const deleteFileSync = (path) => {
    try {
        fs_2.default.unlinkSync(path);
    }
    catch (error) {
        console.error("Erro ao deletar o arquivo:", error);
    }
};
const convertTextToSpeechAndSaveToFile = (text, filename, subscriptionKey, serviceRegion, voice = "pt-BR-FabioNeural", audioToFormat = "mp3") => {
    return new Promise((resolve, reject) => {
        const speechConfig = microsoft_cognitiveservices_speech_sdk_1.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
        speechConfig.speechSynthesisVoiceName = voice;
        const audioConfig = microsoft_cognitiveservices_speech_sdk_1.AudioConfig.fromAudioFileOutput(`${filename}.wav`);
        const synthesizer = new microsoft_cognitiveservices_speech_sdk_1.SpeechSynthesizer(speechConfig, audioConfig);
        synthesizer.speakTextAsync(text, result => {
            if (result) {
                convertWavToAnotherFormat(`${filename}.wav`, `${filename}.${audioToFormat}`, audioToFormat)
                    .then(output => {
                    resolve();
                })
                    .catch(error => {
                    console.error(error);
                    reject(error);
                });
            }
            else {
                reject(new Error("No result from synthesizer"));
            }
            synthesizer.close();
        }, error => {
            console.error(`Error: ${error}`);
            synthesizer.close();
            reject(error);
        });
    });
};
exports.convertTextToSpeechAndSaveToFile = convertTextToSpeechAndSaveToFile;
const convertWavToAnotherFormat = (inputPath, outputPath, toFormat) => {
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)()
            .input(inputPath)
            .toFormat(toFormat)
            .on("end", () => resolve(outputPath))
            .on("error", (err) => reject(new Error(`Error converting file: ${err.message}`)))
            .save(outputPath);
    });
};
const keepOnlySpecifiedChars = (str) => {
    return str.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôûÂÊÎÔÛãõÃÕçÇ!?.,;:\s]/g, "");
};
exports.keepOnlySpecifiedChars = keepOnlySpecifiedChars;
const transferQueue = async (queueId, ticket, contact) => {
    await (0, UpdateTicketService_1.default)({
        ticketData: { queueId: queueId },
        ticketId: ticket.id,
        companyId: ticket.companyId
    });
};
exports.transferQueue = transferQueue;
const matchesAnyPhrase = (campaignPhrases, messageBody) => {
    if (!campaignPhrases ||
        !Array.isArray(campaignPhrases) ||
        campaignPhrases.length === 0) {
        return false;
    }
    if (!messageBody || typeof messageBody !== "string") {
        return false;
    }
    const bodyLower = messageBody.toLowerCase().trim();
    return campaignPhrases.some((condition) => {
        if (!condition.text || typeof condition.text !== "string") {
            return false;
        }
        const phraseLower = condition.text.toLowerCase().trim();
        if (condition.type === "exact") {
            return bodyLower === phraseLower;
        }
        else if (condition.type === "partial") {
            return bodyLower.includes(phraseLower);
        }
        return false;
    });
};
/**
 * Normaliza frases de campanha para garantir backward compatibility
 */
const normalizeCampaignPhrases = (phrase) => {
    if (!phrase)
        return [];
    if (Array.isArray(phrase)) {
        return phrase.filter(item => item && item.text);
    }
    if (typeof phrase === "string") {
        try {
            const parsed = JSON.parse(phrase);
            if (Array.isArray(parsed)) {
                return parsed.filter(item => item && item.text);
            }
            if (typeof parsed === "string") {
                return [{ text: parsed, type: "exact" }];
            }
        }
        catch {
            return [{ text: phrase, type: "exact" }];
        }
    }
    return [];
};
/**
 * Encontra uma campanha que faça match com a mensagem
 */
const findMatchingCampaign = (campaigns, messageBody) => {
    if (!campaigns || !Array.isArray(campaigns) || campaigns.length === 0) {
        return null;
    }
    if (!messageBody || typeof messageBody !== "string") {
        return null;
    }
    return (campaigns.find((campaign) => {
        if (!campaign.status) {
            return false;
        }
        const phrases = normalizeCampaignPhrases(campaign.phrase);
        const hasMatch = matchesAnyPhrase(phrases, messageBody);
        if (hasMatch) {
            console.log(`[CAMPANHA MATCH] ID: ${campaign.id}, Mensagem: "${messageBody}", Frases:`, phrases);
        }
        return hasMatch;
    }) || null);
};
const flowbuilderIntegration = async (msg, wbot, companyId, queueIntegration, ticket, contact, isFirstMsg, isTranfered) => {
    if (contact.disableBot) {
        return;
    }
    const io = (0, socket_1.getIO)();
    const body = msg ? (0, exports.getBodyMessage)(msg) : ticket.lastMessage || "";
    // DEBUG - Verificar parâmetros de entrada
    logger_1.default.info(`[RDS-FLOW-DEBUG] flowbuilderIntegration iniciado para ticket ${ticket.id}`);
    logger_1.default.info(`[RDS-FLOW-DEBUG] Parâmetros: queueIntegration.type=${queueIntegration?.type}, flowWebhook=${ticket.flowWebhook}, lastFlowId=${ticket.lastFlowId}`);
    logger_1.default.info(`[RDS-FLOW-DEBUG] Mensagem: ${body}`);
    // ✅ VERIFICAR SE JÁ ESTÁ EXECUTANDO CAMPANHA PARA EVITAR REPETIÇÃO
    // CORREÇÃO: Permitir iniciar novos fluxos mesmo se flowWebhook estiver true
    if (ticket.flowWebhook && ticket.lastFlowId && msg) {
        // Se o fluxo já estiver ativo, verificar se devemos ignorar ou forçar início do fluxo
        const isInFlow = ticket.flowWebhook && ticket.lastFlowId;
        // Se o queueIntegration.type for 'flowbuilder', então forçamos início do fluxo
        if (queueIntegration?.type === 'flowbuilder' && !ticket.userId) {
            logger_1.default.info(`[RDS-FLOW-DEBUG] Forçando início do fluxo para ticket ${ticket.id}, mesmo com flowWebhook=${ticket.flowWebhook}`);
        }
        else {
            logger_1.default.info(`[RDS-FLOW-DEBUG] Ticket ${ticket.id} já em fluxo ativo (lastFlowId: ${ticket.lastFlowId}), ignorando nova verificação de campanha`);
            return false;
        }
    }
    // Só processar se não for mensagem minha (exceto quando msg é null = verificação pós-fluxo)
    if (msg && msg.key.fromMe) {
        logger_1.default.info(`[RDS-FLOW-DEBUG] Mensagem é fromMe, ignorando fluxo para ticket ${ticket.id}`);
        return false;
    }
    if (msg && msg.messageStubType) {
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] FlowBuilder - Ignorando evento de grupo: ${msg.messageStubType}`);
        }
        return false;
    }
    // ✅ ADICIONAR CACHE/CONTROLE PARA EVITAR EXECUÇÃO REPETIDA
    const messageId = msg?.key?.id;
    const cacheKey = `campaign_check_${ticket.id}_${messageId || 'manual'}`;
    // Verificar se já processamos esta mensagem/ticket para campanhas
    if (messageId && await cache_1.default.get(cacheKey)) {
        console.log(`[CAMPANHAS] Mensagem ${messageId} já processada para campanhas no ticket ${ticket.id}`);
        return false;
    }
    // Verificar se ticket foi fechado e reabrir se necessário
    if (msg && !msg.key.fromMe && ticket.status === "closed") {
        console.log(`[FLOW INTEGRATION] Reabrindo ticket fechado ${ticket.id}`);
        await ticket.update({ status: "pending" });
        await ticket.reload({
            include: [
                { model: Queue_1.default, as: "queue" },
                { model: User_1.default, as: "user" },
                { model: Contact_1.default, as: "contact" }
            ]
        });
        await (0, UpdateTicketService_1.default)({
            ticketData: { status: "pending", integrationId: ticket.integrationId },
            ticketId: ticket.id,
            companyId
        });
        io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
            action: "delete",
            ticket,
            ticketId: ticket.id
        });
        io.to(ticket.status).emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket,
            ticketId: ticket.id
        });
    }
    const whatsapp = await (0, ShowWhatsAppService_1.default)(wbot?.id || ticket.whatsappId, companyId);
    // DEBUG - Verificar configurações de fluxo
    console.log(`[FLOW-DEBUG] Configurações de fluxo - flowIdNotPhrase: ${whatsapp.flowIdNotPhrase}, flowIdWelcome: ${whatsapp.flowIdWelcome}`);
    // *** PRIORIDADE MÁXIMA: CAMPANHAS SEMPRE SÃO VERIFICADAS PRIMEIRO ***
    console.log(`[CAMPANHAS] Verificando campanhas para: "${body}" na conexão ${whatsapp.id} (${whatsapp.name})`);
    try {
        // Buscar campanhas ativas da empresa
        const activeCampaigns = await FlowCampaign_1.FlowCampaignModel.findAll({
            where: {
                companyId: ticket.companyId,
                status: true
            }
        });
        console.log(`[CAMPANHAS] ${activeCampaigns.length} campanhas ativas encontradas`);
        // ALTERAÇÃO PRINCIPAL: Filtrar campanhas que incluem esta conexão WhatsApp específica
        const campaignsForThisWhatsapp = activeCampaigns.filter(campaign => {
            try {
                const whatsappIds = campaign.whatsappIds || [];
                const includes = whatsappIds.includes(whatsapp.id);
                if (includes) {
                    console.log(`[CAMPANHAS] Campanha "${campaign.name}" (ID: ${campaign.id}) inclui conexão ${whatsapp.id}`);
                }
                return includes;
            }
            catch (error) {
                console.error(`[CAMPANHAS] Erro ao verificar campanha ${campaign.id}:`, error);
                return false;
            }
        });
        console.log(`[CAMPANHAS] ${campaignsForThisWhatsapp.length} campanhas aplicáveis para conexão ${whatsapp.id}`);
        // Verificar se alguma campanha faz match com a mensagem
        const matchingCampaign = campaignsForThisWhatsapp.find(campaign => {
            try {
                if (!campaign.status) {
                    return false;
                }
                // Usar novo método que considera a conexão específica
                const matches = campaign.matchesMessage(body, whatsapp.id);
                if (matches) {
                    console.log(`[CAMPANHAS] ✅ MATCH encontrado! Campanha "${campaign.name}" (ID: ${campaign.id}) para mensagem: "${body}"`);
                }
                return matches;
            }
            catch (error) {
                console.error(`[CAMPANHAS] Erro ao verificar match da campanha ${campaign.id}:`, error);
                return false;
            }
        });
        if (matchingCampaign) {
            console.log(`[CAMPANHAS] 🚀 EXECUTANDO FLUXO! Campanha: ${matchingCampaign.name} (ID: ${matchingCampaign.id}) | Fluxo: ${matchingCampaign.flowId} | Conexão: ${whatsapp.id} | Ticket: ${ticket.id}`);
            // ✅ MARCAR QUE CAMPANHA FOI EXECUTADA NO CACHE
            if (messageId) {
                await cache_1.default.set(cacheKey, "300"); // 5 minutos de cache
            }
            // Verificar se pode disparar campanha (não está em outro fluxo)
            if (msg && ticket.flowWebhook && ticket.lastFlowId) {
                console.log(`[CAMPANHAS] ⚠️ Ticket ${ticket.id} já em fluxo ativo (lastFlowId: ${ticket.lastFlowId}), aguardando...`);
                return false;
            }
            // *** IMPORTANTE: LIMPAR FLUXO ANTERIOR ANTES DE EXECUTAR CAMPANHA ***
            console.log(`[CAMPANHAS] 🧹 Limpando fluxo anterior do ticket ${ticket.id}`);
            await ticket.update({
                flowWebhook: true,
                flowStopped: null,
                lastFlowId: null,
                hashFlowId: null,
                dataWebhook: null,
                isBot: true,
                status: "pending"
            });
            await ticket.reload();
            // Buscar o fluxo a ser executado
            const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
                where: {
                    id: matchingCampaign.flowId,
                    company_id: companyId
                }
            });
            if (!flow) {
                console.error(`[CAMPANHAS] ❌ Fluxo ${matchingCampaign.flowId} não encontrado para empresa ${companyId}`);
                // ✅ LIMPAR ESTADO EM CASO DE ERRO
                await ticket.update({
                    flowWebhook: false,
                    isBot: false
                });
                return false;
            }
            console.log(`[CAMPANHAS] ✅ Fluxo encontrado: ${flow.name} (ID: ${flow.id})`);
            try {
                const nodes = flow.flow["nodes"];
                const connections = flow.flow["connections"];
                if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
                    console.error(`[CAMPANHAS] ❌ Fluxo ${flow.id} não possui nós válidos`);
                    // ✅ LIMPAR ESTADO EM CASO DE ERRO
                    await ticket.update({
                        flowWebhook: false,
                        isBot: false
                    });
                    return false;
                }
                const mountDataContact = {
                    number: contact.number,
                    name: contact.name,
                    email: contact.email
                };
                console.log(`[CAMPANHAS] 🎯 Iniciando execução do fluxo com dados do contato:`, mountDataContact);
                // Executar o fluxo
                await (0, ActionsWebhookService_1.ActionsWebhookService)(whatsapp.id, matchingCampaign.flowId, ticket.companyId, nodes, connections, flow.flow["nodes"][0].id, // Começar pelo primeiro nó
                null, "", "", null, ticket.id, mountDataContact);
                console.log(`[CAMPANHAS] ✅ SUCESSO! Campanha ${matchingCampaign.id} executada com sucesso na conexão ${whatsapp.id}!`);
                return true; // Retorna true indicando que uma campanha foi executada
            }
            catch (executionError) {
                console.error(`[CAMPANHAS] ❌ Erro ao executar fluxo da campanha ${matchingCampaign.id}:`, executionError);
                // ✅ LIMPAR ESTADO EM CASO DE ERRO
                await ticket.update({
                    flowWebhook: false,
                    isBot: false,
                    lastFlowId: null,
                    hashFlowId: null,
                    flowStopped: null
                });
                return false;
            }
        }
        console.log(`[CAMPANHAS] ℹ️ Nenhuma campanha fez match com "${body}" na conexão ${whatsapp.id}`);
    }
    catch (error) {
        console.error("[CAMPANHAS] ❌ Erro geral ao executar campanhas:", error);
        // ✅ LIMPAR ESTADO EM CASO DE ERRO GERAL
        try {
            await ticket.update({
                flowWebhook: false,
                isBot: false,
                lastFlowId: null,
                hashFlowId: null,
                flowStopped: null
            });
        }
        catch (cleanupError) {
            console.error("[CAMPANHAS] ❌ Erro ao limpar estado do ticket:", cleanupError);
        }
    }
    // Se é verificação pós-fluxo (msg = null) e não houve match de campanha, parar aqui
    if (!msg) {
        console.log(`[FLOW INTEGRATION] Verificação pós-fluxo concluída para ticket ${ticket.id}`);
        return false;
    }
    // Contar mensagens do cliente para verificar se é primeira interação
    const messageCount = await Message_1.default.count({
        where: {
            ticketId: ticket.id,
            fromMe: false // Apenas mensagens do cliente
        }
    });
    // Verificar se o contato é novo na base (primeira vez que aparece)
    const isNewContact = contact.createdAt &&
        Math.abs(new Date().getTime() - new Date(contact.createdAt).getTime()) < 5000; // 5 segundos de tolerância
    console.log(`[FIRST CONTACT CHECK] Ticket ${ticket.id} - Mensagens do cliente: ${messageCount}`);
    console.log(`[CONTACT STATUS] Contato ${contact.id} - Novo na base: ${isNewContact}, Criado em: ${contact.createdAt}`);
    // Buscar todas as campanhas para verificar se há match (para lógica do flowIdNotPhrase)
    const listPhrase = await FlowCampaign_1.FlowCampaignModel.findAll({
        where: {
            companyId: ticket.companyId,
            status: true
        }
    });
    // Função para verificar se tem match com alguma campanha desta conexão específica
    const hasAnyPhraseMatch = (listPhrase, messageBody, whatsappId) => {
        return listPhrase.some(campaign => {
            try {
                const whatsappIds = campaign.whatsappIds || [];
                if (!whatsappIds.includes(whatsappId)) {
                    return false;
                }
                return campaign.matchesMessage(messageBody, whatsappId);
            }
            catch (error) {
                console.error(`[PHRASE MATCH] Erro ao verificar campanha ${campaign.id}:`, error);
                return false;
            }
        });
    };
    // *** FLUXO flowIdNotPhrase: APENAS para contatos NOVOS na primeira mensagem SEM match de campanha ***
    console.log(`[FLOW-DEBUG] Verificando condições para flowIdNotPhrase:`);
    console.log(`[FLOW-DEBUG] - hasAnyPhraseMatch: ${hasAnyPhraseMatch(listPhrase, body, whatsapp.id)}`);
    console.log(`[FLOW-DEBUG] - whatsapp.flowIdNotPhrase: ${whatsapp.flowIdNotPhrase}`);
    console.log(`[FLOW-DEBUG] - messageCount: ${messageCount}`);
    console.log(`[FLOW-DEBUG] - isNewContact: ${isNewContact}`);
    // Evitar reexecutar o fluxo de primeiro contato no mesmo ticket
    const firstContactFlagKey = `first-contact-executed:${ticket.id}`;
    const firstContactAlreadyRan = await cache_1.default.get(firstContactFlagKey);
    if (firstContactAlreadyRan) {
        console.log(`[FIRST CONTACT] ⏭️ Já executado anteriormente para ticket ${ticket.id}, ignorando.`);
    }
    // *** FLUXO flowIdWelcome: Para contatos que JÁ EXISTEM na base ***
    if (!hasAnyPhraseMatch(listPhrase, body, whatsapp.id) &&
        whatsapp.flowIdWelcome &&
        messageCount === 1 &&
        !isNewContact &&
        !firstContactAlreadyRan) {
        console.log(`[WELCOME FLOW] 🚀 Iniciando flowIdWelcome (${whatsapp.flowIdWelcome}) - Contato existente na primeira mensagem`);
        try {
            const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
                where: {
                    id: whatsapp.flowIdWelcome,
                    company_id: companyId
                }
            });
            if (!flow) {
                console.error(`[WELCOME FLOW] ❌ Fluxo flowIdWelcome ${whatsapp.flowIdWelcome} não encontrado`);
            }
            else {
                const nodes = flow.flow["nodes"];
                const connections = flow.flow["connections"];
                if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
                    console.error(`[WELCOME FLOW] ❌ Fluxo flowIdWelcome ${flow.id} não possui nós válidos`);
                }
                else {
                    const mountDataContact = {
                        number: contact.number,
                        name: contact.name,
                        email: contact.email
                    };
                    await (0, ActionsWebhookService_1.ActionsWebhookService)(whatsapp.id, whatsapp.flowIdWelcome, ticket.companyId, nodes, connections, flow.flow["nodes"][0].id, null, "", "", null, ticket.id, mountDataContact);
                    console.log(`[WELCOME FLOW] ✅ Fluxo flowIdWelcome executado com sucesso!`);
                    // Marcar em cache para não reexecutar neste ticket
                    await cache_1.default.set(firstContactFlagKey, "1", "EX", 86400);
                }
            }
        }
        catch (error) {
            console.error("[WELCOME FLOW] ❌ Erro ao executar fluxo flowIdWelcome:", error);
        }
    }
    else if (!hasAnyPhraseMatch(listPhrase, body, whatsapp.id) &&
        whatsapp.flowIdNotPhrase &&
        messageCount === 1 &&
        isNewContact &&
        !firstContactAlreadyRan) {
        console.log(`[FIRST CONTACT] 🚀 Iniciando flowIdNotPhrase (${whatsapp.flowIdNotPhrase}) - Contato NOVO na primeira mensagem sem match de campanha`);
        try {
            const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
                where: {
                    id: whatsapp.flowIdNotPhrase,
                    company_id: companyId
                }
            });
            if (!flow) {
                console.error(`[FIRST CONTACT] ❌ Fluxo flowIdNotPhrase ${whatsapp.flowIdNotPhrase} não encontrado`);
            }
            else {
                const nodes = flow.flow["nodes"];
                const connections = flow.flow["connections"];
                if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
                    console.error(`[FIRST CONTACT] ❌ Fluxo flowIdNotPhrase ${flow.id} não possui nós válidos`);
                }
                else {
                    const mountDataContact = {
                        number: contact.number,
                        name: contact.name,
                        email: contact.email
                    };
                    await (0, ActionsWebhookService_1.ActionsWebhookService)(whatsapp.id, whatsapp.flowIdNotPhrase, ticket.companyId, nodes, connections, flow.flow["nodes"][0].id, null, "", "", null, ticket.id, mountDataContact);
                    console.log(`[FIRST CONTACT] ✅ Fluxo flowIdNotPhrase executado com sucesso na primeira mensagem!`);
                    // Marcar em cache para não reexecutar neste ticket
                    await cache_1.default.set(firstContactFlagKey, "1", "EX", 86400);
                }
            }
        }
        catch (error) {
            console.error("[FIRST CONTACT] ❌ Erro ao executar fluxo flowIdNotPhrase:", error);
        }
    }
    else if (!hasAnyPhraseMatch(listPhrase, body, whatsapp.id) &&
        (whatsapp.flowIdNotPhrase || whatsapp.flowIdWelcome) &&
        messageCount > 1) {
        console.log(`[FLOW SKIP] ℹ️ Pulando fluxos de primeiro contato - NÃO é primeira mensagem (count: ${messageCount})`);
        // Limpar flag caso exista, para não interferir em novos tickets
        if (firstContactAlreadyRan) {
            await cache_1.default.del(firstContactFlagKey);
        }
    }
    // *** FLUXOS WEBHOOK EXISTENTES (lógica original) ***
    logger_1.default.info(`[FLOW CHECK] ========== VERIFICANDO SE DEVE CONTINUAR FLUXO ==========`);
    logger_1.default.info(`[FLOW CHECK] Ticket ID: ${ticket.id}`);
    logger_1.default.info(`[FLOW CHECK] flowWebhook: ${ticket.flowWebhook}`);
    logger_1.default.info(`[FLOW CHECK] hashFlowId: ${ticket.hashFlowId}`);
    logger_1.default.info(`[FLOW CHECK] lastFlowId: ${ticket.lastFlowId}`);
    logger_1.default.info(`[FLOW CHECK] flowStopped: ${ticket.flowStopped}`);
    logger_1.default.info(`[FLOW CHECK] Condição (flowWebhook && hashFlowId): ${!!(ticket.flowWebhook && ticket.hashFlowId)}`);
    if (ticket.flowWebhook && ticket.hashFlowId) {
        logger_1.default.info(`[FLOW WEBHOOK] ========== PROCESSANDO FLUXO WEBHOOK EXISTENTE ==========`);
        logger_1.default.info(`[FLOW WEBHOOK] Ticket ID: ${ticket.id}`);
        logger_1.default.info(`[FLOW WEBHOOK] flowWebhook: ${ticket.flowWebhook}`);
        logger_1.default.info(`[FLOW WEBHOOK] hashFlowId: ${ticket.hashFlowId}`);
        // Validação para evitar erro de hash_id undefined
        if (!ticket.hashFlowId) {
            logger_1.default.error(`[FLOW WEBHOOK] ❌ Erro: ticket.hashFlowId é undefined para ticket ${ticket.id}`);
            return false;
        }
        try {
            const webhook = await Webhook_1.WebhookModel.findOne({
                where: {
                    company_id: ticket.companyId,
                    hash_id: ticket.hashFlowId
                }
            });
            if (webhook && webhook.config["details"]) {
                // ✅ CRÍTICO: Só processar se a mensagem for do USUÁRIO, não do BOT
                if (msg && msg.key.fromMe) {
                    logger_1.default.info(`[FLOW WEBHOOK] ⚠️ Mensagem é do bot (fromMe=true) - IGNORANDO para evitar loop`);
                    logger_1.default.info(`[FLOW WEBHOOK] Aguardando resposta do USUÁRIO para ticket ${ticket.id}`);
                    return false;
                }
                logger_1.default.info(`[FLOW WEBHOOK] ========== WEBHOOK ENCONTRADO ==========`);
                logger_1.default.info(`[FLOW WEBHOOK] Nome: ${webhook.name || "sem nome"}`);
                logger_1.default.info(`[FLOW WEBHOOK] Ticket ${ticket.id}, Mensagem: "${body}"`);
                const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
                    where: {
                        id: webhook.config["details"].idFlow,
                        company_id: companyId
                    }
                });
                if (flow) {
                    const nodes = flow.flow["nodes"];
                    const connections = flow.flow["connections"];
                    await (0, ActionsWebhookService_1.ActionsWebhookService)(whatsapp.id, webhook.config["details"].idFlow, ticket.companyId, nodes, connections, ticket.lastFlowId, ticket.dataWebhook, webhook.config["details"], ticket.hashFlowId, body, ticket.id);
                    logger_1.default.info("[FLOW WEBHOOK] ✅ Fluxo webhook executado!");
                }
                else {
                    logger_1.default.error(`[FLOW WEBHOOK] ❌ Fluxo ${webhook.config["details"].idFlow} não encontrado`);
                }
            }
            else if (ticket.flowStopped && ticket.lastFlowId) {
                // ✅ CRÍTICO: Só processar se a mensagem for do USUÁRIO, não do BOT
                if (msg && msg.key.fromMe) {
                    logger_1.default.info(`[FLOW STOPPED] ⚠️ Mensagem é do bot (fromMe=true) - IGNORANDO para evitar loop`);
                    logger_1.default.info(`[FLOW STOPPED] Aguardando resposta do USUÁRIO para ticket ${ticket.id}`);
                    return false;
                }
                // Fluxo interrompido
                logger_1.default.info(`[FLOW STOPPED] ========== CONTINUANDO FLUXO INTERROMPIDO ==========`);
                logger_1.default.info(`[FLOW STOPPED] Ticket ${ticket.id}, FlowId: ${ticket.flowStopped}`);
                logger_1.default.info(`[FLOW STOPPED] LastFlowId: ${ticket.lastFlowId}`);
                logger_1.default.info(`[FLOW STOPPED] Mensagem do usuário: "${body}"`);
                const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
                    where: {
                        id: ticket.flowStopped,
                        company_id: companyId
                    }
                });
                if (flow) {
                    const nodes = flow.flow["nodes"];
                    const connections = flow.flow["connections"];
                    const mountDataContact = {
                        number: contact.number,
                        name: contact.name,
                        email: contact.email
                    };
                    logger_1.default.info(`[FLOW STOPPED] Chamando ActionsWebhookService com pressKey: "${body}"`);
                    await (0, ActionsWebhookService_1.ActionsWebhookService)(whatsapp.id, parseInt(ticket.flowStopped), ticket.companyId, nodes, connections, ticket.lastFlowId, null, "", "", body, ticket.id, mountDataContact);
                    logger_1.default.info("[FLOW STOPPED] ✅ Fluxo interrompido continuado!");
                }
                else {
                    logger_1.default.error(`[FLOW STOPPED] ❌ Fluxo interrompido ${ticket.flowStopped} não encontrado`);
                }
            }
        }
        catch (error) {
            logger_1.default.error("[FLOW WEBHOOK] ❌ Erro ao processar fluxo webhook:", error);
        }
    }
    else {
        logger_1.default.warn(`[FLOW CHECK] ❌ CONDIÇÃO NÃO ATENDIDA - Fluxo não será continuado`);
        logger_1.default.warn(`[FLOW CHECK] Motivo: flowWebhook=${ticket.flowWebhook}, hashFlowId=${ticket.hashFlowId || 'null'}`);
        // Se tem flowStopped e lastFlowId mas não tem hashFlowId ou flowWebhook, pode ser um problema
        if (ticket.flowStopped && ticket.lastFlowId) {
            logger_1.default.error(`[FLOW CHECK] ⚠️ PROBLEMA DETECTADO: Ticket tem flowStopped=${ticket.flowStopped} e lastFlowId=${ticket.lastFlowId}`);
            logger_1.default.error(`[FLOW CHECK] mas flowWebhook=${ticket.flowWebhook} e hashFlowId=${ticket.hashFlowId || 'null'}`);
            logger_1.default.error(`[FLOW CHECK] Isso indica que o ticket não foi salvo corretamente após enviar o menu!`);
        }
    }
    logger_1.default.info(`[FLOW INTEGRATION] Processamento concluído para ticket ${ticket.id} - conexão ${whatsapp.id}`);
    return false;
};
exports.flowbuilderIntegration = flowbuilderIntegration;
const handleMessageIntegration = async (msg, wbot, companyId, queueIntegration, ticket) => {
    // Fallback em caso de erro na integração: notifica cliente, finaliza ticket e limpa integração
    const notifyIntegrationErrorAndReset = async (ticketReset, companyResetId, bodyText) => {
        const fallbackText = bodyText || "Desculpe, ocorreu um problema na integração. O atendimento seguirá pelo fluxo padrão.";
        try {
            await (0, SendWhatsAppMessage_1.default)({ body: fallbackText, ticket: ticketReset });
        }
        catch (sendErr) {
            logger_1.default.error(`[INTEGRATION FALLBACK] Erro ao enviar mensagem de falha: ${sendErr?.message}`);
        }
        try {
            await (0, UpdateTicketService_1.default)({
                ticketId: ticketReset.id,
                companyId: companyResetId,
                ticketData: { status: "closed", useIntegration: null, integrationId: null }
            });
            logger_1.default.info(`[INTEGRATION FALLBACK] Ticket ${ticketReset.id} finalizado e integração limpa.`);
        }
        catch (updateErr) {
            logger_1.default.error(`[INTEGRATION FALLBACK] Erro ao finalizar/limpar ticket ${ticketReset.id}: ${updateErr?.message}`);
        }
    };
    const msgType = getTypeMessage(msg);
    // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
    if (ticket?.contact?.disableBot) {
        return;
    }
    try {
        console.error(`queueIntegration.type: ${queueIntegration.type}`);
        // Integração SGP (via jsonContent ou type)
        try {
            console.error(`queueIntegration.type 2: ${queueIntegration.type}`);
            let cfg = {};
            cfg = queueIntegration?.jsonContent ? JSON.parse(queueIntegration.jsonContent) : {};
            if (queueIntegration.type === "SGP" ||
                ((cfg?.sgpUrl || cfg?.tipoIntegracao) && queueIntegration.type !== "typebot")) {
                console.error(`queueIntegration.type 3: ${queueIntegration.type}`);
                const simulatedMsg = {
                    key: {
                        fromMe: false,
                        remoteJid: msg?.key?.remoteJid,
                        id: msg?.key?.id
                    },
                    message: {
                        conversation: (0, exports.getBodyMessage)(msg),
                        text: (0, exports.getBodyMessage)(msg),
                        timestamp: msg?.messageTimestamp
                    }
                };
                await (0, sgpListenerOficial_1.default)({ msg: simulatedMsg, ticket, queueIntegration });
                return;
            }
            else {
                console.error(`queueIntegration.type 4: ${queueIntegration.type}`);
            }
        }
        catch { /* ignora parse e segue */ }
        if (queueIntegration.type === "n8n" || queueIntegration.type === "webhook") {
            if (queueIntegration?.urlN8N) {
                const options = {
                    method: "POST",
                    url: queueIntegration?.urlN8N,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    json: msg
                };
                try {
                    (0, request_1.default)(options, function (error, response) {
                        if (error) {
                            throw new Error(error);
                        }
                        else {
                            console.log(response.body);
                        }
                    });
                }
                catch (error) {
                    throw new Error(error);
                }
            }
        }
        else if (queueIntegration.type === "dialogflow") {
            let inputAudio;
            if (msgType === "audioMessage") {
                let filename = `${msg.messageTimestamp}.ogg`;
                (0, fs_1.readFile)((0, path_1.join)(__dirname, "..", "..", "..", "public", `company${companyId}`, filename), "base64", (err, data) => {
                    inputAudio = data;
                    if (err) {
                        logger_1.default.error(err);
                    }
                });
            }
            else {
                inputAudio = undefined;
            }
            const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                await sendDialogflowAwswer(wbot, ticket, msg, ticket.contact, inputAudio, companyId, queueIntegration);
            }, 500, ticket.id);
            debouncedSentMessage();
        }
        else if (queueIntegration.type === "typebot") {
            console.log("[TYPEBOT 3010] Enviando mensagem para Typebot");
            // await typebots(ticket, msg, wbot, queueIntegration);
            await (0, typebotListener_1.default)({ ticket, msg, wbot, typebot: queueIntegration });
        }
        else if (queueIntegration.type === "flowbuilder") {
            const contact = await (0, ShowContactService_1.default)(ticket.contactId, ticket.companyId);
            await (0, exports.flowbuilderIntegration)(msg, wbot, companyId, queueIntegration, ticket, contact, null, null);
        }
        else if (queueIntegration.type === "SGP") {
            console.error(`SGP: Chamando integração SGP pelo handler antigo`);
        }
    }
    catch (error) {
        logger_1.default.error(`[INTEGRATION ERROR] Erro ao processar integração ${queueIntegration?.type} no ticket ${ticket.id}:`, error);
        await notifyIntegrationErrorAndReset(ticket, companyId);
    }
};
exports.handleMessageIntegration = handleMessageIntegration;
const flowBuilderQueue = async (ticket, msg, wbot, whatsapp, companyId, contact, isFirstMsg) => {
    const body = (0, exports.getBodyMessage)(msg);
    const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
        where: {
            id: ticket.flowStopped
        }
    });
    const mountDataContact = {
        number: contact.number,
        name: contact.name,
        email: contact.email
    };
    const nodes = flow.flow["nodes"];
    const connections = flow.flow["connections"];
    if (!ticket.lastFlowId) {
        return;
    }
    await (0, ActionsWebhookService_1.ActionsWebhookService)(whatsapp.id, parseInt(ticket.flowStopped), ticket.companyId, nodes, connections, ticket.lastFlowId, null, "", "", body, ticket.id, mountDataContact, null, msg);
    //const integrations = await ShowQueueIntegrationService(whatsapp.integrationId, companyId);
    //await handleMessageIntegration(msg, wbot, companyId, integrations, ticket, contact, isFirstMsg)
};
const checkTemporaryAI = async (wbot, ticket, contact, msgContact, mediaSent, ticketTraking, msg) => {
    // Verificar se é modo temporário com flowContinuation
    const dataWebhook = ticket.dataWebhook;
    const flowContinuation = dataWebhook?.flowContinuation;
    // ✅ CORRIGIDO: IA temporária deve parar quando ticket é aceito (status = "open" ou isBot = false)
    if ((!flowContinuation || !ticket.useIntegration || !ticket.flowStopped || !ticket.lastFlowId) && ticket.status !== "open" && ticket.isBot !== false) {
        return false;
    }
    // Verificar se é node IA em modo temporário
    const isAIMode = dataWebhook?.type === "openai" || dataWebhook?.type === "gemini";
    if (!isAIMode || dataWebhook?.mode !== "temporary") {
        return false;
    }
    try {
        const aiSettings = {
            ...dataWebhook.settings,
            provider: dataWebhook.type
        };
        // ✅ SE FOR PRIMEIRA RESPOSTA, REMOVER FLAG
        if (dataWebhook.awaitingUserResponse) {
            await ticket.update({
                dataWebhook: {
                    ...dataWebhook,
                    awaitingUserResponse: false
                }
            });
        }
        // ✅ PROCESSAR ATRAVÉS DA IA
        await (0, OpenAiService_1.handleOpenAiFlow)(aiSettings, msg, wbot, ticket, contact, mediaSent, ticketTraking);
        return true;
    }
    catch (error) {
        logger_1.default.error("[AI SERVICE] Erro ao processar IA temporário:", error);
        return false;
    }
};
const handleOpenAi = async (msg, wbot, ticket, contact, mediaSent, ticketTraking) => {
    // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
    if (contact.disableBot) {
        return;
    }
    const bodyMessage = (0, exports.getBodyMessage)(msg);
    if (!bodyMessage)
        return;
    // console.log("GETTING WHATSAPP HANDLE OPENAI", ticket.whatsappId, ticket.id)
    const { prompt } = await (0, ShowWhatsAppService_1.default)(wbot.id, ticket.companyId);
    if (!prompt)
        return;
    if (msg.messageStubType)
        return;
    const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public", `company${ticket.companyId}`);
    let openai;
    const openAiIndex = sessionsOpenAi.findIndex(s => s.id === ticket.id);
    if (openAiIndex === -1) {
        // const configuration = new Configuration({
        //   apiKey: prompt.apiKey
        // });
        openai = new openai_1.default({ apiKey: prompt.apiKey });
        openai.id = ticket.id;
        sessionsOpenAi.push(openai);
    }
    else {
        openai = sessionsOpenAi[openAiIndex];
    }
    const messages = await Message_1.default.findAll({
        where: { ticketId: ticket.id },
        order: [["createdAt", "ASC"]],
        limit: prompt.maxMessages
    });
    const promptSystem = `Nas respostas utilize o nome ${sanitizeName(contact.name || "Amigo(a)")} para identificar o cliente.\nSua resposta deve usar no máximo ${prompt.maxTokens} tokens e cuide para não truncar o final.\nSempre que possível, mencione o nome dele para ser mais personalizado o atendimento e mais educado. Quando a resposta requer uma transferência para o setor de atendimento, comece sua resposta com 'Ação: Transferir para o setor de atendimento'.\n
  ${prompt.prompt}\n`;
    let messagesOpenAi = [];
    if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
        messagesOpenAi = [];
        messagesOpenAi.push({ role: "system", content: promptSystem });
        for (let i = 0; i < Math.min(prompt.maxMessages, messages.length); i++) {
            const message = messages[i];
            if (message.mediaType === "conversation" || message.mediaType === "extendedTextMessage") {
                if (message.fromMe) {
                    messagesOpenAi.push({ role: "assistant", content: message.body });
                }
                else {
                    messagesOpenAi.push({ role: "user", content: message.body });
                }
            }
        }
        messagesOpenAi.push({ role: "user", content: bodyMessage });
        const chat = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: messagesOpenAi,
            max_tokens: prompt.maxTokens,
            temperature: prompt.temperature
        });
        let response = chat.choices[0].message?.content;
        if (response?.includes("Ação: Transferir para o setor de atendimento")) {
            await (0, exports.transferQueue)(prompt.queueId, ticket, contact);
            response = response
                .replace("Ação: Transferir para o setor de atendimento", "")
                .trim();
        }
        if (prompt.voice === "texto") {
            const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
                text: `\u200e ${response}`
            });
            await (0, exports.verifyMessage)(sentMessage, ticket, contact);
        }
        else {
            const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
            (0, exports.convertTextToSpeechAndSaveToFile)((0, exports.keepOnlySpecifiedChars)(response), `${publicFolder}/${fileNameWithOutExtension}`, prompt.voiceKey, prompt.voiceRegion, prompt.voice, "mp3").then(async () => {
                try {
                    const sendMessage = await wbot.sendMessage(msg.key.remoteJid, {
                        audio: { url: `${publicFolder}/${fileNameWithOutExtension}.mp3` },
                        mimetype: "audio/mpeg",
                        ptt: true
                    });
                    await (0, exports.verifyMediaMessage)(sendMessage, ticket, contact, ticketTraking, false, false, wbot);
                    deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
                    deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
                }
                catch (error) {
                    console.log(`Erro para responder com audio: ${error}`);
                }
            });
        }
    }
    else if (msg.message?.audioMessage) {
        const mediaUrl = mediaSent.mediaUrl.split("/").pop();
        const file = fs_2.default.createReadStream(`${publicFolder}/${mediaUrl}`);
        const transcription = await openai.audio.transcriptions.create({
            model: "whisper-1",
            file: file,
        });
        messagesOpenAi = [];
        messagesOpenAi.push({ role: "system", content: promptSystem });
        for (let i = 0; i < Math.min(prompt.maxMessages, messages.length); i++) {
            const message = messages[i];
            if (message.mediaType === "conversation" || message.mediaType === "extendedTextMessage") {
                if (message.fromMe) {
                    messagesOpenAi.push({ role: "assistant", content: message.body });
                }
                else {
                    messagesOpenAi.push({ role: "user", content: message.body });
                }
            }
        }
        messagesOpenAi.push({ role: "user", content: transcription.text });
        const chat = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: messagesOpenAi,
            max_tokens: prompt.maxTokens,
            temperature: prompt.temperature
        });
        let response = chat.choices[0].message?.content;
        if (response?.includes("Ação: Transferir para o setor de atendimento")) {
            await (0, exports.transferQueue)(prompt.queueId, ticket, contact);
            response = response
                .replace("Ação: Transferir para o setor de atendimento", "")
                .trim();
        }
        if (prompt.voice === "texto") {
            const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
                text: `\u200e ${response}`
            });
            await (0, exports.verifyMessage)(sentMessage, ticket, contact);
        }
        else {
            const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
            (0, exports.convertTextToSpeechAndSaveToFile)((0, exports.keepOnlySpecifiedChars)(response), `${publicFolder}/${fileNameWithOutExtension}`, prompt.voiceKey, prompt.voiceRegion, prompt.voice, "mp3").then(async () => {
                try {
                    const sendMessage = await wbot.sendMessage(msg.key.remoteJid, {
                        audio: { url: `${publicFolder}/${fileNameWithOutExtension}.mp3` },
                        mimetype: "audio/mpeg",
                        ptt: true
                    });
                    await (0, exports.verifyMediaMessage)(sendMessage, ticket, contact, ticketTraking, false, false, wbot);
                    deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
                    deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
                }
                catch (error) {
                    console.log(`Erro para responder com audio: ${error}`);
                }
            });
        }
    }
    messagesOpenAi = [];
};
const handleMessage = async (msg, wbot, companyId, isImported = false) => {
    let campaignExecuted = false;
    console.log("[DEBUG RODRIGO] msg.key.id", JSON.stringify(msg.key));
    if (isImported) {
        (0, addLogs_1.addLogs)({
            fileName: `processImportMessagesWppId${wbot.id}.txt`,
            text: `Importando Mensagem: ${JSON.stringify(msg, null, 2)}>>>>>>>>>>>>>>>>>>>`
        });
        let wid = msg.key.id;
        let existMessage = await Message_1.default.findOne({
            where: { wid }
        });
        if (existMessage) {
            await new Promise(r => setTimeout(r, 150));
            console.log("Esta mensagem já existe");
            return;
        }
        else {
            await new Promise(r => setTimeout(r, parseInt(process.env.TIMEOUT_TO_IMPORT_MESSAGE) || 330));
        }
    }
    //  else {
    //   await new Promise(r => setTimeout(r, i * 150));
    //   i++
    // }
    if (!isValidMsg(msg)) {
        return;
    }
    // ✅ CORREÇÃO: Ignorar eventos de grupo (messageStubType)
    if (msg.messageStubType) {
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] HandleMessage - Ignorando evento de grupo: ${msg.messageStubType}`);
        }
        return;
    }
    try {
        let msgContact;
        let groupContact;
        let queueId = null;
        let tagsId = null;
        let userId = null;
        let bodyMessage = (0, exports.getBodyMessage)(msg);
        const msgType = getTypeMessage(msg);
        //if (msgType === "protocolMessage") return; // Tratar isso no futuro para excluir msgs se vor REVOKE
        const hasMedia = msg.message?.imageMessage ||
            msg.message?.audioMessage ||
            msg.message?.videoMessage ||
            msg.message?.stickerMessage ||
            msg.message?.documentMessage ||
            msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
            // msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
            // msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ||
            // msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage ||
            msg.message?.ephemeralMessage?.message?.audioMessage ||
            msg.message?.ephemeralMessage?.message?.documentMessage ||
            msg.message?.ephemeralMessage?.message?.videoMessage ||
            msg.message?.ephemeralMessage?.message?.stickerMessage ||
            msg.message?.ephemeralMessage?.message?.imageMessage ||
            msg.message?.viewOnceMessage?.message?.imageMessage ||
            msg.message?.viewOnceMessage?.message?.videoMessage ||
            msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
                ?.imageMessage ||
            msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
                ?.videoMessage ||
            msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
                ?.audioMessage ||
            msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
                ?.documentMessage ||
            msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
            msg.message?.templateMessage?.hydratedTemplate?.imageMessage ||
            msg.message?.templateMessage?.hydratedTemplate?.documentMessage ||
            msg.message?.templateMessage?.hydratedTemplate?.videoMessage ||
            msg.message?.templateMessage?.hydratedFourRowTemplate?.imageMessage ||
            msg.message?.templateMessage?.hydratedFourRowTemplate?.documentMessage ||
            msg.message?.templateMessage?.hydratedFourRowTemplate?.videoMessage ||
            msg.message?.templateMessage?.fourRowTemplate?.imageMessage ||
            msg.message?.templateMessage?.fourRowTemplate?.documentMessage ||
            msg.message?.templateMessage?.fourRowTemplate?.videoMessage ||
            msg.message?.interactiveMessage?.header?.imageMessage ||
            msg.message?.interactiveMessage?.header?.documentMessage ||
            msg.message?.interactiveMessage?.header?.videoMessage ||
            msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
                ?.documentMessage ||
            msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
                ?.videoMessage ||
            msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
                ?.imageMessage ||
            msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
                ?.locationMessage;
        // const isPrivate = /\u200d/.test(bodyMessage);
        // if (isPrivate) return;
        if (msg.key.fromMe) {
            if (/\u200e/.test(bodyMessage))
                return;
            if (!hasMedia &&
                msgType !== "conversation" &&
                msgType !== "extendedTextMessage" &&
                msgType !== "contactMessage" &&
                msgType !== "reactionMessage" &&
                msgType !== "ephemeralMessage" &&
                msgType !== "protocolMessage" &&
                msgType !== "viewOnceMessage" &&
                msgType !== "editedMessage" &&
                msgType !== "hydratedContentText")
                return;
            msgContact = await getContactMessage(msg, wbot);
        }
        else {
            msgContact = await getContactMessage(msg, wbot);
        }
        console.log("[DEBUG RODRIGO] msgContact", JSON.stringify(msgContact, null, 2));
        const isGroup = msg.key.remoteJid?.endsWith("@g.us");
        // IGNORAR MENSAGENS DE GRUPO
        // const msgIsGroupBlock = await Settings.findOne({
        //   where: { key: "CheckMsgIsGroup", companyId }
        // });
        // console.log("GETTING WHATSAPP SHOW WHATSAPP 2384", wbot.id, companyId)
        const whatsapp = await (0, ShowWhatsAppService_1.default)(wbot.id, companyId);
        if (!whatsapp.allowGroup && isGroup)
            return;
        if (isGroup) {
            let grupoMeta = null;
            try {
                grupoMeta = await (0, RedisGroupCache_1.getGroupMetadataCache)(whatsapp.id, msg.key.remoteJid);
            }
            catch (error) {
                logger_1.default.error(`Erro ao obter metadados do grupo: ${JSON.stringify(error)}`);
            }
            if (!grupoMeta) {
                try {
                    await (0, RedisGroupCache_1.updateGroupMetadataCache)(whatsapp.id, msg.key.remoteJid);
                    grupoMeta = await (0, RedisGroupCache_1.getGroupMetadataCache)(whatsapp.id, msg.key.remoteJid);
                }
                catch (error) {
                    logger_1.default.error(`Erro ao atualizar cache do grupo: ${JSON.stringify(error)}`);
                }
            }
            if (grupoMeta === undefined || grupoMeta === null || !grupoMeta?.id) {
                try {
                    grupoMeta = await wbot.groupMetadata(msg.key.remoteJid);
                }
                catch (error) {
                    logger_1.default.error(`Erro ao obter metadados do grupo: ${JSON.stringify(error)}`);
                    return;
                }
            }
            const msgGroupContact = {
                id: grupoMeta.id,
                name: grupoMeta.subject
            };
            groupContact = await (0, verifyContact_1.verifyContact)(msgGroupContact, wbot, companyId);
            if (!groupContact) {
                logger_1.default.info("Grupo não encontrado, buscando novamente no banco de dados...");
                groupContact = await Contact_1.default.findOne({
                    where: {
                        companyId,
                        [sequelize_1.Op.or]: [
                            { number: msg.key.remoteJid.replace(/\D/g, '') },
                            { number: msg.key.remoteJid.replace('@g.us', '') },
                            { lid: msg.key.remoteJid.replace('@s.whatsapp.net', '') }
                        ]
                    }
                });
                if (!groupContact) {
                    logger_1.default.info("Grupo não encontrado, descarta a mensagem para não abrir como contato...");
                    return;
                }
            }
        }
        const contact = await (0, verifyContact_1.verifyContact)(msgContact, wbot, companyId);
        let unreadMessages = 0;
        if (msg.key.fromMe) {
            await cache_1.default.set(`contacts:${contact.id}:unreads`, "0");
        }
        else {
            const unreads = await cache_1.default.get(`contacts:${contact.id}:unreads`);
            unreadMessages = +unreads + 1;
            await cache_1.default.set(`contacts:${contact.id}:unreads`, `${unreadMessages}`);
        }
        const settings = await CompaniesSettings_1.default.findOne({
            where: { companyId }
        });
        const enableLGPD = settings.enableLGPD === "enabled";
        // contador
        // if (msg.key.fromMe && count?.unreadCount > 0) {
        //   let remoteJid = msg.key.remoteJid;
        //   SendAckBYRemoteJid({ remoteJid, companyId });
        // }
        const isFirstMsg = await Ticket_1.default.findOne({
            where: {
                contactId: groupContact ? groupContact.id : contact.id,
                companyId,
                whatsappId: whatsapp.id
            },
            order: [["id", "DESC"]]
        });
        const mutex = new async_mutex_1.Mutex();
        // Inclui a busca de ticket aqui, se realmente não achar um ticket, então vai para o findorcreate
        const ticket = await mutex.runExclusive(async () => {
            const result = await (0, FindOrCreateTicketService_1.default)(contact, whatsapp, unreadMessages, companyId, queueId, userId, groupContact, "whatsapp", isImported, false, settings);
            return result;
        });
        const ticketTraking = await (0, FindOrCreateATicketTrakingService_1.default)({
            ticketId: ticket.id,
            companyId,
            userId,
            whatsappId: whatsapp?.id
        });
        let bodyRollbackTag = "";
        let bodyNextTag = "";
        let rollbackTag;
        let nextTag;
        let ticketTag = undefined;
        // console.log(ticket.id)
        if (ticket?.company?.plan?.useKanban) {
            ticketTag = await TicketTag_1.default.findOne({
                where: {
                    ticketId: ticket.id
                }
            });
            if (ticketTag) {
                const tag = await Tag_1.default.findByPk(ticketTag.tagId);
                if (tag.nextLaneId) {
                    nextTag = await Tag_1.default.findByPk(tag.nextLaneId);
                    bodyNextTag = nextTag.greetingMessageLane;
                }
                if (tag.rollbackLaneId) {
                    rollbackTag = await Tag_1.default.findByPk(tag.rollbackLaneId);
                    bodyRollbackTag = rollbackTag.greetingMessageLane;
                }
            }
        }
        if (ticket.status === "closed" ||
            (unreadMessages === 0 &&
                whatsapp.complationMessage &&
                (0, Mustache_1.default)(whatsapp.complationMessage, ticket) === bodyMessage)) {
            return;
        }
        if (rollbackTag &&
            (0, Mustache_1.default)(bodyNextTag, ticket) !== bodyMessage &&
            (0, Mustache_1.default)(bodyRollbackTag, ticket) !== bodyMessage) {
            await TicketTag_1.default.destroy({
                where: { ticketId: ticket.id, tagId: ticketTag.tagId }
            });
            await TicketTag_1.default.create({ ticketId: ticket.id, tagId: rollbackTag.id });
        }
        if (isImported) {
            await ticket.update({
                queueId: whatsapp.queueIdImportMessages
            });
        }
        if (msgType === "editedMessage" || msgType === "protocolMessage") {
            const msgKeyIdEdited = msgType === "editedMessage"
                ? msg.message.editedMessage.message.protocolMessage.key.id
                : msg.message?.protocolMessage.key.id;
            let bodyEdited = findCaption(msg.message);
            // console.log("bodyEdited", bodyEdited)
            const io = (0, socket_1.getIO)();
            try {
                const messageToUpdate = await Message_1.default.findOne({
                    where: {
                        wid: msgKeyIdEdited,
                        companyId,
                        ticketId: ticket.id
                    }
                });
                if (!messageToUpdate)
                    return;
                await messageToUpdate.update({ isEdited: true, body: bodyEdited });
                await ticket.update({ lastMessage: bodyEdited });
                io.of(String(companyId))
                    // .to(String(ticket.id))
                    .emit(`company-${companyId}-appMessage`, {
                    action: "update",
                    message: messageToUpdate
                });
                io.of(String(companyId))
                    // .to(ticket.status)
                    // .to("notification")
                    // .to(String(ticket.id))
                    .emit(`company-${companyId}-ticket`, {
                    action: "update",
                    ticket
                });
            }
            catch (err) {
                Sentry.captureException(err);
                logger_1.default.error(`Error handling message ack. Err: ${err}`);
            }
            return;
        }
        //const ticketTraking = await FindOrCreateATicketTrakingService({
        //  ticketId: ticket.id,
        //  companyId,
        //  userId,
        //  whatsappId: whatsapp?.id
        //});
        let useLGPD = false;
        try {
            if (!msg.key.fromMe) {
                //MENSAGEM DE FÉRIAS COLETIVAS
                if (!(0, lodash_1.isNil)(whatsapp.collectiveVacationMessage && !isGroup)) {
                    const currentDate = (0, moment_1.default)();
                    if (currentDate.isBetween((0, moment_1.default)(whatsapp.collectiveVacationStart), (0, moment_1.default)(whatsapp.collectiveVacationEnd))) {
                        if (hasMedia) {
                            await (0, exports.verifyMediaMessage)(msg, ticket, contact, ticketTraking, false, false, wbot);
                        }
                        else {
                            await (0, exports.verifyMessage)(msg, ticket, contact, ticketTraking);
                        }
                        wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket.contact), {
                            text: whatsapp.collectiveVacationMessage
                        });
                        return;
                    }
                }
                /**
                 * Tratamento para avaliação do atendente
                 */
                if (ticket.status === "nps" &&
                    ticketTraking !== null &&
                    (0, exports.verifyRating)(ticketTraking)) {
                    if (hasMedia) {
                        await (0, exports.verifyMediaMessage)(msg, ticket, contact, ticketTraking, false, false, wbot);
                    }
                    else {
                        await (0, exports.verifyMessage)(msg, ticket, contact, ticketTraking);
                    }
                    if (!isNaN(parseFloat(bodyMessage))) {
                        (0, exports.handleRating)(parseFloat(bodyMessage), ticket, ticketTraking);
                        await ticketTraking.update({
                            ratingAt: (0, moment_1.default)().toDate(),
                            finishedAt: (0, moment_1.default)().toDate(),
                            rated: true
                        });
                        return;
                    }
                    else {
                        if (ticket.amountUsedBotQueuesNPS < whatsapp.maxUseBotQueuesNPS) {
                            let bodyErrorRating = `\u200eOpção inválida, tente novamente.\n`;
                            const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                                text: bodyErrorRating
                            });
                            await (0, exports.verifyMessage)(sentMessage, ticket, contact, ticketTraking);
                            await (0, baileys_1.delay)(1000);
                            let bodyRatingMessage = `\u200e${whatsapp.ratingMessage}\n`;
                            const msg = await (0, SendWhatsAppMessage_1.default)({
                                body: bodyRatingMessage,
                                ticket
                            });
                            await (0, exports.verifyMessage)(msg, ticket, ticket.contact);
                            await ticket.update({
                                amountUsedBotQueuesNPS: ticket.amountUsedBotQueuesNPS + 1
                            });
                        }
                        return;
                    }
                }
                //TRATAMENTO LGPD
                if (enableLGPD &&
                    ticket.status === "lgpd" &&
                    !isImported &&
                    !msg.key.fromMe) {
                    if (hasMedia) {
                        await (0, exports.verifyMediaMessage)(msg, ticket, contact, ticketTraking, false, false, wbot);
                    }
                    else {
                        await (0, exports.verifyMessage)(msg, ticket, contact, ticketTraking);
                    }
                    useLGPD = true;
                    if ((0, lodash_1.isNil)(ticket.lgpdAcceptedAt) &&
                        !(0, lodash_1.isNil)(ticket.lgpdSendMessageAt)) {
                        let choosenOption = parseFloat(bodyMessage);
                        //Se digitou opção numérica
                        if (!Number.isNaN(choosenOption) &&
                            Number.isInteger(choosenOption) &&
                            !(0, lodash_1.isNull)(choosenOption) &&
                            choosenOption > 0) {
                            //Se digitou 1, aceitou o termo e vai pro bot
                            if (choosenOption === 1) {
                                await contact.update({
                                    lgpdAcceptedAt: (0, moment_1.default)().toDate()
                                });
                                await ticket.update({
                                    lgpdAcceptedAt: (0, moment_1.default)().toDate(),
                                    amountUsedBotQueues: 0,
                                    isBot: true
                                    // status: "pending"
                                });
                                //Se digitou 2, recusou o bot e encerra chamado
                            }
                            else if (choosenOption === 2) {
                                if (whatsapp.complationMessage !== "" &&
                                    whatsapp.complationMessage !== undefined) {
                                    const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                                        text: `\u200e ${whatsapp.complationMessage}`
                                    });
                                    await (0, exports.verifyMessage)(sentMessage, ticket, contact, ticketTraking);
                                }
                                await ticket.update({
                                    status: "closed",
                                    amountUsedBotQueues: 0
                                });
                                await ticketTraking.destroy;
                                return;
                                //se digitou qualquer opção que não seja 1 ou 2 limpa o lgpdSendMessageAt para
                                //enviar de novo o bot respeitando o numero máximo de vezes que o bot é pra ser enviado
                            }
                            else {
                                if (ticket.amountUsedBotQueues < whatsapp.maxUseBotQueues &&
                                    whatsapp.maxUseBotQueues > 0) {
                                    await ticket.update({
                                        amountUsedBotQueues: ticket.amountUsedBotQueues + 1,
                                        lgpdSendMessageAt: null
                                    });
                                }
                            }
                            //se digitou qualquer opção que não número o lgpdSendMessageAt para
                            //enviar de novo o bot respeitando o numero máximo de vezes que o bot é pra ser enviado
                        }
                        else {
                            if ((ticket.amountUsedBotQueues < whatsapp.maxUseBotQueues &&
                                whatsapp.maxUseBotQueues > 0) ||
                                whatsapp.maxUseBotQueues === 0) {
                                await ticket.update({
                                    amountUsedBotQueues: ticket.amountUsedBotQueues + 1,
                                    lgpdSendMessageAt: null
                                });
                            }
                        }
                    }
                    if ((contact.lgpdAcceptedAt === null ||
                        settings?.lgpdConsent === "enabled") &&
                        !contact.isGroup &&
                        (0, lodash_1.isNil)(ticket.lgpdSendMessageAt) &&
                        (whatsapp.maxUseBotQueues === 0 ||
                            ticket.amountUsedBotQueues <= whatsapp.maxUseBotQueues) &&
                        !(0, lodash_1.isNil)(settings?.lgpdMessage)) {
                        if (!(0, lodash_1.isNil)(settings?.lgpdMessage) && settings.lgpdMessage !== "") {
                            const bodyMessageLGPD = (0, Mustache_1.default)(`\u200e ${settings?.lgpdMessage}`, ticket);
                            const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                                text: bodyMessageLGPD
                            });
                            wbot.store(sentMessage);
                            await (0, exports.verifyMessage)(sentMessage, ticket, contact, ticketTraking);
                        }
                        await (0, baileys_1.delay)(1000);
                        if (!(0, lodash_1.isNil)(settings?.lgpdLink) && settings?.lgpdLink !== "") {
                            const bodyLink = (0, Mustache_1.default)(`\u200e ${settings?.lgpdLink}`, ticket);
                            const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                                text: bodyLink
                            });
                            wbot.store(sentMessage);
                            await (0, exports.verifyMessage)(sentMessage, ticket, contact, ticketTraking);
                        }
                        await (0, baileys_1.delay)(1000);
                        const bodyBot = (0, Mustache_1.default)(`\u200e Estou ciente sobre o tratamento dos meus dados pessoais. \n\n*[1]* Sim\n*[2]* Não`, ticket);
                        const sentMessageBot = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                            text: bodyBot
                        });
                        wbot.store(sentMessageBot);
                        await (0, exports.verifyMessage)(sentMessageBot, ticket, contact, ticketTraking);
                        await ticket.update({
                            lgpdSendMessageAt: (0, moment_1.default)().toDate(),
                            amountUsedBotQueues: ticket.amountUsedBotQueues + 1
                        });
                        await ticket.reload();
                        return;
                    }
                    if (!(0, lodash_1.isNil)(ticket.lgpdSendMessageAt) && (0, lodash_1.isNil)(ticket.lgpdAcceptedAt))
                        return;
                }
            }
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        const isMsgForwarded = msg.message?.extendedTextMessage?.contextInfo?.isForwarded ||
            msg.message?.imageMessage?.contextInfo?.isForwarded ||
            msg.message?.audioMessage?.contextInfo?.isForwarded ||
            msg.message?.videoMessage?.contextInfo?.isForwarded ||
            msg.message?.documentMessage?.contextInfo?.isForwarded;
        let mediaSent;
        if (!useLGPD) {
            if (hasMedia) {
                mediaSent = await (0, exports.verifyMediaMessage)(msg, ticket, contact, ticketTraking, isMsgForwarded, false, wbot);
                // Transferência automática para o agente ao receber imagem/foto
                const msgType = getTypeMessage(msg);
                // if (
                //   (msgType === "imageMessage" ||
                //     msgType === "videoMessage" ||
                //     msgType === "documentMessage" ||
                //     msgType === "documentWithCaptionMessage" ||
                //     // msgType === "audioMessage" ||
                //     msgType === "stickerMessage") &&
                //   whatsapp.prompt &&
                //   whatsapp.prompt.queueId
                // ) {
                //   await transferQueue(whatsapp.prompt.queueId, ticket, contact);
                // }
            }
            else {
                // console.log("antes do verifyMessage")
                await (0, exports.verifyMessage)(msg, ticket, contact, ticketTraking, false, isMsgForwarded);
            }
        }
        // Atualiza o ticket se a ultima mensagem foi enviada por mim, para que possa ser finalizado.
        try {
            await ticket.update({
                fromMe: msg.key.fromMe
            });
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        let currentSchedule;
        if (settings.scheduleType === "company") {
            currentSchedule = await (0, VerifyCurrentSchedule_1.default)(companyId, 0, 0);
        }
        else if (settings.scheduleType === "connection") {
            currentSchedule = await (0, VerifyCurrentSchedule_1.default)(companyId, 0, whatsapp.id);
        }
        try {
            if (!msg.key.fromMe &&
                settings.scheduleType &&
                (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
                !["open", "group"].includes(ticket.status)) {
                /**
                 * Tratamento para envio de mensagem quando a empresa está fora do expediente
                 */
                if ((settings.scheduleType === "company" ||
                    settings.scheduleType === "connection") &&
                    !(0, lodash_1.isNil)(currentSchedule) &&
                    (!currentSchedule || currentSchedule.inActivity === false)) {
                    if (whatsapp.maxUseBotQueues &&
                        whatsapp.maxUseBotQueues !== 0 &&
                        ticket.amountUsedBotQueues >= whatsapp.maxUseBotQueues) {
                        // await UpdateTicketService({
                        //   ticketData: { queueId: queues[0].id },
                        //   ticketId: ticket.id
                        // });
                        return;
                    }
                    if (whatsapp.timeUseBotQueues !== "0") {
                        if (ticket.isOutOfHour === false &&
                            ticketTraking.chatbotAt !== null) {
                            await ticketTraking.update({
                                chatbotAt: null
                            });
                            await ticket.update({
                                amountUsedBotQueues: 0
                            });
                        }
                        //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
                        let dataLimite = new Date();
                        let Agora = new Date();
                        if (ticketTraking.chatbotAt !== null) {
                            dataLimite.setMinutes(ticketTraking.chatbotAt.getMinutes() +
                                Number(whatsapp.timeUseBotQueues));
                            if (ticketTraking.chatbotAt !== null &&
                                Agora < dataLimite &&
                                whatsapp.timeUseBotQueues !== "0" &&
                                ticket.amountUsedBotQueues !== 0) {
                                return;
                            }
                        }
                        await ticketTraking.update({
                            chatbotAt: null
                        });
                    }
                    if (whatsapp.outOfHoursMessage !== "" && !ticket.imported) {
                        // console.log("entrei");
                        const body = (0, Mustache_1.default)(`${whatsapp.outOfHoursMessage}`, ticket);
                        const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                            const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                                text: body
                            });
                            wbot.store(sentMessage);
                        }, 1000, ticket.id);
                        debouncedSentMessage();
                    }
                    //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
                    await ticket.update({
                        isOutOfHour: true,
                        amountUsedBotQueues: ticket.amountUsedBotQueues + 1
                    });
                    return;
                }
            }
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        if (!msg.key.fromMe && !ticket.imported && !isGroup && ticket.isBot !== false) {
            // Verificar se ticket.integrationId existe antes de continuar
            if (!ticket.integrationId) {
                logger_1.default.info("[HANDLE MESSAGE] Ticket sem integração, pulando verificação de campanhas");
            }
            else {
                console.log("[HANDLE MESSAGE] Verificando campanhas de fluxo...");
                const contactForCampaign = await (0, ShowContactService_1.default)(ticket.contactId, ticket.companyId);
                try {
                    const queueIntegrations = await (0, ShowQueueIntegrationService_1.default)(ticket.integrationId, companyId);
                    // ✅ EXECUTAR CAMPANHA APENAS UMA VEZ
                    campaignExecuted = await (0, exports.flowbuilderIntegration)(msg, wbot, companyId, queueIntegrations, ticket, contactForCampaign, null, null);
                    if (campaignExecuted) {
                        console.log("[RDS-4121 - HANDLE MESSAGE] ✅ Campanha executada, parando outros fluxos");
                        return;
                    }
                }
                catch (error) {
                    console.error("[RDS-4125 HANDLE MESSAGE] Erro ao verificar campanhas:", error);
                }
            }
        }
        // ✅ PRIORIDADE 1: Verificar se ticket está em modo IA (permanente ou temporário)
        // ✅ CORRIGIDO: IA deve parar quando ticket é aceito (status = "open" ou isBot = false)
        if (!msg.key.fromMe && ticket.useIntegration && ticket.status !== "open" && ticket.isBot !== false) {
            const dataWebhook = ticket.dataWebhook;
            const isAIMode = dataWebhook?.type === "openai" || dataWebhook?.type === "gemini";
            if (isAIMode && dataWebhook?.settings) {
                logger_1.default.info(`[AI MODE] Processando mensagem em modo ${dataWebhook.type} - ticket ${ticket.id}`);
                try {
                    const aiSettings = {
                        ...dataWebhook.settings,
                        provider: dataWebhook.type
                    };
                    // ✅ VERIFICAR SE É A PRIMEIRA RESPOSTA DO USUÁRIO APÓS BOAS-VINDAS
                    if (dataWebhook.awaitingUserResponse) {
                        logger_1.default.info(`[AI SERVICE] Primeira resposta do usuário para ${dataWebhook.type} - iniciando conversa - ticket ${ticket.id}`);
                        // ✅ REMOVER FLAG - AGORA A CONVERSA ESTÁ ATIVA
                        await ticket.update({
                            dataWebhook: {
                                ...dataWebhook,
                                awaitingUserResponse: false
                            }
                        });
                    }
                    // ✅ PROCESSAR MENSAGEM ATRAVÉS DA IA
                    await (0, OpenAiService_1.handleOpenAiFlow)(aiSettings, msg, wbot, ticket, contact, mediaSent, ticketTraking);
                    return; // ✅ IMPORTANTE: RETORNAR PARA NÃO PROCESSAR OUTRAS LÓGICAS
                }
                catch (error) {
                    logger_1.default.error("[AI MODE] Erro ao processar modo IA:", error);
                }
            }
        }
        const wasProcessedByTemporaryAI = await checkTemporaryAI(wbot, ticket, contact, msgContact, null, ticketTraking, msg);
        if (wasProcessedByTemporaryAI) {
            return;
        }
        if (!msg.key.fromMe &&
            (
            // Caminho padrão: aguardando input explicitamente
            (ticket.dataWebhook?.waitingInput === true &&
                ticket.dataWebhook?.inputVariableName)
                ||
                    // Fallback resiliente: houve perda do flag, mas temos ponteiro de próximo nó e variável
                    (ticket.dataWebhook?.nextNodeId &&
                        ticket.dataWebhook?.inputVariableName))) {
            logger_1.default.info(`[INPUT NODE] Processando resposta para nó de input - ticket ${ticket.id}`);
            try {
                console.log("[inputNode] Processando resposta para nó de input");
                const body = (0, exports.getBodyMessage)(msg);
                // @ts-ignore
                const inputVariableName = ticket.dataWebhook.inputVariableName;
                // @ts-ignore
                const inputIdentifier = ticket.dataWebhook.inputIdentifier ||
                    `${ticket.id}_${inputVariableName}`;
                global.flowVariables = global.flowVariables || {};
                global.flowVariables[inputVariableName] = body;
                global.flowVariables[inputIdentifier] = body; // Salvar com o identificador também
                const nextNode = global.flowVariables[`${inputIdentifier}_next`];
                // Fallback: se o ponteiro em memória não existir, usa o salvo no ticket
                // @ts-ignore
                const fallbackNextNode = ticket.dataWebhook?.nextNodeId;
                const resolvedNextNode = nextNode || fallbackNextNode;
                // delete global.flowVariables[`${inputIdentifier}_next`];
                await ticket.update({
                    dataWebhook: {
                        ...ticket.dataWebhook,
                        waitingInput: false,
                        inputProcessed: true,
                        inputVariableName: null,
                        inputIdentifier: null,
                        lastInputValue: body
                    }
                });
                // Fallback de flowId: se flowStopped estiver ausente, tenta pegar de dataWebhook.flowId
                // @ts-ignore
                const resolvedFlowId = ticket.flowStopped || ticket.dataWebhook?.flowId;
                if (resolvedNextNode && resolvedFlowId) {
                    const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
                        where: { id: resolvedFlowId }
                    });
                    if (flow) {
                        const nodes = flow.flow["nodes"];
                        const connections = flow.flow["connections"];
                        const mountDataContact = {
                            number: contact.number,
                            name: contact.name,
                            email: contact.email
                        };
                        await (0, ActionsWebhookService_1.ActionsWebhookService)(whatsapp.id, parseInt(String(resolvedFlowId)), ticket.companyId, nodes, connections, resolvedNextNode, null, "", ticket.hashFlowId || "", null, ticket.id, mountDataContact, true // inputResponded true somete para node  input
                        );
                        return;
                    }
                }
            }
            catch (error) {
                console.error("[inputNode] Erro ao processar resposta do nó de input:", error);
            }
        }
        if (ticket.flowStopped && ticket.lastFlowId) {
            // ✅ CRÍTICO: Não processar mensagens do próprio bot
            if (msg && msg.key.fromMe) {
                logger_1.default.info(`[FLOW STOPPED] ⚠️ Mensagem do bot (fromMe=true) - IGNORANDO para ticket ${ticket.id}`);
                return;
            }
            logger_1.default.info(`[FLOW STOPPED] ========== CONTINUANDO FLUXO (SEGUNDA VERIFICAÇÃO) ==========`);
            logger_1.default.info(`[FLOW STOPPED] Ticket ${ticket.id}, Mensagem do usuário: "${(0, exports.getBodyMessage)(msg)}"`);
            await flowBuilderQueue(ticket, msg, wbot, whatsapp, companyId, contact, ticket);
            return;
        }
        if (ticket.status !== "open" &&
            !isGroup &&
            !msg.key.fromMe &&
            !ticket.fromMe &&
            ticket.flowStopped &&
            ticket.flowWebhook &&
            !isNaN(parseInt(ticket.lastMessage))) {
            await flowBuilderQueue(ticket, msg, wbot, whatsapp, companyId, contact, isFirstMsg);
        }
        //openai na conexao
        if (ticket.status !== "open" &&
            !ticket.imported &&
            !ticket.queue &&
            !isGroup &&
            !msg.key.fromMe &&
            !ticket.userId &&
            !(0, lodash_1.isNil)(whatsapp.promptId)) {
            await handleOpenAi(msg, wbot, ticket, contact, mediaSent, ticketTraking);
        }
        //integração na conexão: iniciar APENAS apos CPF no caso de SGP
        if (ticket.status !== "open" &&
            !ticket.imported &&
            !msg.key.fromMe &&
            !ticket.isGroup &&
            !ticket.queue &&
            !ticket.user &&
            !(0, lodash_1.isNil)(whatsapp.integrationId)
        //ticket.isBot &&
        //!isNil(whatsapp.integrationId) &&
        //ticket.useIntegration
        ) {
            const integrations = await (0, ShowQueueIntegrationService_1.default)(whatsapp.integrationId, companyId);
            if (String(integrations.type).toUpperCase() === "SGP") {
                // Não iniciar integração agora; apenas marcar integração no ticket
                if (msg.key.fromMe) {
                    await ticket.update({
                        typebotSessionTime: (0, moment_1.default)().toDate(),
                        useIntegration: true,
                        integrationId: integrations.id
                    });
                }
                else {
                    await ticket.update({
                        useIntegration: true,
                        integrationId: integrations.id
                    });
                }
                // Não retorna; segue fluxo padrão (saudação etc.)
            }
            else {
                await (0, exports.handleMessageIntegration)(msg, wbot, companyId, integrations, ticket);
                if (msg.key.fromMe) {
                    await ticket.update({
                        typebotSessionTime: (0, moment_1.default)().toDate(),
                        useIntegration: true,
                        integrationId: integrations.id
                    });
                }
                else {
                    await ticket.update({
                        useIntegration: true,
                        integrationId: integrations.id
                    });
                }
                return;
            }
        }
        if (!ticket.imported &&
            !msg.key.fromMe &&
            !ticket.isGroup &&
            !ticket.userId &&
            ticket.integrationId &&
            ticket.useIntegration) {
            const integrations = await (0, ShowQueueIntegrationService_1.default)(ticket.integrationId, companyId);
            await (0, exports.handleMessageIntegration)(msg, wbot, companyId, integrations, ticket);
            if (msg.key.fromMe) {
                await ticket.update({
                    typebotSessionTime: (0, moment_1.default)().toDate()
                });
            }
        }
        if (!ticket.imported &&
            !ticket.queue &&
            (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
            !msg.key.fromMe &&
            !ticket.userId &&
            whatsapp.queues.length >= 1 &&
            !ticket.useIntegration) {
            // console.log("antes do verifyqueue")
            await verifyQueue(wbot, msg, ticket, contact, settings, ticketTraking);
            if (ticketTraking.chatbotAt === null) {
                await ticketTraking.update({
                    chatbotAt: (0, moment_1.default)().toDate()
                });
            }
        }
        if (ticket.queueId > 0) {
            await ticketTraking.update({
                queueId: ticket.queueId
            });
        }
        // Verificação se aceita audio do contato
        if (getTypeMessage(msg) === "audioMessage" &&
            !msg.key.fromMe &&
            (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
            (!contact?.acceptAudioMessage ||
                settings?.acceptAudioMessageContact === "disabled")) {
            const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket.contact), {
                text: `\u200e*Assistente Virtual*:\nInfelizmente não conseguimos escutar nem enviar áudios por este canal de atendimento, por favor, envie uma mensagem de *texto*.`
            }, {
                quoted: {
                    key: msg.key,
                    message: {
                        extendedTextMessage: msg.message.extendedTextMessage
                    }
                }
            });
            wbot.store(sentMessage);
            await (0, exports.verifyMessage)(sentMessage, ticket, contact, ticketTraking);
        }
        try {
            if (!msg.key.fromMe &&
                settings?.scheduleType &&
                ticket.queueId !== null &&
                (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
                ticket.status !== "open") {
                /**
                 * Tratamento para envio de mensagem quando a empresa/fila está fora do expediente
                 */
                const queue = await Queue_1.default.findByPk(ticket.queueId);
                if (settings?.scheduleType === "queue") {
                    currentSchedule = await (0, VerifyCurrentSchedule_1.default)(companyId, queue.id, 0);
                }
                if (settings?.scheduleType === "queue" &&
                    !(0, lodash_1.isNil)(currentSchedule) &&
                    ticket.amountUsedBotQueues < whatsapp.maxUseBotQueues &&
                    (!currentSchedule || currentSchedule.inActivity === false) &&
                    !ticket.imported) {
                    if (Number(whatsapp.timeUseBotQueues) > 0) {
                        if (ticket.isOutOfHour === false &&
                            ticketTraking.chatbotAt !== null) {
                            await ticketTraking.update({
                                chatbotAt: null
                            });
                            await ticket.update({
                                amountUsedBotQueues: 0
                            });
                        }
                        //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
                        let dataLimite = new Date();
                        let Agora = new Date();
                        if (ticketTraking.chatbotAt !== null) {
                            dataLimite.setMinutes(ticketTraking.chatbotAt.getMinutes() +
                                Number(whatsapp.timeUseBotQueues));
                            if (ticketTraking.chatbotAt !== null &&
                                Agora < dataLimite &&
                                whatsapp.timeUseBotQueues !== "0" &&
                                ticket.amountUsedBotQueues !== 0) {
                                return;
                            }
                        }
                        await ticketTraking.update({
                            chatbotAt: null
                        });
                    }
                    const outOfHoursMessage = queue.outOfHoursMessage;
                    if (outOfHoursMessage !== "") {
                        // console.log("entrei2");
                        const body = (0, Mustache_1.default)(`${outOfHoursMessage}`, ticket);
                        const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                            const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), {
                                text: body
                            });
                            wbot.store(sentMessage);
                        }, 1000, ticket.id);
                        debouncedSentMessage();
                    }
                    //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
                    await ticket.update({
                        isOutOfHour: true,
                        amountUsedBotQueues: ticket.amountUsedBotQueues + 1
                    });
                    return;
                }
            }
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        if (ticket.queue &&
            ticket.queueId &&
            !msg.key.fromMe &&
            !ticket.useIntegration &&
            !ticket.integrationId) {
            // ✅ CORRIGIDO: Executar ChatBot apenas se ticket não estiver "open" (aceito por atendente)
            if (ticket.status !== "open" && ticket.queue?.chatbots?.length > 0) {
                await (0, ChatBotListener_1.sayChatbot)(ticket.queueId, wbot, ticket, contact, msg, ticketTraking);
            }
            //atualiza mensagem para indicar que houve atividade e aí contar o tempo novamente para enviar mensagem de inatividade
            await ticket.update({
                sendInactiveMessage: false
            });
        }
        if (!campaignExecuted && // ✅ NOVA CONDIÇÃO
            !msg.key.fromMe &&
            !ticket.imported &&
            !isGroup &&
            ticket.status === "pending") {
            // Aguardar um pouco para garantir que outros processamentos terminaram
            setTimeout(async () => {
                try {
                    logger_1.default.info(`[TICKET RELOAD] ========== ANTES DO RELOAD ==========`);
                    logger_1.default.info(`[TICKET RELOAD] Ticket ${ticket.id} - flowWebhook: ${ticket.flowWebhook}, lastFlowId: ${ticket.lastFlowId}, hashFlowId: ${ticket.hashFlowId}`);
                    await ticket.reload({
                        include: [{ model: Contact_1.default, as: "contact" }]
                    });
                    logger_1.default.info(`[TICKET RELOAD] ========== DEPOIS DO RELOAD ==========`);
                    logger_1.default.info(`[TICKET RELOAD] Ticket ${ticket.id} - flowWebhook: ${ticket.flowWebhook}, lastFlowId: ${ticket.lastFlowId}, hashFlowId: ${ticket.hashFlowId}`);
                    // Só verificar se não entrou em fluxo
                    if (!ticket.flowWebhook || !ticket.lastFlowId) {
                        logger_1.default.info(`[TICKET RELOAD] Condição (!flowWebhook || !lastFlowId) = TRUE - vai executar flowbuilderIntegration`);
                    }
                    else {
                        logger_1.default.info(`[TICKET RELOAD] Condição (!flowWebhook || !lastFlowId) = FALSE - NÃO vai executar flowbuilderIntegration`);
                        logger_1.default.info(`[TICKET RELOAD] Ticket já está em fluxo - ignorando`);
                        return;
                    }
                    if (!ticket.flowWebhook || !ticket.lastFlowId) {
                        const contactForCampaign = await (0, ShowContactService_1.default)(ticket.contactId, ticket.companyId);
                        // Verificar se existe integrationId antes de prosseguir
                        try {
                            if (!whatsapp.integrationId) {
                                logger_1.default.info("[RDS-4573 - DEBUG] whatsapp.integrationId não está definido para a conexão WhatsApp ID: " + whatsapp.id);
                                return; // Encerrar execução se não houver integrationId
                            }
                            const queueIntegrations = await (0, ShowQueueIntegrationService_1.default)(whatsapp.integrationId, companyId);
                            // DEBUG - Verificar tipo de integração para diagnóstico
                            logger_1.default.info(`[RDS-FLOW-DEBUG] Iniciando flowbuilder para ticket ${ticket.id}, integração tipo: ${queueIntegrations?.type || 'indefinido'}`);
                            // ✅ VERIFICAÇÃO FINAL APENAS SE NECESSÁRIO
                            await (0, exports.flowbuilderIntegration)(msg, wbot, companyId, queueIntegrations, ticket, contactForCampaign);
                            // DEBUG - Verificar se flowbuilder foi executado com sucesso
                            logger_1.default.info(`[RDS-FLOW-DEBUG] flowbuilderIntegration executado para ticket ${ticket.id}`);
                        }
                        catch (integrationError) {
                            logger_1.default.error("[RDS-4573 - INTEGRATION ERROR] Erro ao processar integração:", integrationError);
                        }
                    }
                }
                catch (error) {
                    logger_1.default.error("[RDS-4573 - CAMPAIGN MESSAGE] Erro ao verificar campanhas:", error);
                }
            }, 1000);
        }
        await ticket.reload();
    }
    catch (err) {
        Sentry.captureException(err);
        console.log(err);
        logger_1.default.error(`Error handling whatsapp message: Err: ${err}`);
    }
};
exports.handleMessage = handleMessage;
const handleMsgAck = async (msg, chat) => {
    await new Promise(r => setTimeout(r, 500));
    const io = (0, socket_1.getIO)();
    try {
        const messageToUpdate = await Message_1.default.findOne({
            where: {
                wid: msg.key.id,
                fromMe: msg.key.fromMe
            },
            include: [
                "contact",
                {
                    model: Ticket_1.default,
                    as: "ticket",
                    include: [
                        {
                            model: Contact_1.default,
                            attributes: [
                                "id",
                                "name",
                                "number",
                                "email",
                                "profilePicUrl",
                                "acceptAudioMessage",
                                "active",
                                "urlPicture",
                                "companyId"
                            ],
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
        if (!messageToUpdate || messageToUpdate.ack >= chat)
            return;
        // console.log("messageToUpdate", messageToUpdate.body, messageToUpdate.ack, chat)
        await messageToUpdate.update({ ack: chat });
        io.of(messageToUpdate.companyId.toString())
            // .to(messageToUpdate.ticketId.toString())
            .emit(`company-${messageToUpdate.companyId}-appMessage`, {
            action: "update",
            message: messageToUpdate
        });
    }
    catch (err) {
        Sentry.captureException(err);
        logger_1.default.error(`Error handling message ack. Err: ${err}`);
    }
};
exports.handleMsgAck = handleMsgAck;
const verifyRecentCampaign = async (message, companyId) => {
    if (!isValidMsg(message)) {
        return;
    }
    if (!message.key.fromMe) {
        const number = message.key.remoteJid.replace(/\D/g, "");
        const campaigns = await Campaign_1.default.findAll({
            where: { companyId, status: "EM_ANDAMENTO", confirmation: true }
        });
        if (campaigns) {
            const ids = campaigns.map(c => c.id);
            const campaignShipping = await CampaignShipping_1.default.findOne({
                where: {
                    campaignId: { [sequelize_1.Op.in]: ids },
                    number,
                    confirmation: null,
                    deliveredAt: { [sequelize_1.Op.ne]: null }
                }
            });
            if (campaignShipping) {
                await campaignShipping.update({
                    confirmedAt: (0, moment_1.default)(),
                    confirmation: true
                });
                await queues_1.campaignQueue.add("DispatchCampaign", {
                    campaignShippingId: campaignShipping.id,
                    campaignId: campaignShipping.campaignId
                }, {
                    delay: (0, queues_1.parseToMilliseconds)((0, queues_1.randomValue)(0, 10))
                });
            }
        }
    }
};
const verifyCampaignMessageAndCloseTicket = async (message, companyId, wbot) => {
    if (!isValidMsg(message)) {
        return;
    }
    const io = (0, socket_1.getIO)();
    const body = await (0, exports.getBodyMessage)(message);
    const isCampaign = /\u200c/.test(body);
    if (message.key.fromMe && isCampaign) {
        let msgContact;
        msgContact = await getContactMessage(message, wbot);
        const contact = await (0, verifyContact_1.verifyContact)(msgContact, wbot, companyId);
        const messageRecord = await Message_1.default.findOne({
            where: {
                [sequelize_1.Op.or]: [{ wid: message.key.id }, { contactId: contact.id }],
                companyId
            }
        });
        if (!(0, lodash_1.isNull)(messageRecord) ||
            !(0, lodash_1.isNil)(messageRecord) ||
            messageRecord !== null) {
            const ticket = await Ticket_1.default.findByPk(messageRecord.ticketId);
            await ticket.update({ status: "closed", amountUsedBotQueues: 0 });
            io.of(String(companyId))
                // .to("open")
                .emit(`company-${companyId}-ticket`, {
                action: "delete",
                ticket,
                ticketId: ticket.id
            });
            io.of(String(companyId))
                // .to(ticket.status)
                // .to(ticket.id.toString())
                .emit(`company-${companyId}-ticket`, {
                action: "update",
                ticket,
                ticketId: ticket.id
            });
        }
    }
};
const filterMessages = (msg) => {
    // msgDB.save(msg);
    if (msg.message?.protocolMessage?.editedMessage)
        return true;
    if (msg.message?.protocolMessage)
        return false;
    if ([
        baileys_1.WAMessageStubType.REVOKE,
        baileys_1.WAMessageStubType.E2E_DEVICE_CHANGED,
        baileys_1.WAMessageStubType.E2E_IDENTITY_CHANGED,
        baileys_1.WAMessageStubType.CIPHERTEXT
    ].includes(msg.messageStubType))
        return false;
    return true;
};
// Logs de debug de eventos Baileys removidos para produção
const wbotMessageListener = (wbot, companyId) => {
    wbot.ev.on("messages.upsert", async (messageUpsert) => {
        const messages = messageUpsert.messages
            .filter(filterMessages)
            .map(msg => msg);
        if (!messages)
            return;
        // console.log("CIAAAAAAA WBOT " , companyId)
        messages.forEach(async (message) => {
            if (message?.messageStubParameters?.length &&
                message.messageStubParameters[0].includes("absent")) {
                const msg = {
                    companyId: companyId,
                    whatsappId: wbot.id,
                    message: message
                };
                logger_1.default.warn("MENSAGEM PERDIDA", JSON.stringify(msg));
            }
            const messageExists = await Message_1.default.count({
                where: { wid: message.key.id, companyId }
            });
            if (!messageExists) {
                let isCampaign = false;
                let body = await (0, exports.getBodyMessage)(message);
                const fromMe = message?.key?.fromMe;
                if (fromMe) {
                    isCampaign = /\u200c/.test(body);
                }
                else {
                    if (/\u200c/.test(body))
                        body = body.replace(/\u200c/, "");
                    logger_1.default.debug("Validação de mensagem de campanha enviada por terceiros: " + body);
                }
                if (!isCampaign) {
                    if (redis_1.REDIS_URI_MSG_CONN !== "") {
                        //} && (!message.key.fromMe || (message.key.fromMe && !message.key.id.startsWith('BAE')))) {
                        try {
                            await queue_1.default.add(`${process.env.DB_NAME}-handleMessage`, { message, wbot: wbot.id, companyId }, {
                                priority: 1,
                                jobId: `${wbot.id}-handleMessage-${message.key.id}`
                            });
                        }
                        catch (e) {
                            Sentry.captureException(e);
                        }
                    }
                    else {
                        await handleMessage(message, wbot, companyId);
                    }
                }
                await verifyRecentCampaign(message, companyId);
                await verifyCampaignMessageAndCloseTicket(message, companyId, wbot);
            }
            if (message.key.remoteJid?.endsWith("@g.us")) {
                if (redis_1.REDIS_URI_MSG_CONN !== "") {
                    queue_1.default.add(`${process.env.DB_NAME}-handleMessageAck`, { msg: message, chat: 2 }, {
                        priority: 1,
                        jobId: `${wbot.id}-handleMessageAck-${message.key.id}`
                    });
                }
                else {
                    handleMsgAck(message, 2);
                }
            }
        });
        // messages.forEach(async (message: proto.IWebMessageInfo) => {
        //   const messageExists = await Message.count({
        //     where: { id: message.key.id!, companyId }
        //   });
        //   if (!messageExists) {
        //     await handleMessage(message, wbot, companyId);
        //     await verifyRecentCampaign(message, companyId);
        //     await verifyCampaignMessageAndCloseTicket(message, companyId);
        //   }
        // });
    });
    wbot.ev.on("messages.update", (messageUpdate) => {
        if (messageUpdate.length === 0)
            return;
        messageUpdate.forEach(async (message) => {
            wbot.readMessages([message.key]);
            const msgUp = { ...messageUpdate };
            if (msgUp["0"]?.update.messageStubType === 1 &&
                msgUp["0"]?.key.remoteJid !== "status@broadcast") {
                (0, MarkDeleteWhatsAppMessage_1.default)(msgUp["0"]?.key.remoteJid, null, msgUp["0"]?.key.id, companyId);
            }
            let ack = message.update.status || 1;
            if (redis_1.REDIS_URI_MSG_CONN !== "") {
                queue_1.default.add(`${process.env.DB_NAME}-handleMessageAck`, { msg: message, chat: ack }, {
                    priority: 1,
                    jobId: `${wbot.id}-handleMessageAck-${message.key.id}`
                });
            }
            else {
                handleMsgAck(message, ack);
            }
        });
    });
    // wbot.ev.on('message-receipt.update', (events: any) => {
    //   events.forEach(async (msg: any) => {
    //     const ack = msg?.receipt?.receiptTimestamp ? 3 : msg?.receipt?.readTimestamp ? 4 : 0;
    //     if (!ack) return;
    //     await handleMsgAck(msg, ack);
    //   });
    // })
    // wbot.ev.on("presence.update", (events: any) => {
    //   console.log(events)
    // })
    wbot.ev.on("contacts.update", (contacts) => {
        // Logs de debug de contacts.update removidos para produção
        contacts.forEach(async (contact) => {
            if (!contact?.id)
                return;
            if (!contact.id.includes("@s.whatsapp.net") && !contact.id.includes("@g.us")) {
                return;
            }
            const isGroup = contact.id.includes("@g.us");
            const number = isGroup
                ? contact.id.replace("@g.us", "")
                : contact.id.replace("@s.whatsapp.net", "");
            if (!/^\d{10,15}$/.test(number)) {
                return;
            }
            const profilePicUrl = contact.imgUrl === ""
                ? ""
                : await wbot.profilePictureUrl(contact.id).catch(() => null);
            const contactData = {
                name: number,
                number,
                isGroup,
                companyId,
                remoteJid: contact.id,
                profilePicUrl,
                whatsappId: wbot.id,
                wbot
            };
            await (0, CreateOrUpdateContactService_1.default)(contactData);
        });
    });
    // Handlers extras removidos para produção
    wbot.ev.on('group-participants.update', async (event) => {
        console.log("group-participants.update.listener", JSON.stringify(event, null, 2));
        const { id, participants, action, author } = event;
        // console.log("group-participants.update.listener", id, participants, action, author)
        const metadata = await (0, RedisGroupCache_1.getGroupMetadataCache)(wbot.id, id);
        if (!Array.isArray(metadata?.participants)) {
            return;
        }
        if (action === 'add') {
            logger_1.default.info(`Adicionando participantes ao grupo ${id}, atualizando cache`);
            metadata.participants.push(...participants.map(p => ({
                id: p,
                admin: null
            })));
        }
        else if (action === 'demote' || action === 'promote') {
            logger_1.default.info(`Atualizando ${action === 'promote' ? 'admin' : 'participante'} do grupo ${id}, atualizando cache`);
            metadata.participants = metadata.participants.map(p => participants.includes(p.id) ? ({
                id: p.id,
                admin: action === 'promote' ? 'admin' : null
            }) : p);
        }
        else if (action === 'remove') {
            logger_1.default.info(`Removendo participante do grupo ${id}, atualizando cache`);
            metadata.participants = metadata.participants.filter(p => !participants.includes(p.id));
        }
        else if (action === 'modify') {
            logger_1.default.info(`Modificando participante do grupo ${id}, atualizando cache`);
            metadata.participants = metadata.participants.filter(p => p.id !== author);
            metadata.participants.push(...participants.map(p => ({
                id: p,
                admin: null
            })));
        }
        await RedisGroupCache_1.groupMetadataCache.set(id, wbot.id, {
            timestamp: metadata.timestamp,
            data: metadata,
        });
    });
    wbot.ev.on("groups.update", (groupUpdate) => {
        // Logs de debug de grupos removidos para produção
        if (!groupUpdate[0]?.id)
            return;
        if (groupUpdate.length === 0)
            return;
        groupUpdate.forEach(async (group) => {
            const number = group.id.substr(0, group.id.indexOf("@"));
            const nameGroup = group.subject || number;
            let profilePicUrl = "";
            // try {
            //   profilePicUrl = await wbot.profilePictureUrl(group.id, "image");
            // } catch (e) {
            //   Sentry.captureException(e);
            //   profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
            // }
            const contactData = {
                name: nameGroup,
                number: number,
                isGroup: true,
                companyId: companyId,
                remoteJid: group.id,
                profilePicUrl,
                whatsappId: wbot.id,
                wbot: wbot
            };
            const contact = await (0, CreateOrUpdateContactService_1.default)(contactData);
        });
    });
};
exports.wbotMessageListener = wbotMessageListener;
// Função helper para mapear corretamente o mediaType baseado no MIME type completo
const getMediaTypeFromMimeType = (mimetype) => {
    // Mapeamento específico para tipos de documento que devem ser tratados como "document"
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
        "application/vnd.apple.pages"
    ];
    // Mapeamento para tipos de arquivo compactado
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
        return "document"; // Tratar como documento para download
    }
    // Para outros tipos, usar a lógica padrão
    return mimetype.split("/")[0];
};
