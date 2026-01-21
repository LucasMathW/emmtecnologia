"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePresetWebhookService = void 0;
const PresetWebhook_1 = require("../../models/PresetWebhook");
const sequelize_1 = require("sequelize");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const UpdatePresetWebhookService = async ({ id, companyId, data }) => {
    if (!companyId) {
        throw new AppError_1.default("CompanyId é obrigatório", 400);
    }
    const preset = await PresetWebhook_1.PresetWebhookModel.findOne({
        where: {
            id,
            companyId // Só pode editar presets da própria empresa
        }
    });
    if (!preset) {
        throw new AppError_1.default("Preset não encontrado ou sem permissão", 404);
    }
    // Presets do sistema não podem ser editados
    if (preset.isSystem) {
        throw new AppError_1.default("Presets do sistema não podem ser editados", 403);
    }
    // Verificar se novo nome já existe na empresa (se nome foi alterado)
    if (data.name && data.name !== preset.name) {
        const existingPreset = await PresetWebhook_1.PresetWebhookModel.findOne({
            where: {
                companyId,
                name: data.name,
                id: { [sequelize_1.Op.ne]: id }
            }
        });
        if (existingPreset) {
            throw new AppError_1.default("Já existe um preset com este nome", 400);
        }
    }
    await preset.update(data);
    return preset;
};
exports.UpdatePresetWebhookService = UpdatePresetWebhookService;
