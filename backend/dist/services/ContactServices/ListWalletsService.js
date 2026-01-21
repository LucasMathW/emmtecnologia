"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const ContactWallet_1 = __importDefault(require("../../models/ContactWallet"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const User_1 = __importDefault(require("../../models/User"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const ListWalletsService = async ({ searchParam = "", pageNumber = "1", userId, companyId }) => {
    const limit = 20;
    const offset = limit * (+pageNumber - 1);
    const whereCondition = {
        companyId
    };
    if (userId) {
        whereCondition.walletId = userId;
    }
    const { count, rows: wallets } = await ContactWallet_1.default.findAndCountAll({
        where: whereCondition,
        include: [
            {
                model: Contact_1.default,
                as: "contact",
                where: searchParam ? {
                    [sequelize_1.Op.or]: [
                        { name: { [sequelize_1.Op.like]: `%${searchParam}%` } },
                        { number: { [sequelize_1.Op.like]: `%${searchParam}%` } },
                        { email: { [sequelize_1.Op.like]: `%${searchParam}%` } }
                    ]
                } : undefined,
                attributes: ["id", "name", "number", "email"]
            },
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
        ],
        limit,
        offset,
        order: [["createdAt", "DESC"]]
    });
    const hasMore = count > offset + wallets.length;
    const formattedWallets = wallets.map(wallet => ({
        id: wallet.id,
        contactId: wallet.contactId,
        contactName: wallet.contact?.name,
        contactNumber: wallet.contact?.number,
        contactEmail: wallet.contact?.email,
        userId: wallet.walletId,
        userName: wallet.wallet?.name,
        queueId: wallet.queueId,
        queueName: wallet.queue?.name,
        createdAt: wallet.createdAt
    }));
    return {
        wallets: formattedWallets,
        count,
        hasMore
    };
};
exports.default = ListWalletsService;
