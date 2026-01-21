"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.show = exports.list = void 0;
const ListPresetWebhookService_1 = require("../services/PresetWebhookServices/ListPresetWebhookService");
const GetPresetWebhookService_1 = require("../services/PresetWebhookServices/GetPresetWebhookService");
const CreatePresetWebhookService_1 = require("../services/PresetWebhookServices/CreatePresetWebhookService");
const UpdatePresetWebhookService_1 = require("../services/PresetWebhookServices/UpdatePresetWebhookService");
const DeletePresetWebhookService_1 = require("../services/PresetWebhookServices/DeletePresetWebhookService");
const AppError_1 = __importDefault(require("../errors/AppError"));
const list = async (req, res) => {
    const { isActive, provider, includeSystem } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
        throw new AppError_1.default("ERR_SESSION_EXPIRED", 401);
    }
    const result = await (0, ListPresetWebhookService_1.ListPresetWebhookService)({
        companyId,
        isActive: isActive ? isActive === 'true' : undefined,
        provider: provider,
        includeSystem: includeSystem !== 'false'
    });
    return res.status(200).json(result);
};
exports.list = list;
const show = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
        throw new AppError_1.default("ERR_SESSION_EXPIRED", 401);
    }
    const preset = await (0, GetPresetWebhookService_1.GetPresetWebhookService)({
        id: parseInt(id),
        companyId
    });
    return res.status(200).json(preset);
};
exports.show = show;
const create = async (req, res) => {
    const companyId = req.user?.companyId;
    if (!companyId) {
        throw new AppError_1.default("ERR_SESSION_EXPIRED", 401);
    }
    const presetData = {
        ...req.body,
        companyId
    };
    const preset = await (0, CreatePresetWebhookService_1.CreatePresetWebhookService)(presetData);
    return res.status(201).json(preset);
};
exports.create = create;
const update = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
        throw new AppError_1.default("ERR_SESSION_EXPIRED", 401);
    }
    const preset = await (0, UpdatePresetWebhookService_1.UpdatePresetWebhookService)({
        id: parseInt(id),
        companyId,
        data: req.body
    });
    return res.status(200).json(preset);
};
exports.update = update;
const remove = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
        throw new AppError_1.default("ERR_SESSION_EXPIRED", 401);
    }
    await (0, DeletePresetWebhookService_1.DeletePresetWebhookService)({
        id: parseInt(id),
        companyId
    });
    return res.status(200).json({ message: "Preset deletado com sucesso" });
};
exports.remove = remove;
