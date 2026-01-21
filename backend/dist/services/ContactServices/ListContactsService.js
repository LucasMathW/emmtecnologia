"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Contact_1 = __importDefault(require("../../models/Contact"));
const ContactTag_1 = __importDefault(require("../../models/ContactTag"));
const Tag_1 = __importDefault(require("../../models/Tag"));
const ContactCustomField_1 = __importDefault(require("../../models/ContactCustomField"));
const remove_accents_1 = __importDefault(require("remove-accents"));
const lodash_1 = require("lodash");
const ContactWallet_1 = __importDefault(require("../../models/ContactWallet"));
const User_1 = __importDefault(require("../../models/User"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const FindCompanySettingsService_1 = __importDefault(require("../CompaniesSettings/FindCompanySettingsService"));
const buildWhereCondition = async ({ searchParam, companyId, tagsIds, isGroup, userId }) => {
    const userProfile = await User_1.default.findOne({ where: { id: userId }, attributes: ["profile"] });
    const settings = await (0, FindCompanySettingsService_1.default)({
        companyId
    });
    const DirectTicketsToWallets = settings.DirectTicketsToWallets;
    let whereCondition = { companyId };
    if (searchParam) {
        const sanitizedSearchParam = (0, remove_accents_1.default)(searchParam.toLocaleLowerCase().trim());
        whereCondition = {
            ...whereCondition,
            [sequelize_1.Op.or]: [
                {
                    name: (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.fn)("unaccent", (0, sequelize_1.col)("Contact.name"))), "LIKE", `%${sanitizedSearchParam}%`)
                },
                { number: { [sequelize_1.Op.like]: `%${sanitizedSearchParam}%` } }
            ]
        };
    }
    if (Array.isArray(tagsIds) && tagsIds.length > 0) {
        const contactTags = await ContactTag_1.default.findAll({
            where: { tagId: { [sequelize_1.Op.in]: tagsIds } },
            attributes: ["contactId"]
        });
        const contactTagsIntersection = (0, lodash_1.intersection)(contactTags.map(t => t.contactId));
        whereCondition = {
            ...whereCondition,
            id: {
                [sequelize_1.Op.in]: contactTagsIntersection
            }
        };
    }
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
    if (isGroup === "false") {
        whereCondition = {
            ...whereCondition,
            isGroup: false
        };
    }
    return whereCondition;
};
const ListContactsService = async ({ searchParam = "", pageNumber = "1", companyId, tagsIds, isGroup, userId }) => {
    const whereCondition = await buildWhereCondition({
        searchParam,
        companyId,
        tagsIds,
        isGroup,
        userId
    });
    const limit = 100;
    const offset = limit * (+pageNumber - 1);
    const { count, rows: contacts } = await Contact_1.default.findAndCountAll({
        where: whereCondition,
        attributes: [
            "id",
            "name",
            "number",
            "email",
            "birthDate",
            "isGroup",
            "urlPicture",
            "active",
            "companyId",
            "channel"
        ],
        limit,
        offset,
        include: [
            {
                model: Tag_1.default,
                as: "tags",
                attributes: ["id", "name"]
            },
            {
                model: ContactCustomField_1.default,
                as: "extraInfo"
            },
            {
                model: ContactWallet_1.default,
                as: "contactWallets",
                include: [
                    {
                        model: User_1.default,
                        as: "wallet",
                        attributes: ["id", "name"]
                    },
                    {
                        model: Queue_1.default,
                        as: "queue",
                        attributes: ["id", "name"]
                    }
                ]
            }
        ],
        order: [["name", "ASC"]]
    });
    const hasMore = count > offset + contacts.length;
    return {
        contacts,
        count,
        hasMore
    };
};
exports.default = ListContactsService;
