"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Contact_1 = __importDefault(require("../models/Contact"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const Message_1 = __importDefault(require("../models/Message"));
const logger_1 = __importDefault(require("../utils/logger"));
const WhatsapplidMap_1 = __importDefault(require("../models/WhatsapplidMap"));
const sequelize_1 = require("sequelize");
const unifyContactsByNumber = async (companyId) => {
    try {
        logger_1.default.info("Iniciando unificação de contatos duplicados...");
        const whereCondition = companyId ? { companyId } : {};
        const contacts = await Contact_1.default.findAll({
            where: whereCondition,
            include: [{
                    model: WhatsapplidMap_1.default,
                    required: false
                }],
            order: [
                ["number", "ASC"],
                ["createdAt", "ASC"]
            ]
        });
        const contactsByNumber = new Map();
        const contactsByLid = new Map();
        contacts.forEach(contact => {
            if (!contactsByNumber.has(contact.number)) {
                contactsByNumber.set(contact.number, []);
            }
            contactsByNumber.get(contact.number).push(contact);
            if (contact.lid) {
                if (!contactsByLid.has(contact.lid)) {
                    contactsByLid.set(contact.lid, []);
                }
                contactsByLid.get(contact.lid).push(contact);
            }
            if (contact.whatsappLidMap?.lid) {
                const lidFromMap = contact.whatsappLidMap.lid;
                if (!contactsByLid.has(lidFromMap)) {
                    contactsByLid.set(lidFromMap, []);
                }
                contactsByLid.get(lidFromMap).push(contact);
            }
        });
        let unifiedCount = 0;
        let deletedCount = 0;
        for (const [lid, contactList] of contactsByLid) {
            if (contactList.length > 1) {
                logger_1.default.info(`Unificando ${contactList.length} contatos para o LID ${lid}`);
                const mainContact = contactList.sort((a, b) => {
                    return a.createdAt.getTime() - b.createdAt.getTime();
                })[0];
                if (!mainContact.lid) {
                    mainContact.lid = lid;
                    await mainContact.save();
                    logger_1.default.info(`Atualizado LID do contato principal ${mainContact.id} para ${lid}`);
                }
                const duplicateContacts = contactList.filter(c => c.id !== mainContact.id);
                for (const duplicateContact of duplicateContacts) {
                    // Transferir tickets (em vez de fechar)
                    const ticketsToUpdate = await Ticket_1.default.findAll({
                        where: { contactId: duplicateContact.id }
                    });
                    await Ticket_1.default.update({ contactId: mainContact.id }, {
                        where: { contactId: duplicateContact.id }
                    });
                    if (ticketsToUpdate.length > 0) {
                        logger_1.default.info(`${ticketsToUpdate.length} tickets transferidos do contato ${duplicateContact.id} para ${mainContact.id}`);
                    }
                    // Transferir mensagens
                    const messageCount = await Message_1.default.count({
                        where: { contactId: duplicateContact.id }
                    });
                    await Message_1.default.update({ contactId: mainContact.id }, {
                        where: { contactId: duplicateContact.id }
                    });
                    if (messageCount > 0) {
                        logger_1.default.info(`${messageCount} mensagens transferidas do contato ${duplicateContact.id} para ${mainContact.id}`);
                    }
                    // Remover mapeamentos de LID do contato duplicado
                    await WhatsapplidMap_1.default.destroy({
                        where: { contactId: duplicateContact.id }
                    });
                    // Remover o contato duplicado
                    await duplicateContact.destroy();
                    deletedCount++;
                }
                unifiedCount++;
                logger_1.default.info(`Unificação por LID concluída para ${lid}`);
            }
        }
        logger_1.default.info("Iniciando unificação por número...");
        for (const [number, contactList] of contactsByNumber) {
            const remainingContacts = await Contact_1.default.findAll({
                where: {
                    number,
                    ...whereCondition
                }
            });
            if (remainingContacts.length > 1) {
                logger_1.default.info(`Unificando ${remainingContacts.length} contatos para o número ${number}`);
                let mainContact = remainingContacts.find(c => !!c.lid) || remainingContacts[0];
                const duplicateContacts = remainingContacts.filter(c => c.id !== mainContact.id);
                if (!mainContact.lid) {
                    const lidContact = remainingContacts.find(c => !!c.lid);
                    if (lidContact) {
                        mainContact.lid = lidContact.lid;
                        await mainContact.save();
                        logger_1.default.info(`Atualizado LID do contato principal ${mainContact.id} para ${lidContact.lid}`);
                    }
                }
                for (const duplicateContact of duplicateContacts) {
                    const ticketsToUpdate = await Ticket_1.default.findAll({
                        where: { contactId: duplicateContact.id }
                    });
                    await Ticket_1.default.update({ contactId: mainContact.id }, {
                        where: { contactId: duplicateContact.id }
                    });
                    if (ticketsToUpdate.length > 0) {
                        logger_1.default.info(`${ticketsToUpdate.length} tickets transferidos do contato ${duplicateContact.id} para ${mainContact.id}`);
                    }
                    const messageCount = await Message_1.default.count({
                        where: { contactId: duplicateContact.id }
                    });
                    await Message_1.default.update({ contactId: mainContact.id }, {
                        where: { contactId: duplicateContact.id }
                    });
                    if (messageCount > 0) {
                        logger_1.default.info(`${messageCount} mensagens transferidas do contato ${duplicateContact.id} para ${mainContact.id}`);
                    }
                    await WhatsapplidMap_1.default.destroy({
                        where: { contactId: duplicateContact.id }
                    });
                    await duplicateContact.destroy();
                    deletedCount++;
                }
                unifiedCount++;
                logger_1.default.info(`Unificação por número concluída para ${number}`);
            }
        }
        logger_1.default.info("Verificando e criando mapeamentos de LID faltantes...");
        const contactsWithLid = await Contact_1.default.findAll({
            where: {
                lid: {
                    [sequelize_1.Op.not]: null,
                    [sequelize_1.Op.ne]: ""
                },
                ...whereCondition
            },
            include: [{
                    model: WhatsapplidMap_1.default,
                    required: false
                }]
        });
        let mappingsCreated = 0;
        for (const contact of contactsWithLid) {
            if (!contact.whatsappLidMap && contact.lid) {
                await WhatsapplidMap_1.default.create({
                    lid: contact.lid,
                    contactId: contact.id,
                    companyId: contact.companyId
                });
                mappingsCreated++;
            }
        }
        logger_1.default.info(`Unificação concluída! ${unifiedCount} grupos unificados, ${deletedCount} contatos removidos, ${mappingsCreated} mapeamentos de LID criados`);
    }
    catch (error) {
        logger_1.default.error("Erro durante a unificação de contatos:", error);
        throw error;
    }
};
if (require.main === module) {
    const companyId = process.argv[2] ? parseInt(process.argv[2]) : undefined;
    unifyContactsByNumber(companyId)
        .then(() => {
        logger_1.default.info("Script de unificação executado com sucesso!");
        process.exit(0);
    })
        .catch(error => {
        logger_1.default.error("Erro ao executar script de unificação:", error);
        process.exit(1);
    });
}
exports.default = unifyContactsByNumber;
