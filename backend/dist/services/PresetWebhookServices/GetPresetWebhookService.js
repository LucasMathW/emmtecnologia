"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPresetWebhookService = void 0;
const PresetWebhook_1 = require("../../models/PresetWebhook");
const sequelize_1 = require("sequelize");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const GetPresetWebhookService = async ({ id, companyId }) => {
    try {
        if (!companyId) {
            throw new AppError_1.default("CompanyId é obrigatório", 400);
        }
        const preset = await PresetWebhook_1.PresetWebhookModel.findOne({
            where: {
                id,
                [sequelize_1.Op.or]: [
                    { companyId },
                    { companyId: null, isSystem: true } // Ou preset do sistema
                ]
            }
        });
        if (!preset) {
            throw new AppError_1.default("Preset de webhook não encontrado ou sem permissão", 404);
        }
        return preset;
    }
    catch (error) {
        console.error('Erro ao buscar preset de webhook:', error);
        throw error;
    }
};
exports.GetPresetWebhookService = GetPresetWebhookService;
