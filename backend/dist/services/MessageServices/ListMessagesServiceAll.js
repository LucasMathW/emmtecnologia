"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_typescript_1 = require("sequelize-typescript");
const sequelize_1 = require("sequelize");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dbConfig = require("../../config/database");
const sequelize = new sequelize_typescript_1.Sequelize(dbConfig);
const ListMessagesServiceAll = async ({ companyId, fromMe, dateStart, dateEnd }) => {
    let ticketsCounter;
    const queryParams = { companyId };
    let query = `SELECT COUNT(1) FROM "Messages" m WHERE "companyId" = :companyId`;
    if (fromMe) {
        query += ` AND "fromMe" = :fromMe`;
        queryParams.fromMe = fromMe;
    }
    if (dateStart && dateEnd) {
        query += ` AND "createdAt" BETWEEN :dateStart AND :dateEnd`;
        queryParams.dateStart = `${dateStart} 00:00:00`;
        queryParams.dateEnd = `${dateEnd} 23:59:59`;
    }
    ticketsCounter = await sequelize.query(query, {
        type: sequelize_1.QueryTypes.SELECT,
        replacements: queryParams
    });
    return {
        count: ticketsCounter,
    };
};
exports.default = ListMessagesServiceAll;
