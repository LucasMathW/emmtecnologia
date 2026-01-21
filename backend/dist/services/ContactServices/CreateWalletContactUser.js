"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWalletContactUser = void 0;
const ContactWallet_1 = __importDefault(require("../../models/ContactWallet"));
const UserQueue_1 = __importDefault(require("../../models/UserQueue"));
async function createWalletContactUser(contactId, userId, queueId, companyId) {
    let _queueId = queueId;
    await ContactWallet_1.default.destroy({
        where: {
            companyId,
            contactId
        }
    });
    if (queueId === null || queueId === undefined || queueId === "null" || queueId === "undefined") {
        const queues = await UserQueue_1.default.findAll({
            where: {
                userId
            }
        });
        if (queues.length > 0) {
            const randomIndex = Math.floor(Math.random() * queues.length);
            _queueId = queues[randomIndex]?.queueId;
        }
    }
    const contactWallets = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contactWallets.push({
        walletId: userId,
        queueId: queueId ? queueId : _queueId,
        contactId: contactId,
        companyId: companyId
    });
    await ContactWallet_1.default.bulkCreate(contactWallets);
}
exports.createWalletContactUser = createWalletContactUser;
