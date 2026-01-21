"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Contact_1 = __importDefault(require("../../models/Contact"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const sequelize_1 = require("sequelize");
const User_1 = __importDefault(require("../../models/User"));
const FindCompanySettingsService_1 = __importDefault(require("../CompaniesSettings/FindCompanySettingsService"));
const SimpleListService = async ({ name, companyId, userId }) => {
    console.log("userId", userId);
    console.log("companyId", companyId);
    let options = {
        order: [
            ['name', 'ASC']
        ]
    };
    // Verificar configurações da empresa e perfil do usuário para regra de carteira
    const userProfile = userId ? await User_1.default.findOne({ where: { id: userId }, attributes: ["profile"] }) : null;
    const settings = await (0, FindCompanySettingsService_1.default)({ companyId: Number(companyId) });
    const DirectTicketsToWallets = settings.DirectTicketsToWallets;
    let whereCondition = { companyId };
    if (name) {
        whereCondition.name = {
            [sequelize_1.Op.like]: `%${name}%`
        };
    }
    // Aplicar regra de carteira se o usuário tem perfil "user" e a configuração está ativa
    if (DirectTicketsToWallets && userProfile && userProfile.profile === "user" && userId) {
        whereCondition = {
            ...whereCondition,
            [sequelize_1.Op.and]: [
                whereCondition,
                {
                    id: {
                        [sequelize_1.Op.in]: sequelize_1.Sequelize.literal(`(SELECT "contactId" FROM "ContactWallets" WHERE "walletId" = ${userId} AND "companyId" = ${companyId})`)
                    }
                }
            ]
        };
    }
    options.where = whereCondition;
    const contacts = await Contact_1.default.findAll(options);
    if (!contacts) {
        throw new AppError_1.default("ERR_NO_CONTACT_FOUND", 404);
    }
    return contacts;
};
exports.default = SimpleListService;
