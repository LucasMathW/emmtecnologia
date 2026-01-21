"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Contact_1 = __importDefault(require("../../models/Contact"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const ContactWallet_1 = __importDefault(require("../../models/ContactWallet"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const User_1 = __importDefault(require("../../models/User"));
const ShowContactService = async (id, companyId) => {
    const contact = await Contact_1.default.findByPk(id, {
        include: ["extraInfo", "tags",
            {
                association: "wallets",
                attributes: ["id", "name"]
            },
            {
                model: Whatsapp_1.default,
                as: "whatsapp",
                attributes: ["id", "name", "expiresTicket", "groupAsTicket", "color"]
            },
            {
                model: ContactWallet_1.default,
                include: [
                    {
                        model: User_1.default,
                        attributes: ["id", "name"]
                    },
                    {
                        model: Queue_1.default,
                        attributes: ["id", "name"]
                    }
                ]
            },
        ]
    });
    if (contact?.companyId !== companyId) {
        throw new AppError_1.default("Não é possível excluir registro de outra empresa");
    }
    if (!contact) {
        throw new AppError_1.default("ERR_NO_CONTACT_FOUND", 404);
    }
    return contact;
};
exports.default = ShowContactService;
