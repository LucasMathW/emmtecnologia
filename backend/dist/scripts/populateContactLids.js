"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Contact_1 = __importDefault(require("../models/Contact"));
const WhatsapplidMap_1 = __importDefault(require("../models/WhatsapplidMap"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const wbot_1 = require("../libs/wbot");
const logger_1 = __importDefault(require("../utils/logger"));
const sequelize_1 = require("sequelize");
const populateContactLids = async (companyId) => {
    try {
        logger_1.default.info("RDS - Iniciando população de LIDs para contatos existentes...");
        const whereCondition = companyId ? { companyId } : {};
        const whatsapps = await Whatsapp_1.default.findAll({
            where: {
                status: "CONNECTED",
                ...whereCondition
            }
        });
        if (!whatsapps.length) {
            logger_1.default.error("RDS - Nenhum WhatsApp conectado encontrado. O script não pode continuar.");
            return;
        }
        logger_1.default.info(`RDS - Encontrados ${whatsapps.length} conexões WhatsApp para processar.`);
        for (const whatsapp of whatsapps) {
            try {
                const wbot = await (0, wbot_1.getWbot)(whatsapp.id);
                if (!wbot) {
                    logger_1.default.error(`WhatsApp ID ${whatsapp.id} não encontrado no wbot. Pulando...`);
                    continue;
                }
                logger_1.default.info(`RDS - Processando contatos da empresa ${whatsapp.companyId} com WhatsApp ID ${whatsapp.id}...`);
                const contacts = await Contact_1.default.findAll({
                    where: {
                        companyId: whatsapp.companyId,
                        isGroup: false,
                        [sequelize_1.Op.or]: [
                            { lid: null },
                            { lid: "" }
                        ]
                    },
                    include: [
                        {
                            model: WhatsapplidMap_1.default,
                            required: false
                        }
                    ]
                });
                logger_1.default.info(`RDS - Encontrados ${contacts.length} contatos sem LID para processar na empresa ${whatsapp.companyId}`);
                let successCount = 0;
                let errorCount = 0;
                let existingCount = 0;
                const batchSize = 10;
                for (let i = 0; i < contacts.length; i += batchSize) {
                    const batch = contacts.slice(i, i + batchSize);
                    const promises = batch.map(async (contact) => {
                        try {
                            const existingMap = await WhatsapplidMap_1.default.findOne({
                                where: {
                                    contactId: contact.id,
                                    companyId: contact.companyId
                                }
                            });
                            if (existingMap) {
                                existingCount++;
                                return;
                            }
                            const formattedNumber = contact.number.includes("@")
                                ? contact.number
                                : `${contact.number}@s.whatsapp.net`;
                            const result = await wbot.onWhatsApp(formattedNumber);
                            if (result && result.length > 0 && result[0].exists && result[0].lid) {
                                const lid = result[0].lid;
                                await contact.update({ lid });
                                await WhatsapplidMap_1.default.create({
                                    lid,
                                    contactId: contact.id,
                                    companyId: contact.companyId
                                });
                                logger_1.default.info(`RDS - Mapeado LID ${lid} para contato ${contact.id} (${contact.name || contact.number})`);
                                successCount++;
                            }
                            else {
                                logger_1.default.warn(`RDS - Contato ${contact.id} (${contact.name || contact.number}) não existe no WhatsApp ou não retornou LID`);
                                errorCount++;
                            }
                        }
                        catch (error) {
                            logger_1.default.error(`RDS - Erro ao processar contato ${contact.id}: ${error.message}`);
                            errorCount++;
                        }
                    });
                    // Aguardar o lote atual
                    await Promise.all(promises);
                    // Pausa para evitar sobrecarga na API do WhatsApp
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    logger_1.default.info(`RDS - Progresso: ${Math.min(i + batchSize, contacts.length)}/${contacts.length} contatos processados`);
                }
                logger_1.default.info(`RDS - Empresa ${whatsapp.companyId}: ${successCount} contatos mapeados com sucesso, ${errorCount} falhas, ${existingCount} já existentes.`);
            }
            catch (error) {
                logger_1.default.error(`RDS - Erro ao processar WhatsApp ${whatsapp.id}: ${error.message}`);
            }
        }
        logger_1.default.info("RDS - Processo de população de LIDs concluído!");
    }
    catch (error) {
        logger_1.default.error("RDS - Erro durante a execução do script de população de LIDs:", error);
        throw error;
    }
};
// Executar como script autônomo ou exportar como função
if (require.main === module) {
    const companyId = process.argv[2] ? parseInt(process.argv[2]) : undefined;
    populateContactLids(companyId)
        .then(() => {
        logger_1.default.info("RDS - Script de população de LIDs executado com sucesso!");
        process.exit(0);
    })
        .catch(error => {
        logger_1.default.error("RDS - Erro ao executar script de população de LIDs:", error);
        process.exit(1);
    });
}
exports.default = populateContactLids;
