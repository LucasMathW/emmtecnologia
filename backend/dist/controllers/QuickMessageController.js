"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMedia = exports.mediaUpload = exports.audioUpload = exports.findList = exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const Yup = __importStar(require("yup"));
const socket_1 = require("../libs/socket");
const sequelize_1 = require("sequelize");
const ListService_1 = __importDefault(require("../services/QuickMessageService/ListService"));
const CreateService_1 = __importDefault(require("../services/QuickMessageService/CreateService"));
const ShowService_1 = __importDefault(require("../services/QuickMessageService/ShowService"));
const UpdateService_1 = __importDefault(require("../services/QuickMessageService/UpdateService"));
const DeleteService_1 = __importDefault(require("../services/QuickMessageService/DeleteService"));
const FindService_1 = __importDefault(require("../services/QuickMessageService/FindService"));
const QuickMessageComponent_1 = __importDefault(require("../models/QuickMessageComponent"));
const QuickMessage_1 = __importDefault(require("../models/QuickMessage"));
const lodash_1 = require("lodash");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const ShowCompanyService_1 = __importDefault(require("../services/CompanyService/ShowCompanyService"));
const index = async (req, res) => {
    const { searchParam, pageNumber } = req.query;
    const { companyId, id: userId } = req.user;
    let isOficial = false;
    const company = await (0, ShowCompanyService_1.default)(companyId);
    if (company.plan.useWhatsappOfficial) {
        isOficial = true;
    }
    const { records, count, hasMore } = await (0, ListService_1.default)({
        searchParam,
        pageNumber,
        companyId,
        userId,
        isOficial
    });
    return res.json({ records, count, hasMore });
};
exports.index = index;
const store = async (req, res) => {
    const { companyId } = req.user;
    const data = req.body;
    const schema = Yup.object().shape({
        shortcode: Yup.string().required(),
        message: data.isMedia ? Yup.string().notRequired() : Yup.string().required()
    });
    try {
        await schema.validate(data);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const record = await (0, CreateService_1.default)({
        ...data,
        companyId,
        userId: req.user.id
    });
    // Se marcar como iniciador de conversa, desmarca outros do mesmo WhatsApp
    if (data.isStarter === true && record?.whatsappId) {
        await QuickMessage_1.default.update({ isStarter: false }, {
            where: {
                companyId,
                isOficial: true,
                whatsappId: record.whatsappId,
                id: { [sequelize_1.Op.ne]: record.id }
            }
        });
        await record.update({ isStarter: true });
    }
    const io = (0, socket_1.getIO)();
    io.of(String(companyId))
        .emit(`company-${companyId}-quickmessage`, {
        action: "create",
        record
    });
    return res.status(200).json(record);
};
exports.store = store;
const show = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    const record = await (0, ShowService_1.default)(id, companyId);
    return res.status(200).json(record);
};
exports.show = show;
const update = async (req, res) => {
    const data = req.body;
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        shortcode: Yup.string().required(),
        message: data.isMedia ? Yup.string().notRequired() : Yup.string().required()
    });
    try {
        await schema.validate(data);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { id } = req.params;
    const record = await (0, UpdateService_1.default)({
        ...data,
        userId: req.user.id,
        id,
    });
    // Se marcar como iniciador, garante unicidade por WhatsApp na empresa
    if (data.isStarter === true && record?.whatsappId) {
        await QuickMessage_1.default.update({ isStarter: false }, {
            where: {
                companyId,
                isOficial: true,
                whatsappId: record.whatsappId,
                id: { [sequelize_1.Op.ne]: record.id }
            }
        });
        await record.update({ isStarter: true });
    }
    // Se explicitamente desmarcar, atualiza para falso
    if (data.isStarter === false) {
        await record.update({ isStarter: false });
    }
    // Atualiza textos dos componentes do template oficial, se enviados
    const components = req.body?.components;
    if (Array.isArray(components) && components.length > 0) {
        for (const comp of components) {
            if (comp?.id) {
                await QuickMessageComponent_1.default.update({ text: comp.text }, { where: { id: comp.id, quickMessageId: Number(id) } });
            }
        }
    }
    const io = (0, socket_1.getIO)();
    io.of(String(companyId))
        .emit(`company-${companyId}-quickmessage`, {
        action: "update",
        record
    });
    return res.status(200).json(record);
};
exports.update = update;
const remove = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    await (0, DeleteService_1.default)(id);
    const io = (0, socket_1.getIO)();
    io.of(String(companyId))
        .emit(`company-${companyId}-quickmessage`, {
        action: "delete",
        id
    });
    return res.status(200).json({ message: "Contact deleted" });
};
exports.remove = remove;
const findList = async (req, res) => {
    const params = req.query;
    const records = await (0, FindService_1.default)(params);
    return res.status(200).json(records);
};
exports.findList = findList;
const audioUpload = async (req, res) => {
    const { id } = req.params;
    const files = req.files;
    const file = (0, lodash_1.head)(files);
    try {
        if (!file)
            throw new AppError_1.default("Nenhum arquivo recebido");
        console.log("📁 Processando arquivo de áudio:", {
            originalname: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size
        });
        const quickmessage = await QuickMessage_1.default.findByPk(id);
        if (!quickmessage) {
            throw new AppError_1.default("Quick message não encontrada");
        }
        // ✅ CORREÇÃO: Garantir que seja sempre salvo como tipo 'audio'
        // independente do mimetype original (webm, ogg, etc)
        await quickmessage.update({
            mediaPath: file.filename,
            mediaName: file.originalname || `Áudio gravado - ${new Date().toLocaleString()}`,
            mediaType: 'audio' // ✅ SEMPRE 'audio' para compatibilidade
        });
        console.log("✅ Quick message atualizada:", {
            id: quickmessage.id,
            mediaPath: quickmessage.mediaPath,
            mediaName: quickmessage.mediaName,
            mediaType: quickmessage.mediaType
        });
        return res.send({
            mensagem: "Áudio gravado anexado com sucesso",
            mediaPath: file.filename,
            mediaName: file.originalname,
            mediaType: 'audio'
        });
    }
    catch (err) {
        console.error("❌ Erro no audioUpload:", err);
        throw new AppError_1.default(err.message);
    }
};
exports.audioUpload = audioUpload;
const mediaUpload = async (req, res) => {
    const { id } = req.params;
    const files = req.files;
    const file = (0, lodash_1.head)(files);
    try {
        const quickmessage = await QuickMessage_1.default.findByPk(id);
        // ✅ CORREÇÃO: Melhor detecção do tipo de mídia
        const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
        let mediaType = 'document'; // padrão
        // ✅ CORREÇÃO: Detectar áudio por extensão E mimetype
        if (['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm'].includes(fileExtension) ||
            file.mimetype.startsWith('audio/')) {
            mediaType = 'audio';
        }
        else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension)) {
            mediaType = 'image';
        }
        else if (['.mp4', '.avi', '.mov'].includes(fileExtension)) {
            mediaType = 'video';
        }
        console.log("📎 Tipo de mídia detectado:", {
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            extension: fileExtension,
            detectedType: mediaType
        });
        await quickmessage.update({
            mediaPath: file.filename,
            mediaName: file.originalname,
            mediaType: mediaType
        });
        return res.send({
            mensagem: "Arquivo Anexado",
            mediaType: mediaType
        });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
};
exports.mediaUpload = mediaUpload;
const deleteMedia = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    try {
        const quickmessage = await QuickMessage_1.default.findByPk(id);
        const filePath = path_1.default.resolve("public", `company${companyId}`, "quickMessage", quickmessage.mediaName);
        const fileExists = fs_1.default.existsSync(filePath);
        if (fileExists) {
            fs_1.default.unlinkSync(filePath);
        }
        await quickmessage.update({
            mediaPath: null,
            mediaName: null,
            mediaType: null
        });
        return res.send({ mensagem: "Arquivo Excluído" });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
};
exports.deleteMedia = deleteMedia;
