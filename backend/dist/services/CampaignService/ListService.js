"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Campaign_1 = __importDefault(require("../../models/Campaign"));
const lodash_1 = require("lodash");
const ContactList_1 = __importDefault(require("../../models/ContactList"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const ListService = async ({ searchParam = "", pageNumber = "1", pageSize = "10", companyId, status, isRecurring }) => {
    let whereCondition = {
        companyId
    };
    // Filtro por status
    if (status && status !== "") {
        whereCondition.status = status;
    }
    // Filtro por recorrência
    if (isRecurring && isRecurring !== "") {
        if (isRecurring === "true") {
            whereCondition.isRecurring = true;
        }
        else if (isRecurring === "false") {
            whereCondition.isRecurring = false;
        }
    }
    // Filtro por busca de texto
    if (!(0, lodash_1.isEmpty)(searchParam)) {
        whereCondition = {
            ...whereCondition,
            [sequelize_1.Op.or]: [
                {
                    name: (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("Campaign.name")), "LIKE", `%${searchParam.toLowerCase().trim()}%`)
                }
            ]
        };
    }
    const limit = parseInt(pageSize);
    const offset = limit * (+pageNumber - 1);
    const { count, rows: records } = await Campaign_1.default.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [["status", "ASC"], ["scheduledAt", "DESC"]],
        include: [
            { model: ContactList_1.default },
            { model: Whatsapp_1.default, attributes: ["id", "name", "color"] }
        ]
    });
    const totalPages = Math.ceil(count / limit);
    const hasMore = +pageNumber < totalPages;
    return {
        records,
        count,
        hasMore,
        totalPages,
        currentPage: +pageNumber,
        pageSize: limit
    };
};
exports.default = ListService;
