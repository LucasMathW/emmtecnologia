"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeletePresetWebhookService = void 0;
const PresetWebhook_1 = require("../../models/PresetWebhook");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const DeletePresetWebhookService = async ({ id, companyId }) => {
    if (!companyId) {
        throw new AppError_1.default("CompanyId é obrigatório", 400);
    }
    const preset = await PresetWebhook_1.PresetWebhookModel.findOne({
        where: {
            id,
            companyId // Só pode deletar presets da própria empresa
        }
    });
    if (!preset) {
        throw new AppError_1.default("Preset não encontrado ou sem permissão", 404);
    }
    // Presets do sistema não podem ser deletados
    if (preset.isSystem) {
        throw new AppError_1.default("Presets do sistema não podem ser deletados", 403);
    }
    await preset.destroy();
};
exports.DeletePresetWebhookService = DeletePresetWebhookService;
