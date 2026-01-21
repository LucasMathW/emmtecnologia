"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const QuickMessage_1 = __importDefault(require("../../models/QuickMessage"));
const QuickMessageComponent_1 = __importDefault(require("../../models/QuickMessageComponent"));
const ListService = async ({ searchParam = "", pageNumber = "1", companyId, userId, isOficial = false }) => {
    const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();
    let whereCondition = {
        // [Op.or]: [
        //   {
        shortcode: sequelize_1.Sequelize.where(sequelize_1.Sequelize.fn("LOWER", sequelize_1.Sequelize.col("shortcode")), "LIKE", `%${sanitizedSearchParam}%`)
        //   },
        //   {
        //     message: Sequelize.where(
        //       Sequelize.fn("LOWER", Sequelize.col("message")),
        //       "LIKE",
        //       `%${sanitizedSearchParam}%`
        //     )
        //   }
        // ]
    };
    whereCondition = {
        ...whereCondition,
        companyId,
        [sequelize_1.Op.or]: [
            {
                visao: true // Se "visao" é verdadeiro, todas as mensagens são visíveis
            },
            {
                userId // Se "visao" é falso, apenas as mensagens do usuário atual são visíveis
            }
        ]
    };
    whereCondition = {
        ...whereCondition,
        isOficial: isOficial ? { [sequelize_1.Op.or]: [true, false] } : false
    };
    const limit = 20;
    const offset = limit * (+pageNumber - 1);
    const { count, rows: records } = await QuickMessage_1.default.findAndCountAll({
        where: whereCondition,
        include: [
            {
                model: QuickMessageComponent_1.default,
                as: "components",
                attributes: ["id", "quickMessageId", "type", "text"]
            }
        ],
        limit,
        offset,
        order: [["shortcode", "ASC"]]
    });
    const hasMore = count > offset + records.length;
    return {
        records,
        count,
        hasMore
    };
};
exports.default = ListService;
