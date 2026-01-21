"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const GetDefaultWhatsApp_1 = __importDefault(require("../../helpers/GetDefaultWhatsApp"));
const wbot_1 = require("../../libs/wbot");
const logger_1 = __importDefault(require("../../utils/logger"));
const toJid = (num) => num.includes("@") ? num : `${num}@s.whatsapp.net`;
const checker = async (number, wbot) => {
    const result = await wbot.onWhatsApp(toJid(number));
    if (!result) {
        logger_1.default.error({ number }, "Failed to check number on whatsapp");
        throw new AppError_1.default("ERR_INVALID_NUMBER", 400);
    }
    if (!result?.[0]?.exists) {
        throw new AppError_1.default("ERR_CHECK_NUMBER", 404);
    }
    const lid = result.lid ?? null;
    return {
        jid: result[0]?.jid,
        exists: true,
        lid
    };
};
const CheckContactNumber = async (number, companyId, isGroup = false, userId, whatsapp) => {
    const whatsappList = whatsapp || (await (0, GetDefaultWhatsApp_1.default)(companyId, userId));
    if (whatsappList.channel === "whatsapp_oficial") {
        return { jid: toJid(number), exists: true, lid: null };
    }
    const wbot = await (0, wbot_1.getWbot)(whatsappList.id);
    if (isGroup) {
        const meta = await wbot.groupMetadata(number);
        return { jid: meta.id, exists: true, lid: null };
    }
    if (whatsappList.channel === "whatsapp_oficial") {
        return { jid: toJid(number), exists: true, lid: null };
    }
    return checker(number, wbot);
};
exports.default = CheckContactNumber;
