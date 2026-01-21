"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePresetWebhookService = void 0;
const PresetWebhook_1 = require("../../models/PresetWebhook");
const CreatePresetWebhookService = async (data) => {
    try {
        if (!data.companyId) {
            throw new Error("CompanyId é obrigatório para criar preset");
        }
        // Verificar se já existe preset com mesmo nome na empresa
        const existingPreset = await PresetWebhook_1.PresetWebhookModel.findOne({
            where: {
                companyId: data.companyId,
                name: data.name
            }
        });
        if (existingPreset) {
            throw new Error("Já existe um preset com este nome na empresa");
        }
        const preset = await PresetWebhook_1.PresetWebhookModel.create({
            ...data,
            isSystem: false // Presets criados por empresas nunca são do sistema
        });
        return preset;
    }
    catch (error) {
        console.error('Erro ao criar preset de webhook:', error);
        throw error;
    }
};
exports.CreatePresetWebhookService = CreatePresetWebhookService;
