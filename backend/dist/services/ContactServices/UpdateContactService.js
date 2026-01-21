"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/services/ContactServices/UpdateContactService.ts - CORRIGIDO
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const ContactCustomField_1 = __importDefault(require("../../models/ContactCustomField"));
const DeleteContactWalletService_1 = __importDefault(require("./DeleteContactWalletService"));
const UpdateContactWalletsService_1 = __importDefault(require("./UpdateContactWalletsService"));
const updateCustomFields = async (contactId, extraInfo) => {
    const currentFields = await ContactCustomField_1.default.findAll({
        where: { contactId }
    });
    await Promise.all(extraInfo.map(async (info) => {
        const existingField = currentFields.find(field => field.name === info.name);
        if (existingField) {
            await existingField.update({ value: info.value });
        }
        else {
            await ContactCustomField_1.default.create({ ...info, contactId });
        }
    }));
    await Promise.all(currentFields.map(async (oldInfo) => {
        const stillExists = extraInfo.find(info => info.name === oldInfo.name);
        if (!stillExists) {
            await ContactCustomField_1.default.destroy({ where: { id: oldInfo.id } });
        }
    }));
};
const UpdateContactService = async ({ contactData, contactId, companyId }) => {
    const { email, name, number, extraInfo, acceptAudioMessage, active, disableBot, remoteJid, contactWallets, birthDate // 🎂 INCLUIR NO DESTRUCTURING
     } = contactData;
    const contact = await Contact_1.default.findOne({
        where: { id: contactId },
        include: ["extraInfo"]
    });
    if (!contact) {
        throw new AppError_1.default("Contato não encontrado", 404);
    }
    if (contact.companyId !== companyId) {
        throw new AppError_1.default("Não é possível alterar registros de outra empresa");
    }
    if (extraInfo) {
        await updateCustomFields(contact.id, extraInfo);
    }
    if (contactWallets) {
        await (0, DeleteContactWalletService_1.default)({
            contactId,
            companyId
        });
        contactWallets.forEach(async (wallet) => {
            await (0, UpdateContactWalletsService_1.default)({
                userId: wallet.walletId,
                queueId: wallet.queueId,
                contactId,
                companyId
            });
        });
    }
    // 🎂 PROCESSAR DATA DE NASCIMENTO - CORREÇÃO DE TIMEZONE
    let processedBirthDate = contact.birthDate;
    if (birthDate !== undefined) {
        if (birthDate === null || birthDate === '') {
            processedBirthDate = null;
        }
        else if (typeof birthDate === 'string') {
            // Se vier no formato ISO, extrair apenas a parte da data
            const dateOnly = birthDate.split('T')[0];
            // Criar data local com meio-dia para evitar problemas de timezone
            const [year, month, day] = dateOnly.split('-').map(Number);
            processedBirthDate = new Date(year, month - 1, day, 12, 0, 0);
        }
        else if (birthDate instanceof Date) {
            // Se for objeto Date, criar nova data local com meio-dia
            const year = birthDate.getFullYear();
            const month = birthDate.getMonth();
            const day = birthDate.getDate();
            processedBirthDate = new Date(year, month, day, 12, 0, 0);
        }
    }
    await contact.update({
        name,
        number,
        email,
        acceptAudioMessage,
        active,
        disableBot,
        remoteJid,
        birthDate: processedBirthDate // 🎂 INCLUIR NO UPDATE
    });
    await contact.reload({
        include: ["extraInfo"]
    });
    return contact;
};
exports.default = UpdateContactService;
