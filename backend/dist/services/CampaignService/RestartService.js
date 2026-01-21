"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestartService = void 0;
const Campaign_1 = __importDefault(require("../../models/Campaign"));
const CampaignSetting_1 = __importDefault(require("../../models/CampaignSetting"));
const CampaignShipping_1 = __importDefault(require("../../models/CampaignShipping"));
const queues_1 = require("../../queues");
const sequelize_1 = require("sequelize");
async function RestartService(id) {
    const campaign = await Campaign_1.default.findByPk(id);
    await campaign.update({ status: "EM_ANDAMENTO" });
    // Buscar configurações de delay da campanha
    const settings = await CampaignSetting_1.default.findAll({
        where: { companyId: campaign.companyId },
        attributes: ["key", "value"]
    });
    let messageInterval = 20; // Default 20 segundos
    let longerIntervalAfter = 20;
    let greaterInterval = 60;
    settings.forEach(setting => {
        if (setting.key === "messageInterval") {
            messageInterval = JSON.parse(setting.value);
        }
        if (setting.key === "longerIntervalAfter") {
            longerIntervalAfter = JSON.parse(setting.value);
        }
        if (setting.key === "greaterInterval") {
            greaterInterval = JSON.parse(setting.value);
        }
    });
    // Verificar quantos registros já foram processados
    const processedCount = await CampaignShipping_1.default.count({
        where: {
            campaignId: campaign.id,
            deliveredAt: { [sequelize_1.Op.ne]: null }
        }
    });
    console.log(`[RESTART] Campanha ${campaign.id} reiniciada - ${processedCount} já processados`);
    // Usar delay mínimo de 5 segundos para evitar envio imediato
    const initialDelay = Math.max(messageInterval * 1000, 5000);
    await queues_1.campaignQueue.add("ProcessCampaign", {
        id: campaign.id,
        delay: initialDelay,
        restartMode: true,
        messageInterval: messageInterval,
        longerIntervalAfter: longerIntervalAfter,
        greaterInterval: greaterInterval
    });
}
exports.RestartService = RestartService;
