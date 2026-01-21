"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storePrivateFile = exports.storeLogo = exports.publicShow = exports.updateOne = exports.getSetting = exports.update = exports.showOne = exports.index = void 0;
const socket_1 = require("../libs/socket");
const AppError_1 = __importDefault(require("../errors/AppError"));
const UpdateSettingService_1 = __importDefault(require("../services/SettingServices/UpdateSettingService"));
const ListSettingsService_1 = __importDefault(require("../services/SettingServices/ListSettingsService"));
const ListSettingsServiceOne_1 = __importDefault(require("../services/SettingServices/ListSettingsServiceOne"));
const GetSettingService_1 = __importDefault(require("../services/SettingServices/GetSettingService"));
const UpdateOneSettingService_1 = __importDefault(require("../services/SettingServices/UpdateOneSettingService"));
const GetPublicSettingService_1 = __importDefault(require("../services/SettingServices/GetPublicSettingService"));
const index = async (req, res) => {
    const { companyId } = req.user;
    // if (req.user.profile !== "admin") {
    //   throw new AppError("ERR_NO_PERMISSION", 403);
    // }
    const settings = await (0, ListSettingsService_1.default)({ companyId });
    return res.status(200).json(settings);
};
exports.index = index;
const showOne = async (req, res) => {
    const { companyId } = req.user;
    const { settingKey: key } = req.params;
    const settingsTransfTicket = await (0, ListSettingsServiceOne_1.default)({
        companyId: companyId,
        key: key
    });
    return res.status(200).json(settingsTransfTicket);
};
exports.showOne = showOne;
const update = async (req, res) => {
    if (req.user.profile !== "admin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { settingKey: key } = req.params;
    const { value } = req.body;
    const { companyId } = req.user;
    const setting = await (0, UpdateSettingService_1.default)({
        key,
        value,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId)).emit(`company-${companyId}-settings`, {
        action: "update",
        setting
    });
    return res.status(200).json(setting);
};
exports.update = update;
const getSetting = async (req, res) => {
    const { settingKey: key } = req.params;
    const setting = await (0, GetSettingService_1.default)({ key });
    return res.status(200).json(setting);
};
exports.getSetting = getSetting;
const updateOne = async (req, res) => {
    const { settingKey: key } = req.params;
    const { value } = req.body;
    const setting = await (0, UpdateOneSettingService_1.default)({
        key,
        value
    });
    return res.status(200).json(setting);
};
exports.updateOne = updateOne;
const publicShow = async (req, res) => {
    const { settingKey: key } = req.params;
    const { companyId } = req.query;
    const targetCompanyId = companyId ? parseInt(companyId) : undefined;
    const settingValue = await (0, GetPublicSettingService_1.default)({
        key,
        companyId: targetCompanyId
    });
    return res.status(200).json(settingValue);
};
exports.publicShow = publicShow;
const storeLogo = async (req, res) => {
    const file = req.file;
    const { mode } = req.body;
    const { companyId } = req.user;
    const validModes = [
        "Light",
        "Dark",
        "Favicon",
        "BackgroundLight",
        "BackgroundDark"
    ];
    if (validModes.indexOf(mode) === -1) {
        return res.status(406);
    }
    if (file && file.mimetype.startsWith("image/")) {
        const setting = await (0, UpdateSettingService_1.default)({
            key: `appLogo${mode}`,
            value: file.filename,
            companyId
        });
        return res.status(200).json(setting.value);
    }
    return res.status(406);
};
exports.storeLogo = storeLogo;
const storePrivateFile = async (req, res) => {
    const file = req.file;
    const { settingKey } = req.body;
    const { companyId } = req.user;
    const setting = await (0, UpdateSettingService_1.default)({
        key: `_${settingKey}`,
        value: file.filename,
        companyId
    });
    return res.status(200).json(setting.value);
};
exports.storePrivateFile = storePrivateFile;
