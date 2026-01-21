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
exports.BirthdayService = void 0;
const User_1 = __importDefault(require("../../models/User"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const BirthdaySettings_1 = __importDefault(require("../../models/BirthdaySettings"));
const Announcement_1 = __importDefault(require("../../models/Announcement"));
const Company_1 = __importDefault(require("../../models/Company"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const socket_1 = require("../../libs/socket");
const SendWhatsAppMessage_1 = __importDefault(require("../WbotServices/SendWhatsAppMessage"));
const FindOrCreateTicketService_1 = __importDefault(require("../TicketServices/FindOrCreateTicketService"));
const logger_1 = __importDefault(require("../../utils/logger"));
const GetDefaultWhatsApp_1 = __importDefault(require("../../helpers/GetDefaultWhatsApp"));
const sequelize_1 = require("sequelize");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const redisClient_1 = require("../../libs/redisClient");
const CreateMessageService_1 = __importDefault(require("../MessageServices/CreateMessageService"));
class BirthdayService {
    /**
     * Verifica se a mensagem de aniversário já foi enviada para um contato hoje
     */
    static async isMessageSentToday(contactId, companyId) {
        const todayKey = (0, moment_timezone_1.default)().tz("America/Sao_Paulo").format("YYYYMMDD");
        const dedupKey = `birthday:sent:${companyId}:${contactId}:${todayKey}`;
        try {
            const exists = await redisClient_1.redisClient.get(dedupKey);
            return exists !== null;
        }
        catch (error) {
            logger_1.default.error(`🎂 Error checking if message was sent for contact ${contactId}:`, error);
            return false;
        }
    }
    /**
     * Busca todos os aniversariantes do dia de uma empresa
     */
    static async getTodayBirthdaysForCompany(companyId) {
        // Buscar configurações da empresa
        const settings = await BirthdaySettings_1.default.getCompanySettings(companyId);
        // Usar moment com timezone brasileiro
        const today = (0, moment_timezone_1.default)().tz("America/Sao_Paulo");
        const month = today.month() + 1; // moment month começa em 0
        const day = today.date();
        logger_1.default.info(`🎂 [DEBUG] Buscando aniversariantes: Data de hoje = ${today.format('DD/MM/YYYY')}, Mês = ${month}, Dia = ${day}`);
        // Buscar usuários aniversariantes
        let users = [];
        if (settings.userBirthdayEnabled) {
            const allUsers = await User_1.default.findAll({
                where: {
                    companyId,
                    birthDate: {
                        [sequelize_1.Op.ne]: null
                    }
                },
                raw: true
            });
            logger_1.default.info(`🎂 [DEBUG] Total de usuários com birthDate na empresa ${companyId}: ${allUsers.length}`);
            // Debug: mostrar todas as datas de nascimento
            allUsers.forEach(user => {
                const userBirthDate = (0, moment_timezone_1.default)(user.birthDate).tz("America/Sao_Paulo");
                logger_1.default.info(`🎂 [DEBUG] Usuário ${user.name} (ID: ${user.id}) - birthDate: ${user.birthDate} - Formatado: ${userBirthDate.format('DD/MM/YYYY')}`);
            });
            // Filtrar aniversariantes de hoje
            const todayBirthdays = allUsers.filter(user => {
                if (!user.birthDate)
                    return false;
                // Usar moment para comparação consistente
                const birthDate = (0, moment_timezone_1.default)(user.birthDate).tz("America/Sao_Paulo");
                const birthMonth = birthDate.month() + 1;
                const birthDay = birthDate.date();
                const isToday = birthMonth === month && birthDay === day;
                if (isToday) {
                    logger_1.default.info(`🎂 [MATCH] Usuário ${user.name} faz aniversário hoje! Nascimento: ${birthDate.format('DD/MM/YYYY')}`);
                }
                return isToday;
            });
            logger_1.default.info(`🎂 [DEBUG] Usuários aniversariantes hoje: ${todayBirthdays.length}`);
            users = todayBirthdays.map(user => {
                const birthDate = (0, moment_timezone_1.default)(user.birthDate).tz("America/Sao_Paulo");
                const age = today.year() - birthDate.year();
                return {
                    id: user.id,
                    name: user.name,
                    type: 'user',
                    age: age,
                    birthDate: user.birthDate,
                    companyId: user.companyId
                };
            });
        }
        // Buscar contatos aniversariantes
        let contacts = [];
        if (settings.contactBirthdayEnabled) {
            const allContacts = await Contact_1.default.findAll({
                where: {
                    companyId,
                    active: true,
                    birthDate: {
                        [sequelize_1.Op.ne]: null
                    }
                },
                include: ['whatsapp'],
                raw: false
            });
            logger_1.default.info(`🎂 [DEBUG] Total de contatos com birthDate na empresa ${companyId}: ${allContacts.length}`);
            // Debug: mostrar todas as datas de nascimento
            allContacts.forEach(contact => {
                const contactBirthDate = (0, moment_timezone_1.default)(contact.birthDate).tz("America/Sao_Paulo");
                logger_1.default.info(`🎂 [DEBUG] Contato ${contact.name} (ID: ${contact.id}) - birthDate: ${contact.birthDate} - Formatado: ${contactBirthDate.format('DD/MM/YYYY')}`);
            });
            // Filtrar aniversariantes de hoje
            const todayBirthdays = allContacts.filter(contact => {
                if (!contact.birthDate)
                    return false;
                // Usar moment para comparação consistente
                const birthDate = (0, moment_timezone_1.default)(contact.birthDate).tz("America/Sao_Paulo");
                const birthMonth = birthDate.month() + 1;
                const birthDay = birthDate.date();
                const isToday = birthMonth === month && birthDay === day;
                if (isToday) {
                    logger_1.default.info(`🎂 [MATCH] Contato ${contact.name} faz aniversário hoje! Nascimento: ${birthDate.format('DD/MM/YYYY')}`);
                }
                return isToday;
            });
            logger_1.default.info(`🎂 [DEBUG] Contatos aniversariantes hoje: ${todayBirthdays.length}`);
            // Mapear contatos e verificar se mensagem já foi enviada
            contacts = await Promise.all(todayBirthdays.map(async (contact) => {
                const birthDate = (0, moment_timezone_1.default)(contact.birthDate).tz("America/Sao_Paulo");
                const age = today.year() - birthDate.year();
                // Verificar se mensagem já foi enviada hoje
                const messageSent = await this.isMessageSentToday(contact.id, companyId);
                return {
                    id: contact.id,
                    name: contact.name,
                    type: 'contact',
                    age: age,
                    birthDate: contact.birthDate,
                    companyId: contact.companyId,
                    whatsappId: contact.whatsappId,
                    contactNumber: contact.number,
                    messageSent
                };
            }));
        }
        logger_1.default.info(`🎂 [RESULTADO] Empresa ${companyId}: ${users.length} usuários e ${contacts.length} contatos aniversariantes hoje`);
        return {
            users,
            contacts,
            settings
        };
    }
    /**
     * Busca aniversariantes de todas as empresas
     */
    static async getAllTodayBirthdays() {
        const companies = await Company_1.default.findAll({
            where: { status: true },
            attributes: ['id']
        });
        const result = {};
        for (const company of companies) {
            const birthdayData = await this.getTodayBirthdaysForCompany(company.id);
            if (birthdayData.users.length > 0 || birthdayData.contacts.length > 0) {
                result[company.id] = birthdayData;
            }
        }
        return result;
    }
    /**
     * Envia mensagem de aniversário para um contato
     */
    static async sendBirthdayMessageToContact(contactId, companyId, customMessage) {
        try {
            // Deduplicação: evita envio duplicado no mesmo dia por contato/empresa
            const todayKey = (0, moment_timezone_1.default)().tz("America/Sao_Paulo").format("YYYYMMDD");
            const dedupKey = `birthday:sent:${companyId}:${contactId}:${todayKey}`;
            const wasSet = await redisClient_1.redisClient.set(dedupKey, "1", "EX", 60 * 60 * 48, "NX");
            if (wasSet === null) {
                logger_1.default.info(`🎂 [DEDUP] Mensagem de aniversário já enviada hoje para contactId=${contactId}, companyId=${companyId}`);
                throw new Error("MESSAGE_ALREADY_SENT");
            }
            const contact = await Contact_1.default.findOne({
                where: { id: contactId, companyId },
                include: ['whatsapp']
            });
            if (!contact) {
                logger_1.default.warn(`Contact ${contactId} not found`);
                return false;
            }
            // Buscar configurações da empresa
            const settings = await BirthdaySettings_1.default.getCompanySettings(companyId);
            // Usar conexão WhatsApp específica das configurações ou fallback para padrão
            let whatsapp;
            if (settings.whatsappId && settings.whatsappId !== null) {
                whatsapp = await Whatsapp_1.default.findOne({
                    where: { id: settings.whatsappId, companyId, status: "CONNECTED" }
                });
                if (!whatsapp) {
                    logger_1.default.warn(`WhatsApp connection ${settings.whatsappId} not found or not connected, using default`);
                    whatsapp = await (0, GetDefaultWhatsApp_1.default)(companyId);
                }
            }
            else {
                whatsapp = await (0, GetDefaultWhatsApp_1.default)(companyId);
            }
            if (!whatsapp) {
                logger_1.default.warn(`No WhatsApp connection found for company ${companyId}`);
                return false;
            }
            // Usar mensagem personalizada ou padrão
            let message = customMessage || settings.contactBirthdayMessage;
            // Substituir placeholders
            message = message.replace(/{nome}/g, contact.name);
            if (contact.currentAge) {
                message = message.replace(/{idade}/g, contact.currentAge.toString());
            }
            // Criar ou buscar ticket para o contato
            const ticket = await (0, FindOrCreateTicketService_1.default)(contact, whatsapp, 0, companyId, null, null, null, whatsapp.channel, null, false, settings, false, false);
            // Enviar mensagem
            const sentMessage = await (0, SendWhatsAppMessage_1.default)({
                body: `\u200e ${message}`,
                ticket
            });
            // Garantir registro da mensagem no ticket (persistência no FE)
            try {
                const wid = sentMessage?.key?.id;
                if (wid) {
                    await (0, CreateMessageService_1.default)({
                        companyId,
                        messageData: {
                            wid,
                            ticketId: ticket.id,
                            contactId: contact.id,
                            body: message,
                            fromMe: true,
                            read: true,
                            channel: whatsapp.channel
                        }
                    });
                }
                else {
                    logger_1.default.warn(`🎂 [WARN] Wid ausente ao enviar mensagem de aniversário para contactId=${contactId}`);
                }
            }
            catch (persistErr) {
                logger_1.default.error(`🎂 [ERROR] Falha ao persistir mensagem de aniversário contactId=${contactId}:`, persistErr);
            }
            logger_1.default.info(`🎂 Birthday message sent to contact ${contact.name} (${contact.id})`);
            return true;
        }
        catch (error) {
            logger_1.default.error(`🎂 Error sending birthday message to contact ${contactId}:`, error);
            return false;
        }
    }
    /**
     * Cria informativo de aniversário para usuário
     */
    static async createUserBirthdayAnnouncement(user, settings) {
        if (!settings.createAnnouncementForUsers)
            return;
        try {
            // Criar informativo para a empresa do usuário
            const announcement = await Announcement_1.default.createBirthdayAnnouncement(1, // Company ID 1 (sistema) cria o informativo
            user.companyId, // Mas é direcionado para a empresa do usuário
            user);
            // 🎂 SOCKET CORRIGIDO: Emitir evento de announcement
            try {
                const io = (0, socket_1.getIO)();
                io.of(`/${user.companyId}`).emit("company-announcement", {
                    action: "create",
                    record: announcement
                });
            }
            catch (socketError) {
                logger_1.default.warn("🎂 Socket not available for announcement emission:", socketError);
            }
            logger_1.default.info(`🎂 Birthday announcement created for user ${user.name} (${user.id})`);
        }
        catch (error) {
            logger_1.default.error(`🎂 Error creating birthday announcement for user ${user.id}:`, error);
        }
    }
    /**
     * Processa todos os aniversários do dia
     */
    static async processTodayBirthdays() {
        const today = new Date();
        logger_1.default.info(`🎂 Iniciando processamento de aniversários para ${today.toDateString()}`);
        try {
            const allBirthdays = await this.getAllTodayBirthdays();
            logger_1.default.info(`🎂 Total de empresas com aniversariantes: ${Object.keys(allBirthdays).length}`);
            for (const [companyId, birthdayData] of Object.entries(allBirthdays)) {
                const companyIdNum = parseInt(companyId);
                const { users, contacts, settings } = birthdayData;
                logger_1.default.info(`🎂 Processando empresa ${companyId}: ${users.length} usuários, ${contacts.length} contatos`);
                // Processar aniversários de usuários
                for (const userBirthday of users) {
                    const user = await User_1.default.findByPk(userBirthday.id);
                    if (user) {
                        await this.createUserBirthdayAnnouncement(user, settings);
                        logger_1.default.info(`🎉 Processado aniversário do usuário: ${user.name}`);
                    }
                }
                // Processar aniversários de contatos (envio automático se habilitado)
                for (const contactBirthday of contacts) {
                    if (settings.contactBirthdayEnabled) {
                        await this.sendBirthdayMessageToContact(contactBirthday.id, companyIdNum);
                    }
                    logger_1.default.info(`🎉 Processado aniversário do contato: ${contactBirthday.name}`);
                }
                // 🎂 SOCKET CORRIGIDO: Emitir eventos via socket usando função específica
                try {
                    await (0, socket_1.emitBirthdayEvents)(companyIdNum);
                }
                catch (socketError) {
                    logger_1.default.warn("🎂 Socket not available for birthday events:", socketError);
                }
            }
            // Limpar informativos expirados
            try {
                const { default: Announcement } = await Promise.resolve().then(() => __importStar(require("../../models/Announcement")));
                const cleanedCount = await Announcement.cleanExpiredAnnouncements();
                if (cleanedCount > 0) {
                    logger_1.default.info(`🗑️ Cleaned ${cleanedCount} expired announcements`);
                }
            }
            catch (error) {
                logger_1.default.error("🎂 Error cleaning expired announcements:", error);
            }
            logger_1.default.info('🎂 Processamento de aniversários concluído com sucesso');
        }
        catch (error) {
            logger_1.default.error('❌ Erro no processamento de aniversários:', error);
        }
    }
    /**
     * 🎂 NOVO: Emitir eventos de aniversário para uma empresa via socket
     */
    static async emitBirthdayEventsForCompany(companyId) {
        try {
            await (0, socket_1.emitBirthdayEvents)(companyId);
        }
        catch (error) {
            logger_1.default.error(`🎂 Error emitting birthday events for company ${companyId}:`, error);
        }
    }
    /**
     * Atualiza configurações de aniversário de uma empresa
     */
    static async updateBirthdaySettings(companyId, settingsData) {
        let settings = await BirthdaySettings_1.default.findOne({
            where: { companyId }
        });
        if (!settings) {
            settings = await BirthdaySettings_1.default.create({
                companyId,
                ...settingsData
            });
        }
        else {
            await settings.update(settingsData);
        }
        return settings;
    }
    /**
     * Busca configurações de aniversário de uma empresa
     */
    static async getBirthdaySettings(companyId) {
        return BirthdaySettings_1.default.getCompanySettings(companyId);
    }
}
exports.BirthdayService = BirthdayService;
exports.default = BirthdayService;
