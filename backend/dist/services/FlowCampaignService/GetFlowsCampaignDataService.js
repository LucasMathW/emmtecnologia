"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FlowBuilder_1 = require("../../models/FlowBuilder");
const FlowCampaign_1 = require("../../models/FlowCampaign");
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const GetFlowsCampaignDataService = async ({ companyId, idFlow }) => {
    try {
        if (!idFlow || isNaN(Number(idFlow))) {
            throw new AppError_1.default("ID do fluxo de campanha é obrigatório e deve ser um número válido", 400);
        }
        // Buscar a campanha com relacionamentos
        const campaign = await FlowCampaign_1.FlowCampaignModel.findOne({
            where: {
                id: Number(idFlow),
                companyId
            },
            include: [
                {
                    model: Whatsapp_1.default,
                    as: 'whatsapp',
                    attributes: ['id', 'name', 'status'],
                    required: false
                },
                {
                    model: FlowBuilder_1.FlowBuilderModel,
                    as: 'flow',
                    attributes: ['id', 'name'],
                    required: false
                }
            ]
        });
        if (!campaign) {
            throw new AppError_1.default("Campanha não encontrada", 404);
        }
        // Converter para JSON e processar dados
        const campaignData = campaign.toJSON();
        // Garantir que as phrases estão no formato correto
        if (campaignData.phrase) {
            try {
                if (typeof campaignData.phrase === 'string') {
                    campaignData.phrase = JSON.parse(campaignData.phrase);
                }
            }
            catch (error) {
                console.warn(`Erro ao parsear phrases da campanha ${campaign.id}:`, error);
                // Manter como array vazio se não conseguir parsear
                campaignData.phrase = [];
            }
        }
        return {
            details: campaignData
        };
    }
    catch (error) {
        console.error('Erro ao consultar campanha de fluxo:', error);
        if (error instanceof AppError_1.default) {
            throw error;
        }
        throw new AppError_1.default("Erro interno ao buscar campanha", 500);
    }
};
exports.default = GetFlowsCampaignDataService;
