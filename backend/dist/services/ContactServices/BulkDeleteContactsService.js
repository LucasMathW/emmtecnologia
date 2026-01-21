"use strict";
// Criar arquivo: BulkDeleteContactsService.ts
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
const BulkDeleteContactsService = async ({ contactIds, companyId }) => {
    const transaction = await database_1.default.transaction();
    try {
        // Verificar se todos os contatos existem e pertencem à empresa
        const existingContacts = await Contact_1.default.findAll({
            where: {
                id: {
                    [sequelize_1.Op.in]: contactIds
                },
                companyId
            },
            attributes: ["id"],
            transaction
        });
        if (existingContacts.length === 0) {
            throw new AppError_1.default("No contacts found for deletion", 404);
        }
        const existingContactIds = existingContacts.map(contact => contact.id);
        // Verificar se algum ID não foi encontrado
        const notFoundIds = contactIds.filter(id => !existingContactIds.includes(id));
        if (notFoundIds.length > 0) {
            console.warn(`Contacts not found or not belonging to company: ${notFoundIds.join(', ')}`);
        }
        // Excluir relacionamentos em ordem (FK constraints)
        await ContactCustomField_1.default.destroy({
            where: {
                contactId: {
                    [sequelize_1.Op.in]: existingContactIds
                }
            },
            transaction
        });
        await ContactWallet_1.default.destroy({
            where: {
                contactId: {
                    [sequelize_1.Op.in]: existingContactIds
                },
                companyId
            },
            transaction
        });
        await ContactTag_1.default.destroy({
            where: {
                contactId: {
                    [sequelize_1.Op.in]: existingContactIds
                }
            },
            transaction
        });
        // Excluir contatos
        const deletedCount = await Contact_1.default.destroy({
            where: {
                id: {
                    [sequelize_1.Op.in]: existingContactIds
                },
                companyId
            },
            transaction
        });
        await transaction.commit();
        return deletedCount;
    }
    catch (error) {
        await transaction.rollback();
        console.error("Error in BulkDeleteContactsService:", error);
        if (error instanceof AppError_1.default) {
            throw error;
        }
        throw new AppError_1.default("Failed to delete contacts", 500);
    }
};
exports.default = BulkDeleteContactsService;
