"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GetDefaultWhatsApp_1 = __importDefault(require("../../helpers/GetDefaultWhatsApp"));
const wbot_1 = require("../../libs/wbot");
const utils_1 = require("../../utils");
const GetProfilePicUrl = async (number, companyId, contact) => {
    const normalizedNumber = (0, utils_1.normalizeJid)(number);
    const defaultWhatsapp = await (0, GetDefaultWhatsApp_1.default)(companyId);
    const wbot = await (0, wbot_1.getWbot)(defaultWhatsapp.id);
    let profilePicUrl;
    try {
        profilePicUrl = await wbot.profilePictureUrl(contact && contact.isGroup ? contact.remoteJid : `${normalizedNumber}`, "image");
    }
    catch (error) {
        profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
    }
    return profilePicUrl;
};
exports.default = GetProfilePicUrl;
