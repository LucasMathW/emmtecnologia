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
exports.triggerBirthdayCheck = exports.initializeBirthdayJobs = exports.startDynamicBirthdayJob = exports.startCleanupJob = exports.emitBirthdayEventsToAllCompanies = exports.startBirthdayNotificationJob = exports.startBirthdayJob = void 0;
const BirthdayService_1 = __importDefault(require("../services/BirthdayService/BirthdayService"));
const socket_1 = require("../libs/socket"); //  NOVO IMPORT
const logger_1 = __importDefault(require("../utils/logger"));
const Company_1 = __importDefault(require("../models/Company"));
const BirthdaySettings_1 = __importDefault(require("../models/BirthdaySettings"));
const CronJob = require("cron").CronJob;
/**
 * Job para processar aniversários diariamente
 * Executa todos os dias às 09:00
 */
const startBirthdayJob = () => {
    const birthdayJob = new CronJob("0 0 9 * * *", // Todos os dias às 09:00
    async () => {
        logger_1.default.info(" Starting daily birthday processing job...");
        try {
            await BirthdayService_1.default.processTodayBirthdays();
            //  NOVO: Emitir eventos via socket para todas as empresas após processamento
            await (0, exports.emitBirthdayEventsToAllCompanies)();
            logger_1.default.info("🎉 Daily birthday processing job completed successfully");
        }
        catch (error) {
            logger_1.default.error("❌ Error in daily birthday processing job:", error);
        }
    }, null, // onComplete
    true, // start immediately
    "America/Sao_Paulo" // timezone
    );
    logger_1.default.info(" Birthday cron job initialized - will run daily at 09:00");
    return birthdayJob;
};
exports.startBirthdayJob = startBirthdayJob;
/**
 *  NOVO: Job para verificar e emitir eventos de aniversário periodicamente
 * Executa a cada 30 minutos durante o horário comercial para capturar novos logins
 */
const startBirthdayNotificationJob = () => {
    const notificationJob = new CronJob("0 */30 8-18 * * 1-5", // A cada 30 minutos, das 8h às 18h, segunda a sexta
    async () => {
        logger_1.default.info(" Starting birthday notification check...");
        try {
            await (0, exports.emitBirthdayEventsToAllCompanies)();
            logger_1.default.info(" Birthday notification check completed");
        }
        catch (error) {
            logger_1.default.error("❌ Error in birthday notification check:", error);
        }
    }, null, // onComplete
    true, // start immediately
    "America/Sao_Paulo" // timezone
    );
    logger_1.default.info(" Birthday notification job initialized - will run every 30 minutes during business hours");
    return notificationJob;
};
exports.startBirthdayNotificationJob = startBirthdayNotificationJob;
/**
 *  NOVA FUNÇÃO: Emitir eventos de aniversário para todas as empresas ativas
 */
const emitBirthdayEventsToAllCompanies = async () => {
    try {
        const activeCompanies = await Company_1.default.findAll({
            where: { status: true },
            attributes: ['id']
        });
        logger_1.default.info(` Emitting birthday events for ${activeCompanies.length} active companies`);
        for (const company of activeCompanies) {
            try {
                const birthdayData = await BirthdayService_1.default.getTodayBirthdaysForCompany(company.id);
                // Só emitir se houver aniversariantes
                if (birthdayData.users.length > 0 || birthdayData.contacts.length > 0) {
                    await (0, socket_1.emitBirthdayEvents)(company.id);
                    logger_1.default.info(` Events emitted for company ${company.id}: ${birthdayData.users.length} users, ${birthdayData.contacts.length} contacts`);
                }
            }
            catch (error) {
                logger_1.default.error(` Error emitting events for company ${company.id}:`, error);
            }
        }
    }
    catch (error) {
        logger_1.default.error(" Error in emitBirthdayEventsToAllCompanies:", error);
    }
};
exports.emitBirthdayEventsToAllCompanies = emitBirthdayEventsToAllCompanies;
/**
 * Job para limpar informativos expirados
 * Executa todo dia à meia-noite
 */
