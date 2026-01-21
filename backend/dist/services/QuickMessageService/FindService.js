"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const QuickMessage_1 = __importDefault(require("../../models/QuickMessage"));
const Company_1 = __importDefault(require("../../models/Company"));
const QuickMessageComponent_1 = __importDefault(require("../../models/QuickMessageComponent"));
const ShowCompanyService_1 = __importDefault(require("../CompanyService/ShowCompanyService"));
const FindService = async ({ companyId, userId, isOficial, whatsappId }) => {
    const company = await (0, ShowCompanyService_1.default)(companyId);
    const useOficial = company.plan.useWhatsappOfficial;
    const notes = await QuickMessage_1.default.findAll({
        where: {
            companyId,
            [sequelize_1.Op.or]: [
                {
                    visao: true // Se "visao" é verdadeiro, todas as mensagens são visíveis
                },
                {
                    userId // Se "visao" é falso, apenas as mensagens do usuário atual são visíveis
                }
            ],
            // ...(useOficial && isOficial === "true" && whatsappId ? { whatsappId } : {}),
            isOficial: useOficial ?
                isOficial === "true" ? true : { [sequelize_1.Op.or]: [true, false] }
                : false
        },
        include: [
            {
                model: Company_1.default,
                as: "company",
                attributes: ["id", "name"]
            },
            {
                model: QuickMessageComponent_1.default,
                as: "components",
                attributes: ["id", "type", "text", "quickMessageId", "buttons", "format", "example"],
                order: [["quickMessageId", "ASC"], ["id", "ASC"]]
            }
        ],
        // order: [["shortcode", "ASC"]]
    });
    return notes;
};
exports.default = FindService;
