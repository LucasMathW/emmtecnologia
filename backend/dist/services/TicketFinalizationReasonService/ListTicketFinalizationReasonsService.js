"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const TicketFinalizationReason_1 = __importDefault(require("../../models/TicketFinalizationReason"));
const sequelize_1 = require("sequelize");
const ListTicketFinalizationReasonsService = async ({ companyId, searchParam }) => {
    const whereCondition = {
        companyId
    };
    if (searchParam) {
        whereCondition.name = {
            [sequelize_1.Op.like]: `%${searchParam}%`
        };
    }
    const reasons = await TicketFinalizationReason_1.default.findAll({
        where: whereCondition,
        order: [["name", "ASC"]]
    });
    return reasons;
};
exports.default = ListTicketFinalizationReasonsService;
