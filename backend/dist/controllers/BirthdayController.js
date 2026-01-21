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
exports.diagnoseBirthday = exports.debugBirthdaySystem = exports.testBirthdayMessage = exports.triggerBirthdaySystem = exports.emitBirthdaySocketEvents = exports.processTodayBirthdays = exports.sendBirthdayMessage = exports.updateBirthdaySettings = exports.getBirthdaySettings = exports.getTodayBirthdays = void 0;
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const BirthdayService_1 = __importDefault(require("../services/BirthdayService/BirthdayService"));
const BirthdaySettings_1 = __importDefault(require("../models/BirthdaySettings"));
const User_1 = __importDefault(require("../models/User"));
const socket_1 = require("../libs/socket"); //  NOVO IMPORT
const BirthdayJob_1 = require("../jobs/BirthdayJob"); //  NOVO IMPORT
const logger_1 = __importDefault(require("../utils/logger"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
// Schema de validação para configurações de aniversário
const BirthdaySettingsSchema = Yup.object().shape({
    userBirthdayEnabled: Yup.boolean(),
    contactBirthdayEnabled: Yup.boolean(),
    userBirthdayMessage: Yup.string().max(1000, "Mensagem muito longa"),
    contactBirthdayMessage: Yup.string().max(1000, "Mensagem muito longa"),
    sendBirthdayTime: Yup.string().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Formato de horário inválido (HH:MM ou HH:MM:SS)"),
    createAnnouncementForUsers: Yup.boolean(),
    whatsappId: Yup.number().nullable().optional()
});
// Schema para envio manual de mensagem
const SendBirthdayMessageSchema = Yup.object().shape({
    contactId: Yup.number().required("ID do contato é obrigatório"),
    customMessage: Yup.string().optional().max(1000, "Mensagem muito longa")
});
const getTodayBirthdays = async (req, res) => {
    try {
        const { companyId } = req.user;
        logger_1.default.info(` [API] Buscando aniversariantes para empresa ${companyId}`);
        const birthdayData = await BirthdayService_1.default.getTodayBirthdaysForCompany(companyId);
        logger_1.default.info(` [API] Encontrados: ${birthdayData.users.length} usuários, ${birthdayData.contacts.length} contatos`);
        return res.json({
            status: "success",
            data: birthdayData
        });
    }
    catch (err) {
        logger_1.default.error(" [ERROR] Erro ao buscar aniversariantes:", err);
        throw new AppError_1.default("Erro ao buscar aniversariantes de hoje", 500);
    }
};
exports.getTodayBirthdays = getTodayBirthdays;
const getBirthdaySettings = async (req, res) => {
    try {
        const { companyId } = req.user;
        const settings = await BirthdayService_1.default.getBirthdaySettings(companyId);
        return res.json({
            status: "success",
            data: settings
        });
    }
    catch (err) {
        console.error("Error fetching birthday settings:", err);
        throw new AppError_1.default("Erro ao buscar configurações de aniversário", 500);
    }
};
exports.getBirthdaySettings = getBirthdaySettings;
// Função para normalizar horário para formato HH:MM:SS
const normalizeTime = (timeString) => {
    if (!timeString)
        return "09:00:00";
    // Se já está no formato HH:MM:SS, retorna como está
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(timeString)) {
        return timeString;
    }
    // Se está no formato HH:MM, adiciona :00
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString)) {
        return `${timeString}:00`;
    }
    // Se formato inválido, retorna padrão
    return "09:00:00";
};
const updateBirthdaySettings = async (req, res) => {
    try {
        const { companyId } = req.user;
        const settingsData = req.body;
        // Normalizar horário antes da validação
        if (settingsData.sendBirthdayTime) {
            settingsData.sendBirthdayTime = normalizeTime(settingsData.sendBirthdayTime);
        }
        // Validar dados de entrada
        try {
            await BirthdaySettingsSchema.validate(settingsData);
        }
        catch (err) {
            throw new AppError_1.default(err.message, 400);
        }
        const settings = await BirthdayService_1.default.updateBirthdaySettings(companyId, settingsData);
        return res.json({
            status: "success",
            message: "Configurações de aniversário atualizadas com sucesso",
            data: settings
        });
    }
    catch (err) {
        if (err instanceof AppError_1.default) {
            throw err;
        }
        console.error("Error updating birthday settings:", err);
        throw new AppError_1.default("Erro ao atualizar configurações de aniversário", 500);
    }
};
exports.updateBirthdaySettings = updateBirthdaySettings;
const sendBirthdayMessage = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { contactId, customMessage } = req.body;
        // Validar dados de entrada
        try {
            await SendBirthdayMessageSchema.validate(req.body);
        }
        catch (err) {
            throw new AppError_1.default(err.message, 400);
        }
        const success = await BirthdayService_1.default.sendBirthdayMessageToContact(contactId, companyId, customMessage);
        if (!success) {
            throw new AppError_1.default("Erro ao enviar mensagem de aniversário", 400);
        }
        return res.json({
            status: "success",
            message: "Mensagem de aniversário enviada com sucesso"
        });
    }
    catch (err) {
        if (err instanceof AppError_1.default) {
            throw err;
        }
        // Verificar se é erro de mensagem já enviada
        if (err.message === "MESSAGE_ALREADY_SENT") {
            throw new AppError_1.default("Mensagem de aniversário já foi enviada hoje para este contato", 409);
        }
        console.error("Error sending birthday message:", err);
        throw new AppError_1.default("Erro ao enviar mensagem de aniversário", 500);
    }
};
exports.sendBirthdayMessage = sendBirthdayMessage;
// Endpoint para processar aniversários manualmente (admin)
const processTodayBirthdays = async (req, res) => {
    try {
        const { profile } = req.user;
        // Só admin pode executar processamento manual
        if (profile !== 'admin') {
            throw new AppError_1.default("Acesso negado", 403);
        }
        await BirthdayService_1.default.processTodayBirthdays();
        return res.json({
            status: "success",
            message: "Processamento de aniversários executado com sucesso"
        });
    }
    catch (err) {
        if (err instanceof AppError_1.default) {
            throw err;
        }
        console.error("Error processing birthdays:", err);
        throw new AppError_1.default("Erro ao processar aniversários", 500);
    }
};
exports.processTodayBirthdays = processTodayBirthdays;
//  NOVO: Endpoint para emitir eventos de aniversário via socket
const emitBirthdaySocketEvents = async (req, res) => {
    try {
        const { companyId } = req.user;
        logger_1.default.info(` [SOCKET] Emitindo eventos de aniversário para empresa ${companyId}`);
        // Emitir eventos via socket para a empresa
        await (0, socket_1.emitBirthdayEvents)(companyId);
        return res.json({
            status: "success",
            message: "Eventos de aniversário emitidos via socket com sucesso"
        });
    }
    catch (err) {
        logger_1.default.error(" [ERROR] Erro ao emitir eventos via socket:", err);
        throw new AppError_1.default("Erro ao emitir eventos de aniversário", 500);
    }
};
exports.emitBirthdaySocketEvents = emitBirthdaySocketEvents;
//  NOVO: Endpoint para trigger manual do sistema completo de aniversários
const triggerBirthdaySystem = async (req, res) => {
    try {
        const { profile, companyId } = req.user;
        // Só admin pode executar trigger manual
        if (profile !== 'admin') {
            throw new AppError_1.default("Acesso negado", 403);
        }
        logger_1.default.info(` [TRIGGER] Executando trigger manual do sistema de aniversários para empresa ${companyId}`);
        // Executar verificação manual via job
        await (0, BirthdayJob_1.triggerBirthdayCheck)(companyId);
        return res.json({
            status: "success",
            message: "Sistema de aniversários executado com sucesso via socket"
        });
    }
    catch (err) {
        logger_1.default.error(" [ERROR] Erro no trigger do sistema:", err);
        throw new AppError_1.default("Erro ao executar sistema de aniversários", 500);
    }
};
exports.triggerBirthdaySystem = triggerBirthdaySystem;
// Endpoint para testar configurações de aniversário
const testBirthdayMessage = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { contactId, messageType } = req.body;
        if (!contactId || !messageType) {
            throw new AppError_1.default("ID do contato e tipo de mensagem são obrigatórios", 400);
        }
        const settings = await BirthdayService_1.default.getBirthdaySettings(companyId);
        let testMessage = "";
        if (messageType === 'contact') {
            testMessage = `[TESTE] ${settings.contactBirthdayMessage}`;
        }
        else {
            testMessage = `[TESTE] ${settings.userBirthdayMessage}`;
        }
        const success = await BirthdayService_1.default.sendBirthdayMessageToContact(contactId, companyId, testMessage);
        if (!success) {
            throw new AppError_1.default("Erro ao enviar mensagem de teste", 400);
        }
        return res.json({
            status: "success",
            message: "Mensagem de teste enviada com sucesso"
        });
    }
    catch (err) {
        if (err instanceof AppError_1.default) {
            throw err;
        }
        console.error("Error sending test message:", err);
        throw new AppError_1.default("Erro ao enviar mensagem de teste", 500);
    }
};
exports.testBirthdayMessage = testBirthdayMessage;
//  ENDPOINT DE DEBUG: Para facilitar desenvolvimento e troubleshooting
const debugBirthdaySystem = async (req, res) => {
    try {
        const { companyId } = req.user;
        const today = new Date();
        logger_1.default.info(` [DEBUG] Executando debug do sistema de aniversários`);
        // Buscar dados completos para debug
        const birthdayData = await BirthdayService_1.default.getTodayBirthdaysForCompany(companyId);
        // Buscar TODOS os usuários e contatos com data de nascimento
        const { Op } = require('sequelize');
        const User = require('../models/User').default;
        const Contact = require('../models/Contact').default;
        const allUsers = await User.findAll({
            where: {
                companyId,
                birthDate: { [Op.ne]: null }
            },
            attributes: ['id', 'name', 'birthDate']
        });
        const allContacts = await Contact.findAll({
            where: {
                companyId,
                birthDate: { [Op.ne]: null }
            },
            attributes: ['id', 'name', 'birthDate']
        });
        // Executar emit de teste
        try {
            await (0, socket_1.emitBirthdayEvents)(companyId);
        }
        catch (socketError) {
            logger_1.default.warn(" [DEBUG] Socket emission failed:", socketError);
        }
        return res.json({
            status: "success",
            debug: {
                serverTime: today.toISOString(),
                serverDate: today.toDateString(),
                month: today.getMonth() + 1,
                day: today.getDate(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                companyId,
                totalUsersWithBirthDate: allUsers.length,
                totalContactsWithBirthDate: allContacts.length,
                usersWithBirthDate: allUsers.map(u => ({
                    id: u.id,
                    name: u.name,
                    birthDate: u.birthDate,
                    parsedDate: new Date(u.birthDate).toDateString()
                })),
                contactsWithBirthDate: allContacts.map(c => ({
                    id: c.id,
                    name: c.name,
                    birthDate: c.birthDate,
                    parsedDate: new Date(c.birthDate).toDateString()
                })),
                socketEmissionAttempted: true
            },
            data: birthdayData
        });
    }
    catch (err) {
        logger_1.default.error(" [ERROR] Erro no debug:", err);
        throw new AppError_1.default("Erro no debug do sistema de aniversários", 500);
    }
};
exports.debugBirthdaySystem = debugBirthdaySystem;
// Endpoint para diagnóstico de aniversários (apenas para desenvolvimento)
const diagnoseBirthday = async (req, res) => {
    try {
        const { userName } = req.query;
        logger_1.default.info(`🔍 DIAGNÓSTICO: Verificando aniversário de ${userName}`);
        // 1. Verificar se usuário existe e tem data de nascimento
        const user = await User_1.default.findOne({
            where: { name: { [require('sequelize').Op.iLike]: `%${userName}%` } }
        });
        if (!user) {
            return res.json({
                status: "error",
                message: `Usuário ${userName} não encontrado`
            });
        }
        // 2. Verificar configurações da empresa
        const settings = await BirthdaySettings_1.default.getCompanySettings(user.companyId);
        // 3. Verificar se é aniversário hoje (usando a mesma lógica do User.getTodayBirthdays)
        const today = new Date();
        const month = today.getMonth() + 1; // moment usa 1-12, Date usa 0-11
        const day = today.getDate();
        const birthDate = (0, moment_timezone_1.default)(user.birthDate).tz("America/Sao_Paulo");
        const birthMonth = birthDate.month() + 1;
        const birthDay = birthDate.date();
        const isToday = birthMonth === month && birthDay === day;
        logger_1.default.info(`🔍 Diagnóstico: ${user.name}`);
        logger_1.default.info(`📅 Data atual: ${today.toDateString()}`);
        logger_1.default.info(`📅 Data nascimento: ${birthDate.format('DD/MM/YYYY')}`);
        logger_1.default.info(`📅 Mês atual: ${month}, Dia atual: ${day}`);
        logger_1.default.info(`📅 Mês nascimento: ${birthMonth}, Dia nascimento: ${birthDay}`);
        logger_1.default.info(`🎂 É aniversário? ${isToday}`);
        // 4. Testar busca de aniversários
        const birthdayUsers = await User_1.default.getTodayBirthdays(user.companyId);
        const isInList = birthdayUsers.some(u => u.id === user.id);
        return res.json({
            status: "success",
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    birthDate: user.birthDate,
                    companyId: user.companyId
                },
                settings: {
                    userBirthdayEnabled: settings.userBirthdayEnabled,
                    createAnnouncementForUsers: settings.createAnnouncementForUsers
                },
                today: {
                    date: today.toDateString(),
                    isBirthday: isToday
                },
                birthdayList: {
                    total: birthdayUsers.length,
                    isInList: isInList,
                    users: birthdayUsers.map(u => ({ id: u.id, name: u.name }))
                }
            }
        });
    }
    catch (error) {
        logger_1.default.error("Erro no diagnóstico:", error);
        throw new AppError_1.default("Erro no diagnóstico de aniversário", 500);
    }
};
exports.diagnoseBirthday = diagnoseBirthday;
