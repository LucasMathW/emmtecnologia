"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wbot_1 = require("../libs/wbot");
const ShowWhatsAppService_1 = __importDefault(require("../services/WhatsappService/ShowWhatsAppService"));
const StartWhatsAppSession_1 = require("../services/WbotServices/StartWhatsAppSession");
const DeleteBaileysService_1 = __importDefault(require("../services/BaileysServices/DeleteBaileysService"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const store = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    // console.log("STARTING SESSION", whatsappId)
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId);
    await (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, companyId);
    return res.status(200).json({ message: "Starting session." });
};
const update = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    // const { whatsapp } = await UpdateWhatsAppService({
    //   whatsappId,
    //   companyId,
    //   whatsappData: { session: "", requestQR: true }
    // });
    const whatsapp = await Whatsapp_1.default.findOne({ where: { id: whatsappId, companyId } });
    await whatsapp.update({ session: "" });
    if (whatsapp.channel === "whatsapp") {
        await (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, companyId);
    }
    return res.status(200).json({ message: "Starting session." });
};
const remove = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    console.log("DISCONNECTING SESSION", whatsappId);
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId);
    if (whatsapp.channel === "whatsapp") {
        await (0, DeleteBaileysService_1.default)(whatsappId);
        const wbot = await (0, wbot_1.getWbot)(whatsapp.id);
        wbot.logout();
        wbot.ws.close();
    }
    return res.status(200).json({ message: "Session disconnected." });
};
exports.default = { store, remove, update };
