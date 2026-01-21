"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const QuickMessage_1 = __importDefault(require("../../models/QuickMessage"));
const UpdateService = async (data) => {
    const { id, shortcode, message, userId, geral, mediaPath, mediaName, mediaType, visao, isStarter } = data;
    const record = await QuickMessage_1.default.findByPk(id);
    if (!record) {
        throw new AppError_1.default("ERR_NO_TICKETNOTE_FOUND", 404);
    }
    if (!record.geral && record.visao && record.userId !== userId) {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    await record.update({
        shortcode,
        message,
        geral,
        mediaPath,
        mediaName,
        mediaType,
        visao,
        isStarter
    });
    return record;
};
exports.default = UpdateService;
