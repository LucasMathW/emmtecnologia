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
exports.updateContact = void 0;
// src/services/ContactServices/CreateOrUpdateContactService.ts - CORRIGIDO
const socket_1 = require("../../libs/socket");
const CompaniesSettings_1 = __importDefault(require("../../models/CompaniesSettings"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importStar(require("path"));
const logger_1 = __importDefault(require("../../utils/logger"));
const lodash_1 = require("lodash");
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const debug_1 = require("../../config/debug");
const utils_1 = require("../../utils");
const axios = require("axios");
const updateContact = async (contact, contactData) => {
    await contact.update(contactData);
    const io = (0, socket_1.getIO)();
    io.to(`company-${contact.companyId}-mainchannel`).emit(`company-${contact.companyId}-contact`, {
        action: "update",
        contact
    });
    return contact;
};
exports.updateContact = updateContact;
const CreateOrUpdateContactService = async ({ name, number, 
// number: rawNumber,
profilePicUrl, isGroup, email = "", birthDate = null, // 🎂 INCLUIR NO DESTRUCTURING
channel = "whatsapp", companyId, extraInfo = [], remoteJid = "", lid = "", whatsappId, wbot, fromMe = false }) => {
    // console.log('number', number)
    // console.log('remoteJid', remoteJid)
    // console.log('isGroup', isGroup)
    // console.log('number', number)
    try {
        // Garantir que o número esteja no formato correto (sem @lid)
        let cleanNumber = number;
        if (!isGroup && cleanNumber.includes('@')) {
            cleanNumber = cleanNumber.substring(0, cleanNumber.indexOf('@'));
            logger_1.default.info(`[RDS-LID] Número com formato incorreto corrigido: ${number} -> ${cleanNumber}`);
        }
        // Monta um remoteJid padrão quando não for informado
        const fallbackRemoteJid = (0, utils_1.normalizeJid)(remoteJid || (isGroup ? `${cleanNumber}@g.us` : `${cleanNumber}@s.whatsapp.net`));
        let createContact = false;
        const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public");
        const io = (0, socket_1.getIO)();
        let contact;
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] Buscando contato: number=${cleanNumber}, companyId=${companyId}, lid=${lid}`);
        }
        if (lid) {
            contact = await Contact_1.default.findOne({ where: { lid, companyId } });
        }
        if (!contact) {
            contact = await Contact_1.default.findOne({ where: { number: cleanNumber, companyId } });
        }
        let updateImage = ((!contact ||
            (contact?.profilePicUrl !== profilePicUrl && profilePicUrl !== "")) &&
            (wbot || ["instagram", "facebook"].includes(channel))) ||
            false;
        if (contact) {
            // if (ENABLE_LID_DEBUG) {
            //   logger.info(
            //     `[RDS-LID] Contato encontrado: id=${contact.id}, number=${contact.number}, jid=${contact.remoteJid}, lid=${contact.lid}`
            //   );
            // }
            contact.remoteJid = fallbackRemoteJid;
            if (!contact.lid) {
                contact.lid = lid;
            }
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] fromMe recebido: ${fromMe}`);
            }
            // Atualizar LID quando disponível
            if (lid && lid !== "") {
                if (contact.lid !== lid) {
                    if (debug_1.ENABLE_LID_DEBUG) {
                        logger_1.default.info(`[RDS-LID] Atualizando lid do contato: de='${contact.lid}' para='${lid}'`);
                    }
                    contact.lid = lid;
                }
            }
            else if (fromMe === false && contact.lid && fallbackRemoteJid) {
                // Se não temos lid mas temos um remoteJid, tenta obter o lid do whatsapp
                if (wbot) {
                    try {
                        const ow = await wbot.onWhatsApp(fallbackRemoteJid);
                        if (ow?.[0]?.exists && ow?.[0]?.lid) {
                            const lidFromLookup = ow[0].lid;
                            if (lidFromLookup && lidFromLookup !== contact.lid) {
                                if (debug_1.ENABLE_LID_DEBUG) {
                                    logger_1.default.info(`[RDS-LID] Atualizando lid obtido via lookup: de='${contact.lid}' para='${lidFromLookup}'`);
                                }
                                contact.lid = lidFromLookup;
                            }
                        }
                    }
                    catch (error) {
                        if (debug_1.ENABLE_LID_DEBUG) {
                            logger_1.default.error(`[RDS-LID] Erro ao consultar LID: ${error.message}`);
                        }
                    }
                }
            }
            contact.profilePicUrl = profilePicUrl || null;
            contact.isGroup = isGroup;
            // 🎂 ATUALIZAR DATA DE NASCIMENTO SE FORNECIDA
            if (birthDate !== null && birthDate !== undefined) {
                let processedBirthDate = null;
                if (typeof birthDate === "string") {
                    processedBirthDate = new Date(birthDate);
                    // Validar se a data é válida
                    if (!isNaN(processedBirthDate.getTime())) {
                        contact.birthDate = processedBirthDate;
                    }
                }
                else {
                    contact.birthDate = birthDate;
                }
            }
            if ((0, lodash_1.isNil)(contact.whatsappId) && !(0, lodash_1.isNil)(whatsappId)) {
                const whatsapp = await Whatsapp_1.default.findOne({
                    where: { id: whatsappId, companyId }
                });
                if (whatsapp) {
                    contact.whatsappId = whatsappId;
                }
            }
            const folder = path_1.default.resolve(publicFolder, `company${companyId}`, "contacts");
            let fileName, oldPath = "";
            if (contact.urlPicture) {
                oldPath = path_1.default.resolve(contact.urlPicture.replace(/\\/g, "/"));
                fileName = path_1.default.join(folder, oldPath.split("\\").pop());
            }
            if (!fs_1.default.existsSync(fileName) ||
                (contact.profilePicUrl === "" && channel === "whatsapp")) {
                try {
                    const targetJid = contact.remoteJid || fallbackRemoteJid;
                    profilePicUrl = await wbot.profilePictureUrl(targetJid, "image");
                }
                catch (e) {
                    profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
                }
                contact.profilePicUrl = profilePicUrl;
                updateImage = true;
            }
            if (contact.name === number) {
                contact.name = name;
            }
            await contact.save(); // Ensure save() is called to trigger updatedAt
            await contact.reload();
            // if (ENABLE_LID_DEBUG) {
            //   logger.info(
            //     `[RDS-LID] Contato atualizado: id=${contact.id}, number=${contact.number}, jid=${contact.remoteJid}, lid=${contact.lid}`
            //   );
            // }
        }
        else if (["whatsapp"].includes(channel)) {
            const settings = await CompaniesSettings_1.default.findOne({
                where: { companyId }
            });
            const acceptAudioMessageContact = settings?.acceptAudioMessageContact;
            const newRemoteJid = fallbackRemoteJid;
            // if (!remoteJid && remoteJid !== "") {
            //   newRemoteJid = isGroup
            //     ? `${rawNumber}@g.us`
            //     : `${rawNumber}@s.whatsapp.net`;
            // }
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] Criando novo contato: number=${number}, jid=${newRemoteJid}, lid=${lid}`);
            }
            if (wbot) {
                try {
                    profilePicUrl = await wbot.profilePictureUrl(newRemoteJid, "image");
                }
                catch (e) {
                    profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
                }
            }
            else {
                profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
            }
            // 🎂 PROCESSAR DATA DE NASCIMENTO PARA NOVO CONTATO
            let processedBirthDate = null;
            if (birthDate) {
                if (typeof birthDate === "string") {
                    processedBirthDate = new Date(birthDate);
                    // Validar se a data é válida
                    if (isNaN(processedBirthDate.getTime())) {
                        processedBirthDate = null;
                    }
                }
                else {
                    processedBirthDate = birthDate;
                }
            }
            try {
                // Verificar se conseguimos obter o LID via API do WhatsApp
                let lidToUse = lid || null;
                // Se não temos LID mas temos wbot, tenta consultar o LID via API
                if (!lidToUse && wbot && newRemoteJid) {
                    try {
                        const ow = await wbot.onWhatsApp(newRemoteJid);
                        if (ow?.[0]?.exists && ow?.[0]?.lid) {
                            lidToUse = ow[0].lid;
                            if (debug_1.ENABLE_LID_DEBUG) {
                                logger_1.default.info(`[RDS-LID] LID obtido via API para novo contato: ${lidToUse}`);
                            }
                        }
                    }
                    catch (error) {
                        if (debug_1.ENABLE_LID_DEBUG) {
                            logger_1.default.error(`[RDS-LID] Erro ao consultar LID para novo contato: ${error.message}`);
                        }
                    }
                }
                // Criando contato com LID quando disponível
                contact = await Contact_1.default.create({
                    name,
                    number: cleanNumber,
                    email,
                    birthDate: processedBirthDate,
                    isGroup,
                    companyId,
                    channel,
                    acceptAudioMessage: acceptAudioMessageContact === "enabled" ? true : false,
                    remoteJid: (0, utils_1.normalizeJid)(newRemoteJid),
                    lid: lidToUse,
                    profilePicUrl,
                    urlPicture: "",
                    whatsappId
                });
                if (debug_1.ENABLE_LID_DEBUG) {
                    logger_1.default.info(`[RDS-LID] Novo contato criado: id=${contact.id}, number=${contact.number}, jid=${contact.remoteJid}, lid=${contact.lid}`);
                }
                createContact = true;
            }
            catch (err) {
                // Verificar se é erro de unicidade (contato já existe)
                if (err.name === 'SequelizeUniqueConstraintError') {
                    logger_1.default.info(`[RDS-CONTACT] Contato já existe, buscando e reativando: number=${number}, companyId=${companyId}`);
                    // Buscar o contato existente que pode estar inativo
                    contact = await Contact_1.default.findOne({
                        where: {
                            number,
                            companyId
                        }
                    });
                    if (contact) {
                        // Reativar o contato se estiver inativo
                        if (!contact.active) {
                            await contact.update({
                                active: true,
                                profilePicUrl,
                                remoteJid: (0, utils_1.normalizeJid)(newRemoteJid),
                                lid: lid || null
                            });
                            logger_1.default.info(`[RDS-CONTACT] Contato reativado: id=${contact.id}, number=${contact.number}`);
                        }
                    }
                    else {
                        // Caso muito improvável - erro de unicidade, mas contato não encontrado
                        logger_1.default.error(`[RDS-CONTACT] Erro de unicidade, mas contato não encontrado: ${err.message}`);
                        throw err;
                    }
                }
                else {
                    // Outros erros são repassados
                    logger_1.default.error(`[RDS-CONTACT] Erro ao criar contato: ${err.message}`);
                    throw err;
                }
            }
        }
        else if (["facebook", "instagram"].includes(channel)) {
            // 🎂 PROCESSAR DATA DE NASCIMENTO PARA REDES SOCIAIS - CORREÇÃO DE TIMEZONE
            let processedBirthDate = null;
            if (birthDate) {
                if (typeof birthDate === "string") {
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
            try {
                contact = await Contact_1.default.create({
                    name,
                    number: cleanNumber,
                    email,
                    birthDate: processedBirthDate,
                    isGroup,
                    companyId,
                    channel,
                    profilePicUrl,
                    urlPicture: "",
                    whatsappId
                });
                createContact = true;
            }
            catch (err) {
                // Verificar se é erro de unicidade (contato já existe)
                if (err.name === 'SequelizeUniqueConstraintError') {
                    logger_1.default.info(`[RDS-CONTACT] Contato social já existe, buscando e reativando: number=${number}, companyId=${companyId}, canal=${channel}`);
                    // Buscar o contato existente que pode estar inativo
                    contact = await Contact_1.default.findOne({
                        where: {
                            number: cleanNumber,
                            companyId,
                            channel
                        }
                    });
                    if (contact) {
                        // Reativar o contato se estiver inativo
                        if (!contact.active) {
                            await contact.update({
                                active: true,
                                profilePicUrl
                            });
                            logger_1.default.info(`[RDS-CONTACT] Contato social reativado: id=${contact.id}, number=${contact.number}, canal=${channel}`);
                        }
                    }
                    else {
                        // Caso muito improvável - erro de unicidade, mas contato não encontrado
                        logger_1.default.error(`[RDS-CONTACT] Erro de unicidade no contato social, mas contato não encontrado: ${err.message}`);
                        throw err;
                    }
                }
                else {
                    // Outros erros são repassados
                    logger_1.default.error(`[RDS-CONTACT] Erro ao criar contato social: ${err.message}`);
                    throw err;
                }
            }
        }
        // Se ainda não temos contato aqui, não prossiga para evitar null reference
        if (!contact) {
            throw new Error("Não foi possível criar ou localizar o contato. Informe o número/canal corretamente.");
        }
        if (updateImage) {
            const folder = path_1.default.resolve(publicFolder, `company${companyId}`, "contacts");
            if (!fs_1.default.existsSync(folder)) {
                fs_1.default.mkdirSync(folder, { recursive: true });
                fs_1.default.chmodSync(folder, 0o777);
            }
            let filename;
            if ((0, lodash_1.isNil)(profilePicUrl) || profilePicUrl.includes("nopicture")) {
                filename = "nopicture.png";
            }
            else {
                filename = `${contact.id}.jpeg`;
                const filePath = (0, path_1.join)(folder, filename);
                // Verifica se o arquivo já existe e se o profilePicUrl não mudou
                if (fs_1.default.existsSync(filePath) && contact.urlPicture === filename) {
                    // Arquivo já existe e é o mesmo, não precisa baixar novamente
                    updateImage = false;
                }
                else {
                    // Remove arquivo antigo se existir
                    if (!(0, lodash_1.isNil)(contact.urlPicture) && contact.urlPicture !== filename) {
                        const oldPath = path_1.default.resolve(contact.urlPicture.replace(/\\/g, "/"));
                        const oldFileName = path_1.default.join(folder, oldPath.split("\\").pop());
                        if (fs_1.default.existsSync(oldFileName)) {
                            fs_1.default.unlinkSync(oldFileName);
                        }
                    }
                    const response = await axios.get(profilePicUrl, {
                        responseType: "arraybuffer"
                    });
                    // Save the image to the directory
                    fs_1.default.writeFileSync(filePath, response.data);
                }
            }
            // Atualiza o contato apenas se a imagem mudou ou se não tinha urlPicture
            if (updateImage || (0, lodash_1.isNil)(contact.urlPicture)) {
                await contact.update({
                    urlPicture: filename,
                    pictureUpdated: true
                });
                await contact.reload();
            }
        }
        if (createContact) {
            io.of(String(companyId)).emit(`company-${companyId}-contact`, {
                action: "create",
                contact
            });
        }
        else {
            io.of(String(companyId)).emit(`company-${companyId}-contact`, {
                action: "update",
                contact
            });
        }
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] Retornando contato: { jid: '${contact.remoteJid}', exists: true, lid: '${contact.lid}' }`);
        }
        return contact;
    }
    catch (err) {
        logger_1.default.error("Error to find or create a contact:", err);
        throw err;
    }
};
exports.default = CreateOrUpdateContactService;
