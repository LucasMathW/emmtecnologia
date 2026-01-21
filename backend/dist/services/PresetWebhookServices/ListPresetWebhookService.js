"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListPresetWebhookService = void 0;
const PresetWebhook_1 = require("../../models/PresetWebhook");
const sequelize_1 = require("sequelize");
const ListPresetWebhookService = async ({ companyId, isActive = true, provider, includeSystem = true }) => {
    try {
        if (!companyId) {
            throw new Error("CompanyId é obrigatório para listar presets");
        }
        const whereClause = {
            [sequelize_1.Op.or]: []
        };
        // Sempre incluir presets da empresa
        const companyCondition = { companyId };
        if (isActive !== undefined) {
            companyCondition.isActive = isActive;
        }
        if (provider) {
            companyCondition.provider = provider;
        }
        whereClause[sequelize_1.Op.or].push(companyCondition);
        // Incluir presets do sistema se solicitado
        if (includeSystem) {
            const systemCondition = {
                companyId: null,
                isSystem: true
            };
            if (isActive !== undefined) {
                systemCondition.isActive = isActive;
            }
            if (provider) {
                systemCondition.provider = provider;
            }
            whereClause[sequelize_1.Op.or].push(systemCondition);
        }
        const { count, rows } = await PresetWebhook_1.PresetWebhookModel.findAndCountAll({
            where: whereClause,
            order: [
                ['isSystem', 'DESC'],
                ['companyId', 'ASC'],
                ['name', 'ASC'] // Por fim alfabético
            ]
        });
        return {
            presets: rows,
            count
        };
    }
    catch (error) {
        console.error('Erro ao listar presets de webhook:', error);
        throw error;
    }
};
exports.ListPresetWebhookService = ListPresetWebhookService;