const startCleanupJob = () => {
    const cleanupJob = new CronJob("0 0 0 * * *", // Todo dia à meia-noite
    async () => {
        logger_1.default.info("🧹 Starting expired announcements cleanup job...");
        try {
            const { default: Announcement } = await Promise.resolve().then(() => __importStar(require("../models/Announcement")));
            const cleanedCount = await Announcement.cleanExpiredAnnouncements();
            if (cleanedCount > 0) {
                logger_1.default.info(`🗑️ Cleaned ${cleanedCount} expired announcements`);
            }
            else {
                logger_1.default.info("✨ No expired announcements to clean");
            }
        }
        catch (error) {
            logger_1.default.error("❌ Error in cleanup job:", error);
        }
    }, null, // onComplete
    true, // start immediately
    "America/Sao_Paulo" // timezone
    );
    logger_1.default.info("🧹 Cleanup cron job initialized - will run daily at midnight");
    return cleanupJob;
};
exports.startCleanupJob = startCleanupJob;
/**
 *  NOVA FUNÇÃO: Job para processar aniversários no horário configurado
 * Executa no horário definido nas configurações de cada empresa
 */
const startDynamicBirthdayJob = () => {
    const dynamicJob = new CronJob("0 */15 * * * *", // A cada 15 minutos - verifica se é hora de enviar mensagens
    async () => {
        try {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
            // Buscar empresas que têm horário de envio configurado para agora
            const companies = await Company_1.default.findAll({
                where: { status: true },
                include: [{
                        model: BirthdaySettings_1.default,
                        where: {
                            sendBirthdayTime: currentTime,
                            contactBirthdayEnabled: true
                        },
                        required: true
                    }]
            });
            if (companies.length > 0) {
                logger_1.default.info(` Processing birthday messages for ${companies.length} companies at ${currentTime}`);
                for (const company of companies) {
                    try {
                        const birthdayData = await BirthdayService_1.default.getTodayBirthdaysForCompany(company.id);
                        // Enviar mensagens para contatos aniversariantes
                        for (const contact of birthdayData.contacts) {
                            await BirthdayService_1.default.sendBirthdayMessageToContact(contact.id, company.id);
                        }
                        // Emitir eventos via socket
                        if (birthdayData.users.length > 0 || birthdayData.contacts.length > 0) {
                            await (0, socket_1.emitBirthdayEvents)(company.id);
                        }
                    }
                    catch (error) {
                        logger_1.default.error(` Error processing birthday for company ${company.id}:`, error);
                    }
                }
            }
        }
        catch (error) {
            logger_1.default.error(`Error in dynamic birthday job: ${error instanceof Error ? error.message : "Unknown error"}`);
            if (error instanceof Error && error.stack) {
                logger_1.default.debug(" Error stack:", error.stack);
            }
        }
    }, null, // onComplete
    true, // start immediately
    "America/Sao_Paulo" // timezone
    );
    logger_1.default.info(" Dynamic birthday job initialized - will check every 15 minutes for scheduled sends");
    return dynamicJob;
};
exports.startDynamicBirthdayJob = startDynamicBirthdayJob;
/**
 * Inicializa todos os jobs relacionados a aniversários
 */
const initializeBirthdayJobs = () => {
    const birthdayJob = (0, exports.startBirthdayJob)();
    const notificationJob = (0, exports.startBirthdayNotificationJob)(); //  NOVO
    const dynamicJob = (0, exports.startDynamicBirthdayJob)(); //  NOVO
    const cleanupJob = (0, exports.startCleanupJob)();
    // Graceful shutdown
    const shutdown = () => {
        logger_1.default.info('🛑 Stopping birthday jobs...');
        birthdayJob.stop();
        notificationJob.stop(); //  NOVO
        dynamicJob.stop(); //  NOVO
        cleanupJob.stop();
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    return {
        birthdayJob,
        notificationJob,
        dynamicJob,
        cleanupJob
    };
};
exports.initializeBirthdayJobs = initializeBirthdayJobs;
/**
 *  NOVA FUNÇÃO EXPORTADA: Para executar verificação manual via API
 */
const triggerBirthdayCheck = async (companyId) => {
    try {
        if (companyId) {
            // Verificar uma empresa específica
            await (0, socket_1.emitBirthdayEvents)(companyId);
            logger_1.default.info(` Manual birthday check triggered for company ${companyId}`);
        }
        else {
            // Verificar todas as empresas
            await (0, exports.emitBirthdayEventsToAllCompanies)();
            logger_1.default.info(" Manual birthday check triggered for all companies");
        }
    }
    catch (error) {
        logger_1.default.error(" Error in manual birthday check:", error);
        throw error;
    }
};
exports.triggerBirthdayCheck = triggerBirthdayCheck;
