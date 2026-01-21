"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeContactTag = exports.syncTags = exports.kanban = exports.list = exports.remove = exports.update = exports.show = exports.store = exports.index = exports.uploadMiddleware = void 0;
const socket_1 = require("../libs/socket");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const CreateService_1 = __importDefault(require("../services/TagServices/CreateService"));
const ListService_1 = __importDefault(require("../services/TagServices/ListService"));
const UpdateService_1 = __importDefault(require("../services/TagServices/UpdateService"));
const ShowService_1 = __importDefault(require("../services/TagServices/ShowService"));
const DeleteService_1 = __importDefault(require("../services/TagServices/DeleteService"));
const SimpleListService_1 = __importDefault(require("../services/TagServices/SimpleListService"));
const SyncTagsService_1 = __importDefault(require("../services/TagServices/SyncTagsService"));
const KanbanListService_1 = __importDefault(require("../services/TagServices/KanbanListService"));
const ContactTag_1 = __importDefault(require("../models/ContactTag"));
// Configuração do multer para upload de mídia
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return cb(new Error('Company ID não encontrado'), '');
        }
        const uploadPath = path_1.default.join(__dirname, `../../public/company${companyId}/lanes`);
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `lane-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            'video/mp4', 'video/avi', 'video/mov', 'video/webm',
            'application/x-ret'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(null, false);
        }
    }
});
exports.uploadMiddleware = upload.array('mediaFiles', 5); // Máximo 5 arquivos
const index = async (req, res) => {
    const { pageNumber, searchParam, kanban, tagId, limit } = req.query;
    const { companyId } = req.user;
    const { tags, count, hasMore } = await (0, ListService_1.default)({
        searchParam,
        pageNumber,
        companyId,
        kanban,
        tagId,
        limit
    });
    return res.json({ tags, count, hasMore });
};
exports.index = index;
const store = async (req, res) => {
    const { name, color, kanban, timeLane, nextLaneId, greetingMessageLane, rollbackLaneId } = req.body;
    const { companyId } = req.user;
    // Processar arquivos de mídia
    let mediaFilesData = null;
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files;
        mediaFilesData = JSON.stringify(files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: `/company${companyId}/lanes/${file.filename}`
        })));
    }
    const tag = await (0, CreateService_1.default)({
        name,
        color,
        kanban,
        companyId,
        timeLane,
        nextLaneId,
        greetingMessageLane,
        rollbackLaneId,
        mediaFiles: mediaFilesData
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId))
        .emit(`company${companyId}-tag`, {
        action: "create",
        tag
    });
    return res.status(200).json(tag);
};
exports.store = store;
const show = async (req, res) => {
    const { tagId } = req.params;
    const tag = await (0, ShowService_1.default)(tagId);
    return res.status(200).json(tag);
};
exports.show = show;
const update = async (req, res) => {
    const { kanban } = req.body;
    //console.log(kanban)
    if (req.user.profile !== "admin" && kanban === 1) {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { tagId } = req.params;
    const { companyId } = req.user;
    // Buscar tag existente para preservar mediaFiles se não houver novos uploads
    const existingTag = await (0, ShowService_1.default)(tagId);
    // Processar arquivos de mídia
    let mediaFilesData = existingTag.mediaFiles; // Preservar arquivos existentes por padrão
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files;
        const companyId = req.user?.companyId;
        mediaFilesData = JSON.stringify(files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: `/company${companyId}/lanes/${file.filename}`
        })));
    }
    const tagData = {
        ...req.body,
        mediaFiles: mediaFilesData
    };
    const tag = await (0, UpdateService_1.default)({ tagData, id: tagId });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId))
        .emit(`company${companyId}-tag`, {
        action: "update",
        tag
    });
    return res.status(200).json(tag);
};
exports.update = update;
const remove = async (req, res) => {
    const { tagId } = req.params;
    const { companyId } = req.user;
    await (0, DeleteService_1.default)(tagId);
    const io = (0, socket_1.getIO)();
    io.of(String(companyId))
        .emit(`company${companyId}-tag`, {
        action: "delete",
        tagId
    });
    return res.status(200).json({ message: "Tag deleted" });
};
exports.remove = remove;
const list = async (req, res) => {
    const { searchParam, kanban } = req.query;
    const { companyId } = req.user;
    const tags = await (0, SimpleListService_1.default)({ searchParam, kanban, companyId });
    return res.json(tags);
};
exports.list = list;
const kanban = async (req, res) => {
    const { companyId } = req.user;
    const tags = await (0, KanbanListService_1.default)({ companyId });
    return res.json({ lista: tags });
};
exports.kanban = kanban;
const syncTags = async (req, res) => {
    const data = req.body;
    const { companyId } = req.user;
    const tags = await (0, SyncTagsService_1.default)({ ...data, companyId });
    return res.json(tags);
};
exports.syncTags = syncTags;
const removeContactTag = async (req, res) => {
    const { tagId, contactId } = req.params;
    const { companyId } = req.user;
    console.log(tagId, contactId);
    await ContactTag_1.default.destroy({
        where: {
            tagId: parseInt(tagId),
            contactId: parseInt(contactId)
        }
    });
    const tag = await (0, ShowService_1.default)(tagId);
    const io = (0, socket_1.getIO)();
    io.of(String(companyId))
        .emit(`company${companyId}-tag`, {
        action: "update",
        tag
    });
    return res.status(200).json({ message: "Tag deleted" });
};
exports.removeContactTag = removeContactTag;
