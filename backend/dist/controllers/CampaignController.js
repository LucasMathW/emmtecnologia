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
exports.getStats = exports.getShipping = exports.stopRecurrence = exports.previewRecurrence = exports.deleteMedia = exports.mediaUpload = exports.findList = exports.remove = exports.restart = exports.cancel = exports.show = exports.update = exports.store = exports.index = void 0;
const Yup = __importStar(require("yup"));
const socket_1 = require("../libs/socket");
const lodash_1 = require("lodash");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ListService_1 = __importDefault(require("../services/CampaignService/ListService"));
const ShowService_1 = __importDefault(require("../services/CampaignService/ShowService"));
const DeleteService_1 = __importDefault(require("../services/CampaignService/DeleteService"));
const FindService_1 = __importDefault(require("../services/CampaignService/FindService"));
const ShippingService_1 = __importDefault(require("../services/CampaignService/ShippingService"));
const CampaignStatsService_1 = __importDefault(require("../services/CampaignService/CampaignStatsService"));
const Campaign_1 = __importDefault(require("../models/Campaign"));
const ContactTag_1 = __importDefault(require("../models/ContactTag"));
const Contact_1 = __importDefault(require("../models/Contact"));
const ContactListItem_1 = __importDefault(require("../models/ContactListItem"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const CancelService_1 = require("../services/CampaignService/CancelService");
const RestartService_1 = require("../services/CampaignService/RestartService");
const RecurrenceService_1 = __importDefault(require("../services/CampaignService/RecurrenceService"));
const index = async (req, res) => {
    const { searchParam, pageNumber, pageSize, status, isRecurring } = req.query;
    const { companyId } = req.user;
    const { records, count, hasMore, totalPages, currentPage, pageSize: limit } = await (0, ListService_1.default)({
        searchParam,
        pageNumber,
        pageSize,
        companyId,
        status,
        isRecurring
    });
    return res.json({ records, count, hasMore, totalPages, currentPage, pageSize: limit });
};
exports.index = index;
// src/controllers/CampaignController.ts - Store method completo
const store = async (req, res) => {
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        name: Yup.string().required(),
        confirmation: Yup.boolean().required(),
        scheduledAt: Yup.string().required(),
        contactListId: Yup.number().nullable(),
        tagListId: Yup.string().nullable(),
        whatsappId: Yup.number().required(),
        userId: Yup.number().nullable(),
        queueId: Yup.number().nullable(),
        statusTicket: Yup.string().required(),
        openTicket: Yup.string().required(),
        // Validação de recorrência
        isRecurring: Yup.boolean().default(false),
        recurrenceType: Yup.string().when('isRecurring', {
            is: true,
            then: Yup.string().oneOf(['minutely', 'hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']).required(),
            otherwise: Yup.string().nullable()
        }),
        recurrenceInterval: Yup.number().when('isRecurring', {
            is: true,
            then: Yup.number().min(1).required(),
            otherwise: Yup.number().nullable()
        }),
        recurrenceDaysOfWeek: Yup.mixed().nullable(),
        recurrenceDayOfMonth: Yup.number().when(['isRecurring', 'recurrenceType'], {
            is: (isRecurring, recurrenceType) => isRecurring && recurrenceType === 'monthly',
            then: Yup.number().min(1).max(31).required(),
            otherwise: Yup.number().nullable()
        }),
        recurrenceEndDate: Yup.date().when('isRecurring', {
            is: true,
            then: Yup.date().min(new Date(), 'Data final deve ser futura').nullable(),
            otherwise: Yup.date().nullable()
        }),
        maxExecutions: Yup.number().when('isRecurring', {
            is: true,
            then: Yup.number().min(1).nullable(),
            otherwise: Yup.number().nullable()
        })
    });
    try {
        const { name, message1, message2, message3, message4, message5, confirmationMessage1, confirmationMessage2, confirmationMessage3, confirmationMessage4, confirmationMessage5, confirmation, scheduledAt, contactListId, tagListId, whatsappId, userId, queueId, statusTicket, openTicket, 
        // Novos campos de recorrência
        isRecurring, recurrenceType, recurrenceInterval, recurrenceDaysOfWeek, recurrenceDayOfMonth, recurrenceEndDate, maxExecutions } = req.body;
        console.log('[Campaign Store] Dados recebidos:', {
            isRecurring,
            recurrenceType,
            recurrenceDaysOfWeek,
            recurrenceDaysOfWeekType: typeof recurrenceDaysOfWeek,
            recurrenceDaysOfWeekIsArray: Array.isArray(recurrenceDaysOfWeek)
        });
        // Processar dados de recorrência com logs
        const processedRecurrenceData = {
            isRecurring: isRecurring || false,
            recurrenceType: isRecurring ? recurrenceType : null,
            recurrenceInterval: isRecurring ? (recurrenceInterval || 1) : null,
            recurrenceDaysOfWeek: (() => {
                if (!isRecurring)
                    return null;
                if (!recurrenceDaysOfWeek)
                    return null;
                if (Array.isArray(recurrenceDaysOfWeek)) {
                    return recurrenceDaysOfWeek.length > 0 ? JSON.stringify(recurrenceDaysOfWeek) : null;
                }
                if (typeof recurrenceDaysOfWeek === 'string') {
                    return recurrenceDaysOfWeek;
                }
                return null;
            })(),
            recurrenceDayOfMonth: (isRecurring && recurrenceType === 'monthly') ? recurrenceDayOfMonth : null,
            recurrenceEndDate: (isRecurring && recurrenceEndDate) ? new Date(recurrenceEndDate) : null,
            maxExecutions: (isRecurring && maxExecutions) ? maxExecutions : null,
            executionCount: 0,
            nextScheduledAt: null,
            lastExecutedAt: null
        };
        console.log('[Campaign Store] Dados processados:', processedRecurrenceData);
        const processedData = {
            name,
            message1: message1 || null,
            message2: message2 || null,
            message3: message3 || null,
            message4: message4 || null,
            message5: message5 || null,
            confirmationMessage1: confirmationMessage1 || null,
            confirmationMessage2: confirmationMessage2 || null,
            confirmationMessage3: confirmationMessage3 || null,
            confirmationMessage4: confirmationMessage4 || null,
            confirmationMessage5: confirmationMessage5 || null,
            confirmation,
            scheduledAt,
            contactListId: contactListId || null,
            tagListId: tagListId === "Nenhuma" ? null : tagListId,
            whatsappId,
            userId: userId || null,
            queueId: queueId || null,
            statusTicket,
            openTicket,
            companyId,
            status: "PROGRAMADA",
            // Adicionar campos de recorrência processados
            ...processedRecurrenceData
        };
        await schema.validate(processedData);
        const campaign = await Campaign_1.default.create(processedData);
        console.log('[Campaign Store] Campanha criada:', campaign.id);
        // Log detalhado com informações da lista/tag
        let totalContacts = 0;
        if (campaign.contactListId) {
            // Buscar total de contatos na lista
            totalContacts = await ContactListItem_1.default.count({
                where: { contactListId: campaign.contactListId }
            });
            console.log(`[Campaign Store] Campanha por lista - Total de contatos: ${totalContacts}`);
        }
        else if (campaign.tagListId) {
            // Buscar total de contatos na tag
            totalContacts = await ContactTag_1.default.count({
                where: { tagId: campaign.tagListId },
                include: [{
                        model: Contact_1.default,
                        as: "contact",
                        where: { companyId: campaign.companyId, active: true },
                        required: true
                    }]
            });
            console.log(`[Campaign Store] Campanha por tag - Total de contatos: ${totalContacts}`);
        }
        // Se for recorrente, calcular próxima execução
        if (campaign.isRecurring) {
            console.log('[Campaign Store] Configurando próxima execução para campanha recorrente');
            await RecurrenceService_1.default.scheduleNextExecution(campaign.id);
        }
        const io = (0, socket_1.getIO)();
        io.of(String(companyId))
            .emit(`company-${companyId}-campaign`, {
            action: "create",
            record: campaign
        });
        return res.status(200).json(campaign);
    }
    catch (err) {
        console.error('[Campaign Store] Erro:', err.message);
        throw new AppError_1.default(err.message);
    }
};
exports.store = store;
// Update method também precisa ser atualizado
const update = async (req, res) => {
    const { companyId } = req.user;
    const { campaignId } = req.params;
    const schema = Yup.object().shape({
        name: Yup.string().required(),
        confirmation: Yup.boolean().required(),
        scheduledAt: Yup.string().required(),
        contactListId: Yup.number().nullable(),
        tagListId: Yup.string().nullable(),
        whatsappId: Yup.number().required(),
        userId: Yup.number().nullable(),
        queueId: Yup.number().nullable(),
        statusTicket: Yup.string().required(),
        openTicket: Yup.string().required(),
        // Validação de recorrência
        isRecurring: Yup.boolean().default(false),
        recurrenceType: Yup.string().when('isRecurring', {
            is: true,
            then: Yup.string().oneOf(['minutely', 'hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']).required(),
            otherwise: Yup.string().nullable()
        }),
        recurrenceInterval: Yup.number().when('isRecurring', {
            is: true,
            then: Yup.number().min(1).required(),
            otherwise: Yup.number().nullable()
        }),
        recurrenceDaysOfWeek: Yup.mixed().nullable(),
        recurrenceDayOfMonth: Yup.number().when(['isRecurring', 'recurrenceType'], {
            is: (isRecurring, recurrenceType) => isRecurring && recurrenceType === 'monthly',
            then: Yup.number().min(1).max(31).required(),
            otherwise: Yup.number().nullable()
        }),
        recurrenceEndDate: Yup.date().when('isRecurring', {
            is: true,
            then: Yup.date().min(new Date(), 'Data final deve ser futura').nullable(),
            otherwise: Yup.date().nullable()
        }),
        maxExecutions: Yup.number().when('isRecurring', {
            is: true,
            then: Yup.number().min(1).nullable(),
            otherwise: Yup.number().nullable()
        })
    });
    try {
        const { name, message1, message2, message3, message4, message5, confirmationMessage1, confirmationMessage2, confirmationMessage3, confirmationMessage4, confirmationMessage5, confirmation, scheduledAt, contactListId, tagListId, whatsappId, userId, queueId, statusTicket, openTicket, 
        // Novos campos de recorrência
        isRecurring, recurrenceType, recurrenceInterval, recurrenceDaysOfWeek, recurrenceDayOfMonth, recurrenceEndDate, maxExecutions } = req.body;
        console.log('[Campaign Update] Dados recebidos:', {
            campaignId,
            isRecurring,
            recurrenceType,
            recurrenceDaysOfWeek,
            recurrenceDaysOfWeekType: typeof recurrenceDaysOfWeek,
            recurrenceDaysOfWeekIsArray: Array.isArray(recurrenceDaysOfWeek)
        });
        // Processar dados de recorrência
        const processedRecurrenceData = {
            isRecurring: isRecurring || false,
            recurrenceType: isRecurring ? recurrenceType : null,
            recurrenceInterval: isRecurring ? (recurrenceInterval || 1) : null,
            recurrenceDaysOfWeek: (() => {
                if (!isRecurring)
                    return null;
                if (!recurrenceDaysOfWeek)
                    return null;
                if (Array.isArray(recurrenceDaysOfWeek)) {
                    return recurrenceDaysOfWeek.length > 0 ? JSON.stringify(recurrenceDaysOfWeek) : null;
                }
                if (typeof recurrenceDaysOfWeek === 'string') {
                    return recurrenceDaysOfWeek;
                }
                return null;
            })(),
            recurrenceDayOfMonth: (isRecurring && recurrenceType === 'monthly') ? recurrenceDayOfMonth : null,
            recurrenceEndDate: (isRecurring && recurrenceEndDate) ? new Date(recurrenceEndDate) : null,
            maxExecutions: (isRecurring && maxExecutions) ? maxExecutions : null
        };
        const processedData = {
            name,
            message1: message1 || null,
            message2: message2 || null,
            message3: message3 || null,
            message4: message4 || null,
            message5: message5 || null,
            confirmationMessage1: confirmationMessage1 || null,
            confirmationMessage2: confirmationMessage2 || null,
            confirmationMessage3: confirmationMessage3 || null,
            confirmationMessage4: confirmationMessage4 || null,
            confirmationMessage5: confirmationMessage5 || null,
            confirmation,
            scheduledAt,
            contactListId: contactListId || null,
            tagListId: tagListId === "Nenhuma" ? null : tagListId,
            whatsappId,
            userId: userId || null,
            queueId: queueId || null,
            statusTicket,
            openTicket,
            companyId,
            // Adicionar campos de recorrência processados
            ...processedRecurrenceData
        };
        await schema.validate(processedData);
        const campaign = await Campaign_1.default.findOne({
            where: { id: campaignId, companyId },
            attributes: { exclude: ["createdAt", "updatedAt"] }
        });
        if (!campaign) {
            throw new AppError_1.default("ERR_NO_CAMPAIGN_FOUND", 404);
        }
        await campaign.update(processedData);
        console.log('[Campaign Update] Campanha atualizada:', campaign.id);
        // Se for recorrente, recalcular próxima execução
        if (campaign.isRecurring) {
            console.log('[Campaign Update] Reconfigurando próxima execução para campanha recorrente');
            await RecurrenceService_1.default.scheduleNextExecution(campaign.id);
        }
        const io = (0, socket_1.getIO)();
        io.of(String(companyId))
            .emit(`company-${companyId}-campaign`, {
            action: "update",
            record: campaign
        });
        return res.status(200).json(campaign);
    }
    catch (err) {
        console.error('[Campaign Update] Erro:', err.message);
        throw new AppError_1.default(err.message);
    }
};
exports.update = update;
const show = async (req, res) => {
    const { id } = req.params;
    const record = await (0, ShowService_1.default)(id);
    return res.status(200).json(record);
};
exports.show = show;
const cancel = async (req, res) => {
    const { id } = req.params;
    await (0, CancelService_1.CancelService)(+id);
    return res.status(204).json({ message: "Cancelamento realizado" });
};
exports.cancel = cancel;
const restart = async (req, res) => {
    const { id } = req.params;
    await (0, RestartService_1.RestartService)(+id);
    return res.status(204).json({ message: "Reinício dos disparos" });
};
exports.restart = restart;
const remove = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    await (0, DeleteService_1.default)(id);
    const io = (0, socket_1.getIO)();
    io.of(String(companyId))
        .emit(`company-${companyId}-campaign`, {
        action: "delete",
        id
    });
    return res.status(200).json({ message: "Campaign deleted" });
};
exports.remove = remove;
const findList = async (req, res) => {
    const params = req.query;
    const records = await (0, FindService_1.default)(params);
    return res.status(200).json(records);
};
exports.findList = findList;
const mediaUpload = async (req, res) => {
    const { id } = req.params;
    const files = req.files;
    const file = (0, lodash_1.head)(files);
    try {
        const campaign = await Campaign_1.default.findByPk(id);
        campaign.mediaPath = file.filename;
        campaign.mediaName = file.originalname;
        await campaign.save();
        return res.send({ mensagem: "Mensagem enviada" });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
};
exports.mediaUpload = mediaUpload;
const deleteMedia = async (req, res) => {
    const { companyId } = req.user;
    const { id } = req.params;
    try {
        const campaign = await Campaign_1.default.findByPk(id);
        const filePath = path_1.default.resolve("public", `company${companyId}`, campaign.mediaPath);
        const fileExists = fs_1.default.existsSync(filePath);
        if (fileExists) {
            fs_1.default.unlinkSync(filePath);
        }
        campaign.mediaPath = null;
        campaign.mediaName = null;
        await campaign.save();
        return res.send({ mensagem: "Arquivo excluído" });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
};
exports.deleteMedia = deleteMedia;
const previewRecurrence = async (req, res) => {
    const { id } = req.params;
    const { recurrenceType, recurrenceInterval, recurrenceDaysOfWeek, recurrenceDayOfMonth } = req.query;
    try {
        const campaign = await Campaign_1.default.findByPk(id);
        if (!campaign) {
            throw new AppError_1.default("Campanha não encontrada", 404);
        }
        const config = {
            type: recurrenceType,
            interval: parseInt(recurrenceInterval),
            daysOfWeek: recurrenceDaysOfWeek ? JSON.parse(recurrenceDaysOfWeek) : undefined,
            dayOfMonth: recurrenceDayOfMonth ? parseInt(recurrenceDayOfMonth) : undefined
        };
        const executions = [];
        let currentDate = new Date(campaign.scheduledAt);
        for (let i = 0; i < 10; i++) { // Preview das próximas 10 execuções
            executions.push(new Date(currentDate));
            currentDate = RecurrenceService_1.default.calculateNextExecution(currentDate, config);
        }
        return res.json({ executions });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
};
exports.previewRecurrence = previewRecurrence;
const stopRecurrence = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    try {
        const campaign = await Campaign_1.default.findByPk(id);
        if (!campaign) {
            throw new AppError_1.default("Campanha não encontrada", 404);
        }
        await campaign.update({
            isRecurring: false,
            nextScheduledAt: null,
            status: campaign.status === 'PROGRAMADA' ? 'FINALIZADA' : campaign.status
        });
        const io = (0, socket_1.getIO)();
        io.of(String(companyId))
            .emit(`company-${companyId}-campaign`, {
            action: "update",
            record: campaign
        });
        return res.status(200).json({ message: "Recorrência interrompida com sucesso" });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
};
exports.stopRecurrence = stopRecurrence;
// Novo endpoint para dados de shipping com paginação
const getShipping = async (req, res) => {
    const { id } = req.params;
    const { page = 1, pageSize = 50, searchParam, status } = req.query;
    try {
        const result = await (0, ShippingService_1.default)({
            campaignId: id,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            searchParam: searchParam,
            status: status
        });
        return res.status(200).json(result);
    }
    catch (err) {
        console.error("Erro ao buscar dados de shipping:", err);
        throw new AppError_1.default(err.message || "Erro interno do servidor", 500);
    }
};
exports.getShipping = getShipping;
// Novo endpoint para estatísticas da campanha
const getStats = async (req, res) => {
    const { id } = req.params;
    try {
        const stats = await (0, CampaignStatsService_1.default)(id);
        return res.status(200).json(stats);
    }
    catch (err) {
        console.error("Erro ao buscar estatísticas da campanha:", err);
        throw new AppError_1.default(err.message || "Erro interno do servidor", 500);
    }
};
exports.getStats = getStats;
