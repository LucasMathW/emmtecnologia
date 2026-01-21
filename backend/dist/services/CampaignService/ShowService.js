"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Campaign_1 = __importDefault(require("../../models/Campaign"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const ContactList_1 = __importDefault(require("../../models/ContactList"));
const ContactListItem_1 = __importDefault(require("../../models/ContactListItem"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const User_1 = __importDefault(require("../../models/User"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const ShowService = async (id) => {
    const record = await Campaign_1.default.findByPk(id, {
        include: [
            // Removido CampaignShipping para evitar estouro de memória
            // Os dados de shipping serão carregados separadamente via endpoint dedicado
            { model: ContactList_1.default, include: [{ model: ContactListItem_1.default }] },
            { model: Whatsapp_1.default, attributes: ["id", "name", "color"] },
            { model: User_1.default, attributes: ["id", "name"] },
            { model: Queue_1.default, attributes: ["id", "name", "color"] },
        ]
    });
    if (!record) {
        throw new AppError_1.default("ERR_NO_TICKETNOTE_FOUND", 404);
    }
    return record;
};
exports.default = ShowService;
