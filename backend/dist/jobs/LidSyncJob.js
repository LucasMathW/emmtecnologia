"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAllContactLids = exports.syncContactLids = exports.startLidSyncJob = void 0;
const sequelize_1 = require("sequelize");
const Contact_1 = __importDefault(require("../models/Contact"));
const WhatsapplidMap_1 = __importDefault(require("../models/WhatsapplidMap"));
const logger_1 = __importDefault(require("../utils/logger"));
const CronJob = require("cron").CronJob;
const lidSyncQueueJob = {
    key: `${process.env.DB_NAME}-lidSync`,
    async handle({ data }) {
        try {
            const { batchSize = 10 } = data || {};
            const result = await (0, exports.syncContactLids)(batchSize);
            return result;
        }
        catch (error) {
            logger_1.default.error("[RDS-LID-SYNC] Erro no processamento da fila:", error);
            throw error;
        }
    }
};
exports.default = lidSyncQueueJob;
/**
 * Job para sincronizar os LIDs dos contatos
 * Busca contatos que já têm LID na tabela WhatsappLidMaps mas não na tabela Contacts
 */
const startLidSyncJob = () => {
    const lidSyncJob = new CronJob("0 */5 * * * *", async () => {
        logger_1.default.info("[RDS-LID-SYNC] Iniciando job de sincronização de LIDs...");
        try {
            const result = await (0, exports.syncContactLids)();
            if (result.processed === 0) {
                logger_1.default.info("[RDS-LID-SYNC] Todos contatos já foram sincronizados!");
            }
            else {
                logger_1.default.info(`[RDS-LID-SYNC] Job concluído: ${result.updated}/${result.processed} contatos sincronizados com sucesso`);
            }
        }
        catch (error) {
            logger_1.default.error("[RDS-LID-SYNC] Erro no job de sincronização de LIDs:", error);
        }
    }, null, true, "America/Sao_Paulo");
    logger_1.default.info("[RDS-LID-SYNC] Job de sincronização de LIDs iniciado - rodará a cada 5 minutos");
    return lidSyncJob;
};
exports.startLidSyncJob = startLidSyncJob;
/**
 * Sincroniza os LIDs dos contatos
 * Busca contatos que têm LID na tabela WhatsappLidMaps mas não na tabela Contacts
 * Atualiza 10 contatos por vez para não sobrecarregar o banco
 * @returns Objeto com informações sobre o processo de sincronização
 */
const syncContactLids = async (batchSize = 10) => {
    try {
        // Buscar mapeamentos onde o contato tem lid null
        const lidMappings = await WhatsapplidMap_1.default.findAll({
            include: [
                {
                    model: Contact_1.default,
                    as: "contact",
                    required: true,
                    where: {
                        [sequelize_1.Op.or]: [
                            { lid: null },
                            { lid: "" }
                        ]
                    }
                }
            ],
            limit: batchSize
        });
        if (lidMappings.length === 0) {
            logger_1.default.info(`[RDS-LID-SYNC] Não foram encontrados contatos para sincronizar`);
            return { processed: 0, updated: 0, hasMore: false };
        }
        logger_1.default.info(`[RDS-LID-SYNC] Encontrados ${lidMappings.length} contatos para sincronizar`);
        let updatedCount = 0;
        for (const mapping of lidMappings) {
            try {
                await mapping.contact.update({
                    lid: mapping.lid
                });
                updatedCount++;
                logger_1.default.info(`[RDS-LID-SYNC] Contato ID ${mapping.contactId} atualizado com LID ${mapping.lid}`);
            }
            catch (error) {
                logger_1.default.error(`[RDS-LID-SYNC] Erro ao atualizar contato ID ${mapping.contactId}:`, error);
            }
        }
        logger_1.default.info(`[RDS-LID-SYNC] ${updatedCount}/${lidMappings.length} contatos atualizados com sucesso`);
        return {
            processed: lidMappings.length,
            updated: updatedCount,
            hasMore: lidMappings.length >= batchSize
        };
    }
    catch (error) {
        logger_1.default.error("[RDS-LID-SYNC] Erro ao sincronizar LIDs:", error);
        throw error;
    }
};
exports.syncContactLids = syncContactLids;
/**
 * Executa a sincronização de LIDs manualmente para todos os contatos
 * Continua executando em batches até que não haja mais contatos para atualizar
 */
const syncAllContactLids = async (batchSize = 10) => {
    logger_1.default.info("[RDS-LID-SYNC] Iniciando sincronização manual de todos os LIDs...");
    try {
        let hasMore = true;
        let totalProcessed = 0;
        let totalUpdated = 0;
        let batchCount = 0;
        while (hasMore) {
            batchCount++;
            logger_1.default.info(`[RDS-LID-SYNC] Processando lote #${batchCount}...`);
            const result = await (0, exports.syncContactLids)(batchSize);
            totalProcessed += result.processed;
            totalUpdated += result.updated;
            hasMore = result.hasMore;
            if (hasMore) {
                logger_1.default.info(`[RDS-LID-SYNC] Aguardando 1 segundo antes do próximo lote...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        if (totalProcessed === 0) {
            logger_1.default.info(`[RDS-LID-SYNC] Sincronização manual concluída. Todos os contatos já estavam sincronizados.`);
        }
        else {
            logger_1.default.info(`[RDS-LID-SYNC] Sincronização manual concluída. Total de contatos processados: ${totalProcessed}, atualizados: ${totalUpdated}`);
        }
    }
    catch (error) {
        logger_1.default.error("[RDS-LID-SYNC] Erro na sincronização manual de LIDs:", error);
        throw error;
    }
};
exports.syncAllContactLids = syncAllContactLids;
