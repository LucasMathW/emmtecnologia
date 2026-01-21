"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveTagService = exports.RemoveTagsService = void 0;
const ContactTag_1 = __importDefault(require("../../models/ContactTag"));
const Tag_1 = __importDefault(require("../../models/Tag"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const logger_1 = __importDefault(require("../../utils/logger"));
const RemoveTagsService = async ({ contactId, tags, companyId }) => {
    try {
        // Verificar se o contato existe e pertence à empresa
        const contact = await Contact_1.default.findOne({
            where: {
                id: contactId,
                companyId
            }
        });
        if (!contact) {
            throw new Error(`Contato com ID ${contactId} não encontrado ou não pertence à empresa ${companyId}`);
        }
        // Remover as tags especificadas
        for (const tag of tags) {
            await ContactTag_1.default.destroy({
                where: {
                    contactId,
                    tagId: tag.id
                }
            });
            logger_1.default.info(`[REMOVE TAG SERVICE] Tag ${tag.name} removida do contato ${contactId} da empresa ${companyId}`);
        }
        logger_1.default.info(`[REMOVE TAG SERVICE] Processo de remoção de ${tags.length} tag(s) concluído para contato ${contactId}`);
    }
    catch (error) {
        logger_1.default.error(`[REMOVE TAG SERVICE] Erro ao remover tags do contato ${contactId}:`, error);
        throw error;
    }
};
exports.RemoveTagsService = RemoveTagsService;
const RemoveTagService = async ({ contactId, tagId, companyId }) => {
    try {
        // Verificar se o contato existe e pertence à empresa
        const contact = await Contact_1.default.findOne({
            where: {
                id: contactId,
                companyId
            }
        });
        if (!contact) {
            throw new Error(`Contato com ID ${contactId} não encontrado ou não pertence à empresa ${companyId}`);
        }
        // Buscar a tag para logs
        const tag = await Tag_1.default.findByPk(tagId);
        if (!tag) {
            throw new Error(`Tag com ID ${tagId} não encontrada`);
        }
        // Remover a associação entre contato e tag
        const removed = await ContactTag_1.default.destroy({
            where: {
                contactId,
                tagId
            }
        });
        if (removed > 0) {
            logger_1.default.info(`[REMOVE TAG SERVICE] Tag ${tag.name} removida do contato ${contactId} da empresa ${companyId}`);
        }
        else {
            logger_1.default.warn(`[REMOVE TAG SERVICE] Tag ${tag.name} não estava associada ao contato ${contactId}`);
        }
    }
    catch (error) {
        logger_1.default.error(`[REMOVE TAG SERVICE] Erro ao remover tag ${tagId} do contato ${contactId}:`, error);
        throw error;
    }
};
exports.RemoveTagService = RemoveTagService;
