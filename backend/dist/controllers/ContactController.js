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
exports.deleteAll = exports.bulkDelete = exports.searchMessages = exports.getGroupParticipants = exports.getContactMedia = exports.listWallets = exports.listWhatsapp = exports.deleteContactWallet = exports.updateContactWallet = exports.toggleDisableBot = exports.getContactTags = exports.getContactVcard = exports.getContactProfileURL = exports.upload = exports.blockUnblock = exports.toggleAcceptAudio = exports.list = exports.remove = exports.show = exports.update = exports.store = exports.getContact = exports.index = exports.importXls = void 0;
const Yup = __importStar(require("yup"));
const socket_1 = require("../libs/socket");
const lodash_1 = require("lodash");
const ListContactsService_1 = __importDefault(require("../services/ContactServices/ListContactsService"));
const CreateContactService_1 = __importDefault(require("../services/ContactServices/CreateContactService"));
const ShowContactService_1 = __importDefault(require("../services/ContactServices/ShowContactService"));
const UpdateContactService_1 = __importDefault(require("../services/ContactServices/UpdateContactService"));
const DeleteContactService_1 = __importDefault(require("../services/ContactServices/DeleteContactService"));
const GetContactService_1 = __importDefault(require("../services/ContactServices/GetContactService"));
const CheckNumber_1 = __importDefault(require("../services/WbotServices/CheckNumber"));
const GetProfilePicUrl_1 = __importDefault(require("../services/WbotServices/GetProfilePicUrl"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const commonSchemas_1 = require("../validators/commonSchemas");
const sanitizers_1 = require("../utils/sanitizers");
const SimpleListService_1 = __importDefault(require("../services/ContactServices/SimpleListService"));
const ToggleAcceptAudioContactService_1 = __importDefault(require("../services/ContactServices/ToggleAcceptAudioContactService"));
const BlockUnblockContactService_1 = __importDefault(require("../services/ContactServices/BlockUnblockContactService"));
const ImportContactsService_1 = require("../services/ContactServices/ImportContactsService");
const NumberSimpleListService_1 = __importDefault(require("../services/ContactServices/NumberSimpleListService"));
const CreateOrUpdateContactServiceForImport_1 = __importDefault(require("../services/ContactServices/CreateOrUpdateContactServiceForImport"));
const UpdateContactWalletsService_1 = __importDefault(require("../services/ContactServices/UpdateContactWalletsService"));
const DeleteContactWalletService_1 = __importDefault(require("../services/ContactServices/DeleteContactWalletService"));
const ListWalletsService_1 = __importDefault(require("../services/ContactServices/ListWalletsService"));
const FindContactTags_1 = __importDefault(require("../services/ContactServices/FindContactTags"));
const ToggleDisableBotContactService_1 = __importDefault(require("../services/ContactServices/ToggleDisableBotContactService"));
const GetGroupParticipantsService_1 = __importDefault(require("../services/ContactServices/GetGroupParticipantsService"));
const SearchContactMessagesService_1 = __importDefault(require("../services/ContactServices/SearchContactMessagesService"));
const BulkDeleteContactsService_1 = __importDefault(require("../services/ContactServices/BulkDeleteContactsService"));
const DeleteAllContactsService_1 = __importDefault(require("../services/ContactServices/DeleteAllContactsService"));
const GetDefaultWhatsApp_1 = __importDefault(require("../helpers/GetDefaultWhatsApp"));
const Tag_1 = __importDefault(require("../models/Tag"));
const ContactTag_1 = __importDefault(require("../models/ContactTag"));
const logger_1 = __importDefault(require("../utils/logger"));
const CreateWalletContactUser_1 = require("../services/ContactServices/CreateWalletContactUser");
const User_1 = __importDefault(require("../models/User"));
const GetContactMediaService_1 = __importDefault(require("../services/ContactServices/GetContactMediaService"));
const importXls = async (req, res) => {
    const { companyId } = req.user;
    const { number, name, email, validateContact, tags, carteira, birthDate } = req.body;
    try {
        logger_1.default.info(`Iniciando importação de contato: ${name} - ${number}`);
        const simpleNumber = String(number).replace(/[^\d.-]+/g, "");
        let validNumber = { jid: simpleNumber };
        if (validateContact === "true") {
            try {
                logger_1.default.info(`Validando número: ${simpleNumber}`);
                validNumber = await (0, CheckNumber_1.default)(simpleNumber, companyId);
                logger_1.default.info(`Número validado com sucesso: ${JSON.stringify(validNumber)}`);
            }
            catch (validationError) {
                logger_1.default.error(`Erro ao validar número ${simpleNumber}:`, validationError);
                validNumber = { jid: simpleNumber };
            }
        }
        else {
            validNumber = { jid: `${simpleNumber}@s.whatsapp.net` };
            logger_1.default.info(`Usando número sem validação: ${validNumber.jid}`);
        }
        let profilePicUrl = "";
        let whatsappId = null;
        try {
            const whatsappPromise = (0, GetDefaultWhatsApp_1.default)(companyId);
            const profilePicPromise = validNumber.jid ?
                (0, GetProfilePicUrl_1.default)(validNumber.jid, companyId).catch(err => {
                    logger_1.default.warn(`Não foi possível obter foto do perfil: ${err.message}`);
                    return "";
                }) :
                Promise.resolve("");
            const [defaultWhatsapp, profilePicUrlResult] = await Promise.all([
                whatsappPromise,
                profilePicPromise
            ]);
            profilePicUrl = profilePicUrlResult;
            whatsappId = defaultWhatsapp.id;
            logger_1.default.info(`WhatsApp ID obtido: ${whatsappId}`);
        }
        catch (error) {
            logger_1.default.error(`Erro ao obter foto do perfil ou WhatsApp padrão: ${error.message}`);
        }
        // Processar birthDate se fornecido
        let processedBirthDate = null;
        if (birthDate) {
            try {
                // Verificar se é string no formato YYYY-MM-DD
                if (typeof birthDate === 'string' && birthDate.includes('-')) {
                    const [year, month, day] = birthDate.split('-').map(Number);
                    processedBirthDate = new Date(year, month - 1, day, 12, 0, 0); // Set to midday local time
                    if (isNaN(processedBirthDate.getTime())) {
                        logger_1.default.warn(`Invalid birthDate string provided: ${birthDate}`);
                        processedBirthDate = null;
                    }
                }
                else if (birthDate instanceof Date) {
                    const year = birthDate.getFullYear();
                    const month = birthDate.getMonth();
                    const day = birthDate.getDate();
                    processedBirthDate = new Date(year, month, day, 12, 0, 0); // Set to midday local time
                }
            }
            catch (error) {
                logger_1.default.error(`Error processing birthDate: ${birthDate}`, error);
                processedBirthDate = null;
            }
        }
        const contactData = {
            name: `${name}`,
            number: validNumber.jid ? validNumber.jid.replace("@s.whatsapp.net", "") : simpleNumber,
            profilePicUrl,
            isGroup: false,
            email,
            companyId,
            whatsappId,
            birthDate: processedBirthDate
        };
        logger_1.default.info(`RDS: Criando/atualizando contato: ${JSON.stringify(contactData)}`);
        const contact = await (0, CreateOrUpdateContactServiceForImport_1.default)(contactData);
        if (tags) {
            const tagList = tags.split(",").map(tag => tag.trim());
            logger_1.default.info(`RDS: Processando ${tagList.length} tags para o contato`);
            for (const tagName of tagList) {
                try {
                    let [tag, created] = await Tag_1.default.findOrCreate({
                        where: { name: tagName, companyId, color: "#A4CCCC", kanban: 0 }
                    });
                    await ContactTag_1.default.findOrCreate({
                        where: {
                            contactId: contact.id,
                            tagId: tag.id
                        }
                    });
                }
                catch (error) {
                    logger_1.default.error(`RDS: Erro ao criar Tag ${tagName}:`, error);
                }
            }
        }
        if (carteira) {
            try {
                logger_1.default.info(`RDS: Processando carteira: ${carteira}`);
                const user = await User_1.default.findOne({
                    where: {
                        email: carteira,
                        companyId
                    }
                });
                if (user) {
                    await (0, CreateWalletContactUser_1.createWalletContactUser)(contact.id, user.id, null, companyId);
                    logger_1.default.info(`RDS: Carteira associada com sucesso`);
                }
                else {
                    logger_1.default.warn(`RDS: Usuário não encontrado para carteira: ${carteira}`);
                }
            }
            catch (walletError) {
                logger_1.default.error(`RDS: Erro ao processar carteira:`, walletError);
            }
        }
        const io = (0, socket_1.getIO)();
        io.of(String(companyId)).emit(`company-${companyId}-contact`, {
            action: "create",
            contact
        });
        return res.status(200).json(contact);
    }
    catch (error) {
        logger_1.default.error(`RDS: Erro ao importar contato ${name} - ${number}:`, error);
        return res.status(500).json({
            error: "RDS: Erro ao importar contato",
            message: error.message || "RDS-206: Erro interno do servidor"
        });
    }
};
exports.importXls = importXls;
const index = async (req, res) => {
    const { searchParam, pageNumber, contactTag: tagIdsStringified, isGroup } = req.query;
    const { id: userId, companyId } = req.user;
    let tagsIds = [];
    if (tagIdsStringified) {
        tagsIds = JSON.parse(tagIdsStringified);
    }
    const { contacts, count, hasMore } = await (0, ListContactsService_1.default)({
        searchParam,
        pageNumber,
        companyId,
        tagsIds,
        isGroup,
        userId: Number(userId)
    });
    return res.json({ contacts, count, hasMore });
};
exports.index = index;
const getContact = async (req, res) => {
    const { name, number } = req.body;
    const { companyId } = req.user;
    const contact = await (0, GetContactService_1.default)({
        name,
        number,
        companyId
    });
    return res.status(200).json(contact);
};
exports.getContact = getContact;
const store = async (req, res) => {
    const { companyId } = req.user;
    const newContact = req.body;
    newContact.number = newContact.number.replace("-", "").replace(" ", "");
    const schema = Yup.object().shape({
        name: Yup.string().required(),
        number: Yup.string()
            .required()
            .matches(/^\d+$/, "Invalid number format. Only numbers are allowed."),
        email: Yup.string().email("Invalid email"),
        birthDate: Yup.date()
            .nullable()
            .max(new Date(), "Data de nascimento não pode ser no futuro"),
        extraInfo: Yup.array().of(Yup.object().shape({
            name: Yup.string().required(),
            value: Yup.string().required()
        }))
    });
    try {
        await schema.validate(newContact);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    if (!newContact.isGroup) {
        const validNumber = await (0, CheckNumber_1.default)(newContact.number, companyId);
        const number = validNumber.jid.replace(/\D/g, "");
        newContact.number = number;
    }
    const validNumber = await (0, CheckNumber_1.default)(newContact.number, companyId);
    const contact = await (0, CreateContactService_1.default)({
        ...newContact,
        number: validNumber.jid.split("@")[0],
        remoteJid: validNumber.jid,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-contact`, {
        action: "create",
        contact
    });
    return res.status(200).json(contact);
};
exports.store = store;
const update = async (req, res) => {
    const contactData = req.body;
    const { companyId } = req.user;
    const { contactId } = req.params;
    const schema = Yup.object().shape({
        name: Yup.string(),
        number: Yup.string().matches(/^\d+(@lid)?$/, "ERR_CHECK_NUMBER"),
        email: Yup.string().email("Invalid email"),
        birthDate: Yup.date()
            .nullable()
            .max(new Date(), "Data de nascimento não pode ser no futuro"),
        extraInfo: Yup.array().of(Yup.object().shape({
            name: Yup.string().required(),
            value: Yup.string().required()
        }))
    });
    try {
        await schema.validate(contactData);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    if (!contactData.isGroup && contactData.number) {
        const validNumber = await (0, CheckNumber_1.default)(contactData.number, companyId);
        const number = validNumber.jid.replace(/\D/g, "");
        contactData.number = number;
    }
    const oldContact = await (0, ShowContactService_1.default)(contactId, companyId);
    if (contactData.number &&
        oldContact.number != contactData.number &&
        oldContact.channel == "whatsapp") {
        const isGroup = oldContact && oldContact.remoteJid
            ? oldContact.remoteJid.endsWith("@g.us")
            : oldContact.isGroup;
        const validNumber = await (0, CheckNumber_1.default)(contactData.number, companyId, isGroup);
        const number = validNumber.jid.split("@")[0];
        contactData.number = number;
        contactData.remoteJid = validNumber.jid;
    }
    const contact = await (0, UpdateContactService_1.default)({
        contactData,
        contactId,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-contact`, {
        action: "update",
        contact
    });
    return res.status(200).json(contact);
};
exports.update = update;
const show = async (req, res) => {
    const { contactId } = req.params;
    const { companyId } = req.user;
    const contact = await (0, ShowContactService_1.default)(contactId, companyId);
    return res.status(200).json(contact);
};
exports.show = show;
const remove = async (req, res) => {
    const { contactId } = req.params;
    const { companyId } = req.user;
    await (0, ShowContactService_1.default)(contactId, companyId);
    await (0, DeleteContactService_1.default)(contactId);
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-contact`, {
        action: "delete",
        contactId
    });
    return res.status(200).json({ message: "Contact deleted" });
};
exports.remove = remove;
const list = async (req, res) => {
    const { name } = req.query;
    const { companyId, id: userId } = req.user;
    const contacts = await (0, SimpleListService_1.default)({
        name,
        companyId,
        userId: Number(userId)
    });
    return res.json(contacts);
};
exports.list = list;
const toggleAcceptAudio = async (req, res) => {
    var { contactId } = req.params;
    const { companyId } = req.user;
    const contact = await (0, ToggleAcceptAudioContactService_1.default)({ contactId });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-contact`, {
        action: "update",
        contact
    });
    return res.status(200).json(contact);
};
exports.toggleAcceptAudio = toggleAcceptAudio;
const blockUnblock = async (req, res) => {
    var { contactId } = req.params;
    const { companyId } = req.user;
    const { active } = req.body;
    const contact = await (0, BlockUnblockContactService_1.default)({
        contactId,
        companyId,
        active
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-contact`, {
        action: "update",
        contact
    });
    return res.status(200).json(contact);
};
exports.blockUnblock = blockUnblock;
const upload = async (req, res) => {
    const files = req.files;
    const file = (0, lodash_1.head)(files);
    const { companyId } = req.user;
    const response = await (0, ImportContactsService_1.ImportContactsService)(companyId, file);
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-contact`, {
        action: "reload",
        records: response
    });
    return res.status(200).json(response);
};
exports.upload = upload;
const getContactProfileURL = async (req, res) => {
    const { number } = req.params;
    const { companyId } = req.user;
    if (number) {
        const validNumber = await (0, CheckNumber_1.default)(number, companyId);
        let profilePicUrl = "";
        try {
            profilePicUrl = await (0, GetProfilePicUrl_1.default)(validNumber.jid, companyId);
        }
        catch (error) {
            profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
        }
        const contact = await (0, NumberSimpleListService_1.default)({
            number: validNumber.jid.split("@")[0],
            companyId: companyId
        });
        let obj;
        if (contact.length > 0) {
            obj = {
                contactId: contact[0].id,
                profilePicUrl: profilePicUrl
            };
        }
        else {
            obj = {
                contactId: 0,
                profilePicUrl: profilePicUrl
            };
        }
        return res.status(200).json(obj);
    }
};
exports.getContactProfileURL = getContactProfileURL;
const getContactVcard = async (req, res) => {
    const { name, number } = req.query;
    const { companyId } = req.user;
    let vNumber = number;
    const numberDDI = vNumber.toString().substr(0, 2);
    const numberDDD = vNumber.toString().substr(2, 2);
    const numberUser = vNumber.toString().substr(-8, 8);
    if (numberDDD <= "30" && numberDDI === "55") {
        console.log("menor 30");
        vNumber = `${numberDDI + numberDDD + 9 + numberUser}@s.whatsapp.net`;
    }
    else if (numberDDD > "30" && numberDDI === "55") {
        console.log("maior 30");
        vNumber = `${numberDDI + numberDDD + numberUser}@s.whatsapp.net`;
    }
    else {
        vNumber = `${number}@s.whatsapp.net`;
    }
    const contact = await (0, GetContactService_1.default)({
        name,
        number,
        companyId
    });
    return res.status(200).json(contact);
};
exports.getContactVcard = getContactVcard;
const getContactTags = async (req, res) => {
    const { contactId } = req.params;
    const contactTags = await (0, FindContactTags_1.default)({ contactId });
    let tags = false;
    if (contactTags.length > 0) {
        tags = true;
    }
    return res.status(200).json({ tags: tags });
};
exports.getContactTags = getContactTags;
const toggleDisableBot = async (req, res) => {
    var { contactId } = req.params;
    const { companyId } = req.user;
    const contact = await (0, ToggleDisableBotContactService_1.default)({ contactId });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-contact`, {
        action: "update",
        contact
    });
    return res.status(200).json(contact);
};
exports.toggleDisableBot = toggleDisableBot;
const updateContactWallet = async (req, res) => {
    const { wallets } = req.body;
    const { contactId } = req.params;
    const { companyId } = req.user;
    const userId = wallets.userId;
    const queueId = wallets.queueId;
    const contact = await (0, UpdateContactWalletsService_1.default)({
        userId,
        queueId,
        contactId,
        companyId
    });
    return res.status(200).json(contact);
};
exports.updateContactWallet = updateContactWallet;
const deleteContactWallet = async (req, res) => {
    const { contactId } = req.params;
    const { companyId } = req.user;
    const contact = await (0, DeleteContactWalletService_1.default)({
        contactId,
        companyId
    });
    return res.status(200).json(contact);
};
exports.deleteContactWallet = deleteContactWallet;
const listWhatsapp = async (req, res) => {
    const { name } = req.query;
    const { companyId } = req.user;
    const contactsAll = await (0, SimpleListService_1.default)({ name, companyId });
    const contacts = contactsAll.filter(contact => contact.channel == "whatsapp");
    return res.json(contacts);
};
exports.listWhatsapp = listWhatsapp;
const listWallets = async (req, res) => {
    const { searchParam, pageNumber, userId } = req.query;
    const { companyId } = req.user;
    const wallets = await (0, ListWalletsService_1.default)({
        searchParam,
        pageNumber,
        userId,
        companyId
    });
    return res.json(wallets);
};
exports.listWallets = listWallets;
const getContactMedia = async (req, res) => {
    const { contactId } = req.params;
    const { companyId } = req.user;
    const media = await (0, GetContactMediaService_1.default)({
        contactId: Number(contactId),
        companyId
    });
    return res.status(200).json(media);
};
exports.getContactMedia = getContactMedia;
const getGroupParticipants = async (req, res) => {
    const { contactId } = req.params;
    const { companyId } = req.user;
    try {
        const participants = await (0, GetGroupParticipantsService_1.default)({
            contactId: Number(contactId),
            companyId
        });
        return res.status(200).json(participants);
    }
    catch (error) {
        logger_1.default.error("Erro ao buscar participantes do grupo:", error);
        return res.status(500).json({
            error: "Erro interno do servidor",
            message: error.message
        });
    }
};
exports.getGroupParticipants = getGroupParticipants;
const searchMessages = async (req, res) => {
    const { contactId } = req.params;
    const { searchParam, pageNumber } = req.query;
    const { companyId } = req.user;
    if (!searchParam || searchParam.trim().length < 2) {
        return res.status(400).json({
            error: "Parâmetro de busca deve ter pelo menos 2 caracteres"
        });
    }
    try {
        const { messages, count, hasMore } = await (0, SearchContactMessagesService_1.default)({
            contactId: Number(contactId),
            companyId,
            searchParam: searchParam.trim(),
            pageNumber
        });
        return res.status(200).json({
            messages,
            count,
            hasMore
        });
    }
    catch (error) {
        console.error("Erro ao buscar mensagens:", error);
        return res.status(500).json({
            error: "Erro interno do servidor"
        });
    }
};
exports.searchMessages = searchMessages;
const bulkDelete = async (req, res) => {
    const bulkDeleteSchema = Yup.object().shape({
        contactIds: Yup.array()
            .of(commonSchemas_1.idSchema.required("Contact ID is required"))
            .min(1, "At least one contact ID is required")
            .max(100, "Maximum 100 contacts can be deleted at once")
            .required("Contact IDs array is required")
    });
    try {
        const { contactIds } = await bulkDeleteSchema.validate(req.body);
        const { companyId } = req.user;
        const sanitizedIds = contactIds.map(id => (0, sanitizers_1.sanitizeNumber)(id)).filter(id => id > 0);
        if (sanitizedIds.length === 0) {
            throw new AppError_1.default("No valid contact IDs provided", 400);
        }
        const deletedCount = await (0, BulkDeleteContactsService_1.default)({
            contactIds: sanitizedIds,
            companyId
        });
        const io = (0, socket_1.getIO)();
        io.of(String(companyId)).emit(`company-${companyId}-contact`, {
            action: "bulk-delete",
            contactIds: sanitizedIds,
            deletedCount
        });
        return res.status(200).json({
            message: `${deletedCount} contacts deleted successfully`,
            deletedCount,
            contactIds: sanitizedIds
        });
    }
    catch (err) {
        if (err.name === 'ValidationError') {
            throw new AppError_1.default(`Validation error: ${err.message}`, 400);
        }
        throw err;
    }
};
exports.bulkDelete = bulkDelete;
const deleteAll = async (req, res) => {
    const deleteAllSchema = Yup.object().shape({
        confirmation: Yup.string()
            .required("Confirmation is required")
            .matches(/^DELETE_ALL_CONTACTS$/, "Invalid confirmation string"),
        excludeIds: Yup.array()
            .of(commonSchemas_1.idSchema)
            .nullable()
    });
    try {
        const validatedData = await deleteAllSchema.validate(req.body);
        const { companyId } = req.user;
        const { excludeIds = [] } = validatedData;
        const sanitizedExcludeIds = excludeIds.map(id => (0, sanitizers_1.sanitizeNumber)(id)).filter(id => id > 0);
        const deletedCount = await (0, DeleteAllContactsService_1.default)({
            companyId,
            excludeIds: sanitizedExcludeIds
        });
        const io = (0, socket_1.getIO)();
        io.of(String(companyId)).emit(`company-${companyId}-contact`, {
            action: "delete-all",
            deletedCount,
            excludeIds: sanitizedExcludeIds
        });
        return res.status(200).json({
            message: `${deletedCount} contacts deleted successfully`,
            deletedCount
        });
    }
    catch (err) {
        if (err.name === 'ValidationError') {
            throw new AppError_1.default(`Validation error: ${err.message}`, 400);
        }
        throw err;
    }
};
exports.deleteAll = deleteAll;
