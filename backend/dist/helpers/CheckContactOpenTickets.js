"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const AppError_1 = __importDefault(require("../errors/AppError"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const User_1 = __importDefault(require("../models/User"));
const Queue_1 = __importDefault(require("../models/Queue"));
const CheckContactOpenTickets = async (contactId, whatsappId) => {
    const ticket = await Ticket_1.default.findOne({
        where: { contactId, status: { [sequelize_1.Op.or]: ["open", "pending", "chatbot"] }, whatsappId },
        include: [{
                model: Queue_1.default,
                as: "queue",
                attributes: ["id", "name", "color"]
            },
            {
                model: User_1.default,
                as: "user",
                attributes: ["id", "name"]
            }]
    });
    if (ticket) {
        // throw new AppError(`CONTATO COM TICKET ABERTO POR OUTRO USUÁRIO: ${user?.name.toUpperCase( )}`);
        throw new AppError_1.default(JSON.stringify(ticket), 409);
    }
};
exports.default = CheckContactOpenTickets;
