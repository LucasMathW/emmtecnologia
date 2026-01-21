"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CampaignShipping_1 = __importDefault(require("../../models/CampaignShipping"));
const ContactListItem_1 = __importDefault(require("../../models/ContactListItem"));
const Campaign_1 = __importDefault(require("../../models/Campaign"));
const ContactTag_1 = __importDefault(require("../../models/ContactTag"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const sequelize_1 = require("sequelize");
const ShippingService = async (params) => {
    const { campaignId, page = 1, pageSize = 50, searchParam, status } = params;
    // Validar parâmetros
    if (pageSize > 1000) {
        throw new AppError_1.default("Page size cannot exceed 1000", 400);
    }
    const offset = (page - 1) * pageSize;
    // Construir condições de busca
    const whereClause = {
        campaignId: campaignId
    };
    // Filtro por status
    if (status) {
        switch (status) {
            case 'delivered':
                whereClause.deliveredAt = { [sequelize_1.Op.ne]: null };
                break;
            case 'pending':
                whereClause.deliveredAt = null;
                break;
            case 'failed':
                // Implementar lógica de falha se necessário
                whereClause.deliveredAt = null;
                break;
        }
    }
    // Filtro por busca
    if (searchParam) {
        whereClause[sequelize_1.Op.or] = [
            { number: { [sequelize_1.Op.iLike]: `%${searchParam}%` } },
            { message: { [sequelize_1.Op.iLike]: `%${searchParam}%` } }
        ];
    }
    try {
        // Buscar informações da campanha para determinar se é por TAG
        const campaign = await Campaign_1.default.findByPk(campaignId, {
            attributes: ["id", "tagListId", "contactListId", "companyId"]
        });
        if (!campaign) {
            throw new AppError_1.default("Campanha não encontrada", 404);
        }
        let shipping = [];
        let count = 0;
        // Se é campanha por TAG, incluir contatos pendentes
        if (campaign.tagListId && !campaign.contactListId) {
            console.log(`[SHIPPING-SERVICE] Campanha ${campaignId} é por TAG (tagListId: ${campaign.tagListId})`);
            // 1. Buscar registros CampaignShipping existentes
            const { rows: existingShipping, count: existingCount } = await CampaignShipping_1.default.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: ContactListItem_1.default,
                        as: "contact",
                        attributes: ["id", "name", "number", "email"]
                    }
                ],
                order: [["createdAt", "DESC"]]
            });
            console.log(`[SHIPPING-SERVICE] Registros CampaignShipping existentes: ${existingCount}`);
            // 2. Buscar todos os contatos da tag
            const contactTags = await ContactTag_1.default.findAll({
                where: { tagId: campaign.tagListId },
                attributes: ["contactId"],
                include: [
                    {
                        model: Contact_1.default,
                        as: "contact",
                        where: {
                            companyId: campaign.companyId,
                            active: true
                        },
                        attributes: ["id", "name", "number", "email"]
                    }
                ],
                group: ["ContactTag.contactId", "contact.id", "contact.name", "contact.number", "contact.email"]
            });
            console.log(`[SHIPPING-SERVICE] Total de contatos na tag: ${contactTags.length}`);
            // 3. Criar registros virtuais para contatos pendentes
            const existingNumbers = new Set(existingShipping.map(s => s.number));
            const pendingContacts = contactTags
                .filter(ct => !existingNumbers.has(ct.contact.number))
                .map(ct => ({
                id: null,
                campaignId: campaignId,
                contactId: ct.contact.id,
                number: ct.contact.number,
                message: "Aguardando processamento...",
                deliveredAt: null,
                confirmationRequestedAt: null,
                confirmedAt: null,
                jobId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                contact: {
                    id: ct.contact.id,
                    name: ct.contact.name,
                    number: ct.contact.number,
                    email: ct.contact.email
                }
            }));
            // 4. Combinar registros existentes com contatos pendentes
            const allShipping = [...existingShipping, ...pendingContacts];
            // 5. Aplicar filtros se necessário
            let filteredShipping = allShipping;
            if (status) {
                switch (status) {
                    case 'delivered':
                        filteredShipping = allShipping.filter(s => s.deliveredAt !== null);
                        break;
                    case 'pending':
                        filteredShipping = allShipping.filter(s => s.deliveredAt === null);
                        break;
                    case 'failed':
                        filteredShipping = allShipping.filter(s => s.deliveredAt === null);
                        break;
                }
            }
            if (searchParam) {
                filteredShipping = filteredShipping.filter(s => s.number.includes(searchParam) ||
                    s.message.toLowerCase().includes(searchParam.toLowerCase()) ||
                    (s.contact && s.contact.name && s.contact.name.toLowerCase().includes(searchParam.toLowerCase())));
            }
            // 6. Aplicar paginação
            count = filteredShipping.length;
            const startIndex = offset;
            const endIndex = offset + pageSize;
            shipping = filteredShipping.slice(startIndex, endIndex);
            console.log(`[SHIPPING-SERVICE] Total filtrado: ${count}, Página ${page}: ${shipping.length} registros`);
        }
        else {
            // Para campanhas por lista, incluir contatos pendentes também
            console.log(`[SHIPPING-SERVICE] Campanha ${campaignId} é por lista de contatos (contactListId: ${campaign.contactListId})`);
            // 1. Buscar registros CampaignShipping existentes
            const { rows: existingShipping, count: existingCount } = await CampaignShipping_1.default.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: ContactListItem_1.default,
                        as: "contact",
                        attributes: ["id", "name", "number", "email"]
                    }
                ],
                order: [["createdAt", "DESC"]]
            });
            console.log(`[SHIPPING-SERVICE] Registros CampaignShipping existentes: ${existingCount}`);
            // 2. Buscar todos os contatos da lista
            const allContacts = await ContactListItem_1.default.findAll({
                where: { contactListId: campaign.contactListId },
                attributes: ["id", "name", "number", "email"]
            });
            console.log(`[SHIPPING-SERVICE] Total de contatos na lista: ${allContacts.length}`);
            // 3. Criar registros virtuais para contatos pendentes
            const existingNumbers = new Set(existingShipping.map(s => s.number));
            const pendingContacts = allContacts
                .filter(contact => !existingNumbers.has(contact.number))
                .map(contact => ({
                id: null,
                campaignId: campaignId,
                contactId: contact.id,
                number: contact.number,
                message: null,
                deliveredAt: null,
                createdAt: null,
                contact: contact
            }));
            // 4. Combinar registros existentes com pendentes
            const allShipping = [...existingShipping, ...pendingContacts];
            // 5. Aplicar filtros de busca se necessário
            let filteredShipping = allShipping;
            if (searchParam) {
                filteredShipping = allShipping.filter(item => item.number?.includes(searchParam) ||
                    item.message?.toLowerCase().includes(searchParam.toLowerCase()) ||
                    item.contact?.name?.toLowerCase().includes(searchParam.toLowerCase()));
            }
            count = filteredShipping.length;
            // 6. Aplicar paginação
            const startIndex = offset;
            const endIndex = startIndex + pageSize;
            shipping = filteredShipping.slice(startIndex, endIndex);
            console.log(`[SHIPPING-SERVICE] Total filtrado: ${count}, Página ${page}: ${shipping.length} registros`);
        }
        const totalPages = Math.ceil(count / pageSize);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        return {
            shipping,
            count,
            totalPages,
            currentPage: page,
            hasNextPage,
            hasPrevPage
        };
    }
    catch (error) {
        console.error("Erro ao buscar dados de shipping:", error);
        throw new AppError_1.default("Erro interno do servidor", 500);
    }
};
exports.default = ShippingService;
