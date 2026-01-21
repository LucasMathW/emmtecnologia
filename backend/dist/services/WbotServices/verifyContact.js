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
exports.verifyContact = exports.checkAndDedup = void 0;
const async_mutex_1 = require("async-mutex");
const sequelize_1 = require("sequelize");
const Contact_1 = __importDefault(require("../../models/Contact"));
const CreateOrUpdateContactService_1 = __importStar(require("../ContactServices/CreateOrUpdateContactService"));
const Message_1 = __importDefault(require("../../models/Message"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const WhatsapplidMap_1 = __importDefault(require("../../models/WhatsapplidMap"));
// Importar o módulo inteiro para acessar a fila
const queues = __importStar(require("../../queues"));
const logger_1 = __importDefault(require("../../utils/logger"));
const lidUpdateMutex = new async_mutex_1.Mutex();
async function checkAndDedup(contact, lid) {
    const lidContact = await Contact_1.default.findOne({
        where: {
            companyId: contact.companyId,
            number: {
                [sequelize_1.Op.or]: [lid, lid.substring(0, lid.indexOf("@"))]
            }
        }
    });
    if (!lidContact) {
        return;
    }
    await Message_1.default.update({ contactId: contact.id }, {
        where: {
            contactId: lidContact.id,
            companyId: contact.companyId
        }
    });
    const allTickets = await Ticket_1.default.findAll({
        where: {
            contactId: lidContact.id,
            companyId: contact.companyId
        }
    });
    // Transfer all tickets to main contact instead of closing them
    await Ticket_1.default.update({ contactId: contact.id }, {
        where: {
            contactId: lidContact.id,
            companyId: contact.companyId
        }
    });
    if (allTickets.length > 0) {
        console.log(`[RDS CONTATO] Transferidos ${allTickets.length} tickets do contato ${lidContact.id} para ${contact.id}`);
    }
    // Delete the duplicate contact after transferring all data
    await lidContact.destroy();
}
exports.checkAndDedup = checkAndDedup;
async function verifyContact(msgContact, wbot, companyId) {
    let profilePicUrl;
    // try {
    //   profilePicUrl = await wbot.profilePictureUrl(msgContact.id);
    // } catch (e) {
    //   profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
    // }
    const isLid = msgContact.id.includes("@lid") || false;
    console.log("[DEBUG RODRIGO] isLid", isLid);
    const isGroup = msgContact.id.includes("@g.us");
    const isWhatsappNet = msgContact.id.includes("@s.whatsapp.net");
    // Extrair o número do ID
    const idParts = msgContact.id.split('@');
    const extractedId = idParts[0];
    // Extrair qualquer número de telefone adicional que possa estar presente
    const extractedPhone = extractedId.split(':')[0]; // Remove parte após ":" se existir
    // Determinar número e LID adequadamente
    let number = extractedPhone;
    console.log("[DEBUG RODRIGO] number", number);
    let originalLid = msgContact.lid || null;
    console.log("[DEBUG RODRIGO] originalLid", originalLid);
    // Se o ID estiver no formato telefone:XX@s.whatsapp.net, extraia apenas o telefone
    if (isWhatsappNet && extractedId.includes(':')) {
        logger_1.default.info(`[RDS-LID-FIX] ID contém separador ':' - extraindo apenas o telefone: ${extractedPhone}`);
    }
    // Verificar se o "número" parece ser um LID (muito longo para ser telefone)
    const isNumberLikelyLid = !isLid && number && number.length > 15 && !isGroup;
    if (isNumberLikelyLid) {
        logger_1.default.info(`[RDS-LID-FIX] Número extraído parece ser um LID (muito longo): ${number}`);
    }
    logger_1.default.info(`[RDS-LID-FIX] Processando contato - ID original: ${msgContact.id}, número extraído: ${number}, LID detectado: ${originalLid || "não"}`);
    const contactData = {
        name: msgContact?.name || msgContact.id.replace(/\D/g, ""),
        number,
        profilePicUrl,
        isGroup,
        companyId,
        lid: originalLid // Adicionar o LID aos dados do contato quando disponível
    };
    if (isGroup) {
        return (0, CreateOrUpdateContactService_1.default)(contactData);
    }
    return lidUpdateMutex.runExclusive(async () => {
        let foundContact = null;
        if (isLid) {
            console.log("[DEBUG RODRIGO] isLid", JSON.stringify(msgContact, null, 2));
            foundContact = await Contact_1.default.findOne({
                where: {
                    companyId,
                    [sequelize_1.Op.or]: [
                        { lid: originalLid ? originalLid : msgContact.id },
                        { number: number },
                        { remoteJid: originalLid ? originalLid : msgContact.id }
                    ],
                },
                include: ["tags", "extraInfo", "whatsappLidMap"]
            });
        }
        else {
            console.log("[DEBUG RODRIGO] No isLid", JSON.stringify(msgContact, null, 2));
            foundContact = await Contact_1.default.findOne({
                where: {
                    companyId,
                    number: number
                },
            });
        }
        console.log("[DEBUG RODRIGO] foundContact", foundContact?.id);
        if (isLid) {
            if (foundContact) {
                return (0, CreateOrUpdateContactService_1.updateContact)(foundContact, {
                    profilePicUrl: contactData.profilePicUrl
                });
            }
            const foundMappedContact = await WhatsapplidMap_1.default.findOne({
                where: {
                    companyId,
                    lid: number
                },
                include: [
                    {
                        model: Contact_1.default,
                        as: "contact",
                        include: ["tags", "extraInfo"]
                    }
                ]
            });
            if (foundMappedContact) {
                return (0, CreateOrUpdateContactService_1.updateContact)(foundMappedContact.contact, {
                    profilePicUrl: contactData.profilePicUrl
                });
            }
            const partialLidContact = await Contact_1.default.findOne({
                where: {
                    companyId,
                    number: number.substring(0, number.indexOf("@"))
                },
                include: ["tags", "extraInfo"]
            });
            if (partialLidContact) {
                return (0, CreateOrUpdateContactService_1.updateContact)(partialLidContact, {
                    number: contactData.number,
                    profilePicUrl: contactData.profilePicUrl
                });
            }
        }
        else if (foundContact) {
            if (!foundContact.whatsappLidMap) {
                try {
                    const ow = await wbot.onWhatsApp(msgContact.id);
                    if (ow?.[0]?.exists) {
                        const lid = ow?.[0]?.lid;
                        if (lid) {
                            await checkAndDedup(foundContact, lid);
                            const lidMap = await WhatsapplidMap_1.default.findOne({
                                where: {
                                    companyId,
                                    lid,
                                    contactId: foundContact.id
                                }
                            });
                            if (!lidMap) {
                                await WhatsapplidMap_1.default.create({
                                    companyId,
                                    lid,
                                    contactId: foundContact.id
                                });
                            }
                            logger_1.default.info(`[RDS CONTATO] LID obtido para contato ${foundContact.id} (${msgContact.id}): ${lid}`);
                        }
                    }
                    else {
                        logger_1.default.warn(`[RDS CONTATO] Contato ${msgContact.id} não encontrado no WhatsApp, mas continuando processamento`);
                    }
                }
                catch (error) {
                    console.log("[DEBUG RODRIGO] error", JSON.stringify(error, null, 2));
                    logger_1.default.error(`[RDS CONTATO] Erro ao verificar contato ${msgContact.id} no WhatsApp: ${error.message}`);
                    try {
                        await queues["lidRetryQueue"].add("RetryLidLookup", {
                            contactId: foundContact.id,
                            whatsappId: wbot.id || null,
                            companyId,
                            number: msgContact.id,
                            retryCount: 1,
                            maxRetries: 5
                        }, {
                            delay: 60 * 1000,
                            attempts: 1,
                            removeOnComplete: true
                        });
                        logger_1.default.info(`[RDS CONTATO] Agendada retentativa de obtenção de LID para contato ${foundContact.id} (${msgContact.id})`);
                    }
                    catch (queueError) {
                        logger_1.default.error(`[RDS CONTATO] Erro ao adicionar contato ${foundContact.id} à fila de retentativa: ${queueError.message}`);
                    }
                }
            }
            return (0, CreateOrUpdateContactService_1.updateContact)(foundContact, {
                profilePicUrl: contactData.profilePicUrl
            });
        }
        else if (!isGroup && !foundContact) {
            let newContact = null;
            try {
                const ow = await wbot.onWhatsApp(msgContact.id);
                if (!ow?.[0]?.exists) {
                    if (originalLid && !contactData.lid) {
                        contactData.lid = originalLid;
                    }
                    return (0, CreateOrUpdateContactService_1.default)(contactData);
                }
                let lid = ow?.[0]?.lid;
                if (!lid && originalLid) {
                    lid = originalLid;
                }
                try {
                    const firstItem = ow && ow.length > 0 ? ow[0] : null;
                    if (firstItem) {
                        const firstItemAny = firstItem;
                        if (firstItemAny.jid) {
                            const parts = String(firstItemAny.jid).split('@');
                            if (parts.length > 0) {
                                const owNumber = parts[0];
                                if (owNumber && owNumber !== number) {
                                }
                            }
                        }
                    }
                }
                catch (e) {
                    logger_1.default.error(`[RDS-LID-FIX] Erro ao extrair número da resposta onWhatsApp: ${e.message}`);
                }
                if (lid) {
                    const lidContact = await Contact_1.default.findOne({
                        where: {
                            companyId,
                            number: {
                                [sequelize_1.Op.or]: [lid, lid.substring(0, lid.indexOf("@"))]
                            }
                        },
                        include: ["tags", "extraInfo"]
                    });
                    if (lidContact) {
                        // Atualiza o campo lid no contato além de criar o mapeamento
                        await lidContact.update({
                            lid: lid
                        });
                        await WhatsapplidMap_1.default.create({
                            companyId,
                            lid,
                            contactId: lidContact.id
                        });
                        return (0, CreateOrUpdateContactService_1.updateContact)(lidContact, {
                            number: contactData.number,
                            profilePicUrl: contactData.profilePicUrl
                        });
                    }
                    else {
                        const contactDataWithLid = {
                            ...contactData,
                            lid: lid
                        };
                        newContact = await (0, CreateOrUpdateContactService_1.default)(contactDataWithLid);
                        if (newContact.lid !== lid) {
                            await newContact.update({ lid: lid });
                        }
                        await WhatsapplidMap_1.default.create({
                            companyId,
                            lid,
                            contactId: newContact.id
                        });
                        return newContact;
                    }
                }
            }
            catch (error) {
                console.log("[DEBUG RODRIGO] error", JSON.stringify(error, null, 2));
                logger_1.default.error(`[RDS CONTATO] Erro ao verificar contato ${msgContact.id} no WhatsApp: ${error.message}`);
                newContact = await (0, CreateOrUpdateContactService_1.default)(contactData);
                logger_1.default.info(`[RDS CONTATO] Contato criado sem LID devido a erro: ${newContact.id}`);
                try {
                    await queues["lidRetryQueue"].add("RetryLidLookup", {
                        contactId: newContact.id,
                        whatsappId: wbot.id || null,
                        companyId,
                        number: msgContact.id,
                        lid: originalLid ? originalLid : msgContact.id,
                        retryCount: 1,
                        maxRetries: 5
                    }, {
                        delay: 60 * 1000,
                        attempts: 1,
                        removeOnComplete: true
                    });
                    logger_1.default.info(`[RDS CONTATO] Agendada retentativa de obtenção de LID para novo contato ${newContact.id} (${msgContact.id})`);
                }
                catch (queueError) {
                    logger_1.default.error(`[RDS CONTATO] Erro ao adicionar contato ${newContact.id} à fila de retentativa: ${queueError.message}`);
                }
                return newContact;
            }
        }
        return (0, CreateOrUpdateContactService_1.default)(contactData);
    });
}
exports.verifyContact = verifyContact;
