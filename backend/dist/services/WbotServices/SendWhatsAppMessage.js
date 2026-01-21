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
const delay_1 = __importDefault(require("../../utils/delay"));
const Sentry = __importStar(require("@sentry/node"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const GetTicketWbot_1 = __importDefault(require("../../helpers/GetTicketWbot"));
const Message_1 = __importDefault(require("../../models/Message"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const lodash_1 = require("lodash");
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const logger_1 = __importDefault(require("../../utils/logger"));
const debug_1 = require("../../config/debug");
const utils_1 = require("../../utils");
const SendWhatsAppMessage = async ({ body, ticket, quotedMsg, msdelay, vCard, isForwarded = false }) => {
    let options = {};
    console.error(`Chegou SendWhatsAppMessage - ticketId: ${ticket.id} - contactId: ${ticket.contactId}`);
    const wbot = await (0, GetTicketWbot_1.default)(ticket);
    const contactNumber = await Contact_1.default.findByPk(ticket.contactId);
    if (!contactNumber) {
        throw new AppError_1.default("Contato do ticket não encontrado");
    }
    // Sempre envie para o JID tradicional
    let jid = `${contactNumber.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
    jid = (0, utils_1.normalizeJid)(jid);
    if (debug_1.ENABLE_LID_DEBUG) {
        logger_1.default.info(`[RDS-LID] SendMessage - Enviando para JID tradicional: ${jid}`);
        logger_1.default.info(`[RDS-LID] SendMessage - Contact lid: ${contactNumber.lid}`);
        logger_1.default.info(`[RDS-LID] SendMessage - Contact remoteJid: ${contactNumber.remoteJid}`);
        logger_1.default.info(`[RDS-LID] SendMessage - QuotedMsg: ${quotedMsg ? "SIM" : "NÃO"}`);
    }
    if (quotedMsg) {
        // quotedMsg pode vir como objeto ou apenas um id/string
        const quotedId = quotedMsg?.id ?? quotedMsg;
        let chatMessages = null;
        if (quotedId !== undefined && quotedId !== null && String(quotedId).trim() !== "") {
            chatMessages = await Message_1.default.findOne({
                where: {
                    id: quotedId
                }
            });
        }
        if (chatMessages) {
            const msgFound = JSON.parse(chatMessages.dataJson);
            if (msgFound.message.extendedTextMessage !== undefined) {
                options = {
                    quoted: {
                        key: msgFound.key,
                        message: {
                            extendedTextMessage: msgFound.message.extendedTextMessage
                        }
                    }
                };
            }
            else {
                options = {
                    quoted: {
                        key: msgFound.key,
                        message: {
                            conversation: msgFound.message.conversation
                        }
                    }
                };
            }
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] SendMessage - ContextInfo configurado para resposta`);
            }
        }
    }
    if (!(0, lodash_1.isNil)(vCard)) {
        const numberContact = vCard.number;
        const firstName = vCard.name.split(" ")[0];
        const lastName = String(vCard.name).replace(vCard.name.split(" ")[0], "");
        const vcard = `BEGIN:VCARD\n` +
            `VERSION:3.0\n` +
            `N:${lastName};${firstName};;;\n` +
            `FN:${vCard.name}\n` +
            `TEL;type=CELL;waid=${numberContact}:+${numberContact}\n` +
            `END:VCARD`;
        try {
            await (0, delay_1.default)(msdelay);
            const sentMessage = await wbot.sendMessage(jid, {
                contacts: {
                    displayName: `${vCard.name}`,
                    contacts: [{ vcard }]
                }
            });
            wbot.store(sentMessage);
            await ticket.update({
                lastMessage: (0, Mustache_1.default)(vcard, ticket),
                imported: null
            });
            // Log detalhado de vCard enviado com sucesso
            logger_1.default.info(`[RDS-BAILEYS] vCard enviado com sucesso para contato ID=${contactNumber.id}, number=${contactNumber.number}, jid=${jid}`);
            return sentMessage;
        }
        catch (err) {
            // Log detalhado do erro de envio de vCard
            logger_1.default.error(`[RDS-BAILEYS] ERRO ao enviar vCard para contato ID=${contactNumber.id}, number=${contactNumber.number}, jid=${jid}: ${err.message}`);
            Sentry.captureException(err);
            console.log(err);
            throw new AppError_1.default("ERR_SENDING_WAPP_MSG");
        }
    }
    try {
        await (0, delay_1.default)(msdelay);
        const sentMessage = await wbot.sendMessage(jid, {
            text: (0, Mustache_1.default)(body, ticket),
            contextInfo: {
                forwardingScore: isForwarded ? 2 : 0,
                isForwarded: isForwarded ? true : false
            }
        }, {
            ...options,
        });
        wbot.store(sentMessage);
        await ticket.update({
            lastMessage: (0, Mustache_1.default)(body, ticket),
            imported: null
        });
        // Log detalhado de mensagem enviada com sucesso
        logger_1.default.info(`[RDS-BAILEYS] Mensagem enviada com sucesso para contato ID=${contactNumber.id}, number=${contactNumber.number}, jid=${jid}`);
        return sentMessage;
    }
    catch (err) {
        // Log detalhado do erro de envio para facilitar diagnóstico
        logger_1.default.error(`[RDS-BAILEYS] ERRO ao enviar mensagem para contato ID=${contactNumber.id}, number=${contactNumber.number}, jid=${jid}: ${err.message}`);
        console.log(`erro ao enviar mensagem na company ${ticket.companyId} - `, body, ticket, quotedMsg, msdelay, vCard, isForwarded);
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.error(`[RDS-LID] Erro ao enviar mensagem para ${jid}: ${err.message}`);
            if (contactNumber.number?.includes("@lid")) {
                logger_1.default.error(`[RDS-LID] Contato com formato @lid detectado: ${contactNumber.number}`);
                try {
                    const parts = contactNumber.number.split('@');
                    if (parts.length > 0 && /^\d+$/.test(parts[0])) {
                        const correctNumber = parts[0];
                        logger_1.default.info(`[RDS-LID] Tentando corrigir número: ${contactNumber.number} -> ${correctNumber}`);
                        await contactNumber.update({
                            number: correctNumber,
                            remoteJid: `${correctNumber}@s.whatsapp.net`
                        });
                        logger_1.default.info(`[RDS-LID] Contato atualizado com sucesso: ${correctNumber}`);
                    }
                }
                catch (updateError) {
                    logger_1.default.error(`[RDS-LID] Erro ao atualizar contato: ${updateError.message}`);
                }
            }
        }
        if (err.message && err.message.includes("senderMessageKeys")) {
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.error(`[RDS-LID] SendMessage - Erro de criptografia de grupo detectado: ${err.message}`);
            }
            try {
                if (debug_1.ENABLE_LID_DEBUG) {
                    logger_1.default.info(`[RDS-LID] SendMessage - Tentando envio sem criptografia para grupo ${jid}`);
                }
                const sentMessage = await wbot.sendMessage(jid, {
                    text: (0, Mustache_1.default)(body, ticket)
                });
                if (debug_1.ENABLE_LID_DEBUG) {
                    logger_1.default.info(`[RDS-LID] SendMessage - Sucesso no envio sem criptografia para grupo ${jid}`);
                }
                wbot.store(sentMessage);
                await ticket.update({
                    lastMessage: (0, Mustache_1.default)(body, ticket),
                    imported: null
                });
                // Log detalhado de mensagem enviada com sucesso após retry (problema de criptografia)
                logger_1.default.info(`[RDS-BAILEYS] Mensagem enviada com sucesso após retry para contato ID=${contactNumber.id}, number=${contactNumber.number}, jid=${jid} (problema de criptografia resolvido)`);
                return sentMessage;
            }
            catch (finalErr) {
                if (debug_1.ENABLE_LID_DEBUG) {
                    logger_1.default.error(`[RDS-LID] SendMessage - Falha no envio sem criptografia: ${finalErr.message}`);
                }
                Sentry.captureException(finalErr);
                throw new AppError_1.default("ERR_SENDING_WAPP_MSG_GROUP_CRYPTO");
            }
        }
        Sentry.captureException(err);
        console.log(err);
        throw new AppError_1.default("ERR_SENDING_WAPP_MSG");
    }
};
exports.default = SendWhatsAppMessage;
