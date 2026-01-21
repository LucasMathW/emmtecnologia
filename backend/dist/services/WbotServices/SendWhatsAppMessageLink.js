"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = require("baileys");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const wbot_1 = require("../../libs/wbot");
const logger_1 = __importDefault(require("../../utils/logger"));
const debug_1 = require("../../config/debug");
const utils_1 = require("../../utils");
function makeid(length) {
    var result = "";
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public");
const SendWhatsAppMessageLink = async ({ whatsappId, contact, url, caption, msdelay }) => {
    const wbot = await (0, wbot_1.getWbot)(whatsappId);
    // Construir o JID padrão e então normalizá-lo
    let jid = `${contact.number}@${contact.isGroup ? "g.us" : "s.whatsapp.net"}`;
    // Normalizar o JID para garantir formato correto
    jid = (0, utils_1.normalizeJid)(jid);
    if (debug_1.ENABLE_LID_DEBUG) {
        logger_1.default.info(`[RDS-LID] SendWhatsAppMessageLink - Enviando para JID normalizado: ${jid}`);
        logger_1.default.info(`[RDS-LID] SendWhatsAppMessageLink - Contact lid: ${contact.lid}`);
        logger_1.default.info(`[RDS-LID] SendWhatsAppMessageLink - Contact remoteJid: ${contact.remoteJid}`);
    }
    const name = caption.replace("/", "-");
    try {
        await (0, baileys_1.delay)(msdelay);
        const sentMessage = await wbot.sendMessage(jid, {
            document: url
                ? { url }
                : fs_1.default.readFileSync(`${publicFolder}/company${contact.companyId}/${name}-${makeid(5)}.pdf`),
            fileName: name,
            mimetype: "application/pdf"
        });
        wbot.store(sentMessage);
        return sentMessage;
    }
    catch (err) {
        throw new AppError_1.default("ERR_SENDING_WAPP_MSG");
    }
};
exports.default = SendWhatsAppMessageLink;
