"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeJid = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const debug_1 = require("../config/debug");
function normalizeJid(jid) {
    if (!jid)
        return jid;
    if (debug_1.ENABLE_LID_DEBUG) {
        logger_1.default.info(`[RDS-LID] normalizeJid - Entrada: ${jid}`);
    }
    // Correção para contatos salvos incorretamente com @lid@s.whatsapp.net
    if (jid.includes('@lid@s.whatsapp.net')) {
        const parts = jid.split('@');
        if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
            const normalized = parts[0] + '@s.whatsapp.net';
            if (debug_1.ENABLE_LID_DEBUG)
                logger_1.default.info(`[RDS-LID] normalizeJid - Corrigido formato @lid@s.whatsapp.net: ${normalized}`);
            return normalized;
        }
    }
    if (jid.includes('@s.whatsapp.net@s.whatsapp.net')) {
        const normalized = jid.replace('@s.whatsapp.net@s.whatsapp.net', '@s.whatsapp.net');
        if (debug_1.ENABLE_LID_DEBUG)
            logger_1.default.info(`[RDS-LID] normalizeJid - Corrigido duplicado: ${normalized}`);
        return normalized;
    }
    if (jid.includes('@g.us@g.us')) {
        const normalized = jid.replace('@g.us@g.us', '@g.us');
        if (debug_1.ENABLE_LID_DEBUG)
            logger_1.default.info(`[RDS-LID] normalizeJid - Corrigido duplicado: ${normalized}`);
        return normalized;
    }
    if (jid.includes('@s.whatsapp.net') || jid.includes('@g.us')) {
        if (debug_1.ENABLE_LID_DEBUG)
            logger_1.default.info(`[RDS-LID] normalizeJid - JID já normalizado: ${jid}`);
        return jid;
    }
    if (jid.includes('@lid')) {
        const base = jid.split('@')[0];
        if (!/^\d+$/.test(base)) {
            if (debug_1.ENABLE_LID_DEBUG)
                logger_1.default.warn(`[RDS-LID] normalizeJid - Formato inválido para @lid: ${jid}`);
            return jid;
        }
        let normalized;
        if (base.length > 15 || jid.includes('g.us')) {
            normalized = base + '@g.us';
            if (debug_1.ENABLE_LID_DEBUG)
                logger_1.default.info(`[RDS-LID] normalizeJid - @lid convertido para grupo: ${normalized}`);
        }
        else {
            normalized = base + '@s.whatsapp.net';
            if (debug_1.ENABLE_LID_DEBUG)
                logger_1.default.info(`[RDS-LID] normalizeJid - @lid convertido para usuário: ${normalized}`);
        }
        return normalized;
    }
    if (!jid.includes('@')) {
        const normalized = jid + '@s.whatsapp.net';
        if (debug_1.ENABLE_LID_DEBUG)
            logger_1.default.info(`[RDS-LID] normalizeJid - Adicionado @s.whatsapp.net: ${normalized}`);
        return normalized;
    }
    if (debug_1.ENABLE_LID_DEBUG)
        logger_1.default.info(`[RDS-LID] normalizeJid - Sem alteração: ${jid}`);
    return jid;
}
exports.normalizeJid = normalizeJid;
