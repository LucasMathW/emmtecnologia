"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWhatsappUserId = exports.getHistoric = exports.createCallHistoric = void 0;
const CreateCallService_1 = __importDefault(require("../services/CallService/CreateCallService"));
const GetCallService_1 = __importDefault(require("../services/CallService/GetCallService"));
const GetWhatsappUserId_1 = __importDefault(require("../services/CallService/GetWhatsappUserId"));
const createCallHistoric = async (req, res) => {
    const body = req.body;
    const callHistorical = await (0, CreateCallService_1.default)(body);
    return res.status(200).json({ callHistorical });
};
exports.createCallHistoric = createCallHistoric;
const getHistoric = async (req, res) => {
    try {
        const historical = await (0, GetCallService_1.default)({
            "user_id": parseInt(req.user.id),
            "company_id": req.user.companyId
        });
        return res.status(200).json({ historical });
    }
    catch (error) {
        return res.status(403).json({
            error: error.message || String(error),
            stack: error.stack
        });
    }
};
exports.getHistoric = getHistoric;
const getWhatsappUserId = async (req, res) => {
    const whatsapps = await (0, GetWhatsappUserId_1.default)(parseInt(req.user.id));
    return res.status(200).json(whatsapps);
};
exports.getWhatsappUserId = getWhatsappUserId;
