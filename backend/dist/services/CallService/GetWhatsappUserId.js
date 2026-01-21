"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../../models/User"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const GetWhatsappUserId = async (id) => {
    return await User_1.default.findOne({
        raw: true,
        nest: true,
        include: [{
                model: Whatsapp_1.default,
                attributes: ['id', 'status', 'name', 'companyId', 'wavoip'],
            }],
        where: { id }
    });
};
exports.default = GetWhatsappUserId;
