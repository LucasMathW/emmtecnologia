"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJidOf = void 0;
const Contact_1 = __importDefault(require("../../models/Contact"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const utils_1 = require("../../utils");
const logger_1 = __importDefault(require("../../utils/logger"));
const debug_1 = require("../../config/debug");
function getJidOf(reference) {
    let address = reference;
    let isGroup = false;
    // Extrair endereço e flag de grupo com base no tipo da referência
    if (reference instanceof Contact_1.default) {
        isGroup = reference.isGroup;
        if (reference.remoteJid && reference.remoteJid.includes("@")) {
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] getJidOf - Usando remoteJid do contato: ${reference.remoteJid}`);
            }
            return (0, utils_1.normalizeJid)(reference.remoteJid);
        }
        address = reference.number;
    }
    else if (reference instanceof Ticket_1.default) {
        isGroup = reference.isGroup;
        if (reference.contact?.remoteJid && reference.contact.remoteJid.includes("@")) {
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] getJidOf - Usando remoteJid do ticket.contact: ${reference.contact.remoteJid}`);
            }
            return (0, utils_1.normalizeJid)(reference.contact.remoteJid);
        }
        address = reference.contact.number;
    }
    if (typeof address !== "string") {
        throw new Error("Invalid reference type");
    }
    if (address.includes("@")) {
        return (0, utils_1.normalizeJid)(address);
    }
    // Construir o JID e normalizar
    const jid = `${address}@${isGroup ? "g.us" : "s.whatsapp.net"}`;
    return (0, utils_1.normalizeJid)(jid);
}
exports.getJidOf = getJidOf;
