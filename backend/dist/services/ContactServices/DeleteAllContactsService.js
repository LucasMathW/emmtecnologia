"use strict";
// Criar arquivo: DeleteAllContactsService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../../database"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const ContactCustomField_1 = __importDefault(require("../../models/ContactCustomField"));
const ContactWallet_1 = __importDefault(require("../../models/ContactWallet"));
const ContactTag_1 = __importDefault(require("../../models/ContactTag"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const sequelize_1 = require("sequelize");
const DeleteAllContactsService = async ({ companyId, excludeIds = [] }) => {
    const transaction = await database_1.default.transaction();
    try {
        // Construir condição WHERE
        const whereCondition = { companyId };
        if (excludeIds.length > 0) {
            whereCondition.id = {
                [sequelize_1.Op.notIn]: excludeIds
            };
        }
        // Buscar todos os IDs dos contatos que serão excluídos
        const contactsToDelete = await Contact_1.default.findAll({
            where: whereCondition,
            attributes: ["id"],
            transaction
        });
        if (contactsToDelete.length === 0) {
            throw new AppError_1.default("No contacts found for deletion", 404);
        }
        const contactIds = contactsToDelete.map(contact => contact.id);
        // Excluir relacionamentos em ordem (FK constraints)
        await ContactCustomField_1.default.destroy({
            where: {
                contactId: {
                    [sequelize_1.Op.in]: contactIds
                }
            },
            transaction
        });
        await ContactWallet_1.default.destroy({
            where: {
                contactId: {
                    [sequelize_1.Op.in]: contactIds
                },
                companyId
            },
            transaction
        });
        await ContactTag_1.default.destroy({
            where: {
                contactId: {
                    [sequelize_1.Op.in]: contactIds
                }
            },
            transaction
        });
        // Excluir contatos
        const deletedCount = await Contact_1.default.destroy({
            where: whereCondition,
            transaction
        });
        await transaction.commit();
        return deletedCount;
    }
    catch (error) {
        await transaction.rollback();
        console.error("Error in DeleteAllContactsService:", error);
        if (error instanceof AppError_1.default) {
            throw error;
        }
        throw new AppError_1.default("Failed to delete all contacts", 500);
    }
};
exports.default = DeleteAllContactsService;
