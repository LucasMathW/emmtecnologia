"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Files_1 = __importDefault(require("../../models/Files"));
const ListService = async ({ searchParam, pageNumber = "1", companyId }) => {
    let whereCondition = {};
    const limit = 20;
    const offset = limit * (+pageNumber - 1);
    if (searchParam) {
        const sanitizedSearchParam = searchParam.replace(/[^\w\s]/g, '').toLowerCase();
        whereCondition = {
            [sequelize_1.Op.or]: [{
                    body: (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.fn)('unaccent', (0, sequelize_1.col)("name"))), "LIKE", `%${sanitizedSearchParam}%`),
                }]
        };
    }
    const { count, rows: files } = await Files_1.default.findAndCountAll({
        where: { companyId, ...whereCondition },
        limit,
        offset,
        order: [["name", "ASC"]]
    });
    const hasMore = count > offset + files.length;
    return {
        files,
        count,
        hasMore
    };
};
exports.default = ListService;
