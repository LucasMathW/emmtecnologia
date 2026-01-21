"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/services/AnnouncementService/ListService.ts - Atualização
const sequelize_1 = require("sequelize");
const lodash_1 = require("lodash");
const Announcement_1 = __importDefault(require("../../models/Announcement"));
const AnnouncementAck_1 = __importDefault(require("../../models/AnnouncementAck"));
const Company_1 = __importDefault(require("../../models/Company"));
const ListService = async ({ searchParam = "", pageNumber = "1", userCompanyId }) => {
    let whereCondition = {
        [sequelize_1.Op.or]: [
            { expiresAt: null },
            { expiresAt: { [sequelize_1.Op.gt]: new Date() } } // Informativos não expirados
        ]
    };
    // 🎯 FILTRO POR EMPRESA
    if (userCompanyId) {
        whereCondition = {
            ...whereCondition,
            [sequelize_1.Op.or]: [
                { targetCompanyId: null },
                { targetCompanyId: userCompanyId } // Informativos específicos da empresa
            ]
        };
        // 🔕 Excluir anúncios já reconhecidos pela empresa
        const ackRows = await AnnouncementAck_1.default.findAll({
            where: { companyId: userCompanyId },
            attributes: ["announcementId"],
            raw: true
        });
        const ackIds = ackRows.map((r) => r.announcementId);
        if (ackIds.length > 0) {
            whereCondition = {
                ...whereCondition,
                id: { [sequelize_1.Op.notIn]: ackIds }
            };
        }
    }
    if (!(0, lodash_1.isEmpty)(searchParam)) {
        whereCondition = {
            ...whereCondition,
            [sequelize_1.Op.and]: [
                whereCondition,
                {
                    [sequelize_1.Op.or]: [
                        {
                            title: (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("Announcement.title")), "LIKE", `%${searchParam.toLowerCase().trim()}%`)
                        }
                    ]
                }
            ]
        };
    }
    const limit = 20;
    const offset = limit * (+pageNumber - 1);
    const { count, rows: records } = await Announcement_1.default.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [
            ['priority', 'ASC'],
            ['createdAt', 'DESC']
        ],
        include: [
            { model: Company_1.default, as: "company", attributes: ["id", "name"] },
            { model: Company_1.default, as: "targetCompany", attributes: ["id", "name"] }
        ]
    });
    const hasMore = count > offset + records.length;
    return {
        records,
        count,
        hasMore
    };
};
exports.default = ListService;
