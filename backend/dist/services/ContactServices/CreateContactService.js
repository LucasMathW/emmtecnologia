"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/services/ContactServices/CreateContactService.ts - CORRIGIDO
const AppError_1 = __importDefault(require("../../errors/AppError"));
const CompaniesSettings_1 = __importDefault(require("../../models/CompaniesSettings"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const ContactCustomField_1 = __importDefault(require("../../models/ContactCustomField"));
const ContactWallet_1 = __importDefault(require("../../models/ContactWallet"));
const CreateContactService = async ({ name, number, email = "", birthDate, // 🎂 INCLUIR NO DESTRUCTURING
acceptAudioMessage, active, companyId, extraInfo = [], remoteJid = "", wallets }) => {
    console.log('number', number);
    console.log('remoteJid', remoteJid);
    const numberExists = await Contact_1.default.findOne({
        where: { number, companyId }
    });
    if (numberExists) {
        throw new AppError_1.default("ERR_DUPLICATED_CONTACT");
    }
    const settings = await CompaniesSettings_1.default.findOne({
        where: { companyId }
    });
    const acceptAudioMessageContact = settings?.acceptAudioMessageContact === "enabled";
    // 🎂 PROCESSAR DATA DE NASCIMENTO - CORREÇÃO DE TIMEZONE
    let processedBirthDate = null;
    if (birthDate) {
        if (typeof birthDate === 'string') {
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
    const contact = await Contact_1.default.create({
        name,
        number,
        email,
        birthDate: processedBirthDate,
        acceptAudioMessage: acceptAudioMessageContact,
        active,
        companyId,
        remoteJid
    }, {
        include: ["extraInfo"]
    });
    if (extraInfo && extraInfo.length > 0) {
        for (const info of extraInfo) {
            await ContactCustomField_1.default.create({
                name: info.name,
                value: info.value,
                contactId: contact.id
            });
        }
    }
    if (wallets) {
        await ContactWallet_1.default.destroy({
            where: {
                companyId,
                contactId: contact.id
            }
        });
        const contactWallets = [];
        wallets.forEach((wallet) => {
            contactWallets.push({
                walletId: !wallet.id ? wallet : wallet.id,
                contactId: contact.id,
                companyId
            });
        });
        await ContactWallet_1.default.bulkCreate(contactWallets);
    }
    await contact.reload({
        include: ["extraInfo",
            {
                association: "wallets",
                attributes: ["id", "name"]
            },
        ]
    });
    return contact;
};
exports.default = CreateContactService;
