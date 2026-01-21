"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FlowBuilder_1 = require("../../models/FlowBuilder");
const FlowCampaign_1 = require("../../models/FlowCampaign");
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const sequelize_1 = require("sequelize");
const FlowsCampaignGetDataService = async ({ companyId, page = 1, limit = 999999999, searchTerm }) => {
    try {
        if (!companyId) {
            throw new AppError_1.default("ID da empresa é obrigatório", 400);
        }
        // Construir condições de busca
        const whereConditions = {
            companyId
        };
        // Adicionar filtro de busca se fornecido
        if (searchTerm?.trim()) {
            whereConditions.name = {
                [sequelize_1.Op.iLike]: `%${searchTerm.trim()}%`
            };
        }
        // Calcular offset
        const offset = (page - 1) * limit;
        // Buscar campanhas com paginação e relacionamentos
        const { count, rows } = await FlowCampaign_1.FlowCampaignModel.findAndCountAll({
            where: whereConditions,
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
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true
        });
        // Processar resultados
        const processedRows = rows.map(campaign => {
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
            return campaignData;
        });
        return {
            flow: processedRows,
            count,
            hasMore: count > (page * limit)
        };
    }
    catch (error) {
        console.error('Erro ao consultar campanhas de fluxo:', error);
        if (error instanceof AppError_1.default) {
            throw error;
        }
        throw new AppError_1.default("Erro interno ao buscar campanhas", 500);
    }
};
exports.default = FlowsCampaignGetDataService;
