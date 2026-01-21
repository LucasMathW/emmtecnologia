"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CampaignShipping_1 = __importDefault(require("../../models/CampaignShipping"));
const Campaign_1 = __importDefault(require("../../models/Campaign"));
const ContactTag_1 = __importDefault(require("../../models/ContactTag"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const ContactListItem_1 = __importDefault(require("../../models/ContactListItem"));
const sequelize_1 = require("sequelize");
const CampaignStatsService = async (campaignId) => {
    try {
        // Buscar informações da campanha para determinar se é por TAG ou lista
        const campaign = await Campaign_1.default.findByPk(campaignId, {
            attributes: ["id", "tagListId", "contactListId", "companyId"]
        });
        if (!campaign) {
            throw new Error("Campanha não encontrada");
        }
        let totalContacts = 0;
        let uniqueNumbers = 0;
        // Se é campanha por TAG, contar contatos da tag
        if (campaign.tagListId && !campaign.contactListId) {
            console.log(`[CAMPAIGN-STATS] Campanha ${campaignId} é por TAG (tagListId: ${campaign.tagListId})`);
            // Contar contatos únicos da tag
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
                        attributes: ["id", "number"]
                    }
                ],
                group: ["ContactTag.contactId", "contact.id", "contact.number"]
            });
            totalContacts = contactTags.length;
            uniqueNumbers = totalContacts;
            console.log(`[CAMPAIGN-STATS] Total de contatos na tag: ${totalContacts}`);
        }
        else if (campaign.contactListId) {
            // Para campanhas por lista, contar contatos da lista
            console.log(`[CAMPAIGN-STATS] Campanha ${campaignId} é por lista de contatos (contactListId: ${campaign.contactListId})`);
            totalContacts = await ContactListItem_1.default.count({
                where: { contactListId: campaign.contactListId }
            });
            // Para campanhas por lista, uniqueNumbers deve ser o total de contatos válidos da lista
            uniqueNumbers = totalContacts;
            console.log(`[CAMPAIGN-STATS] Total de contatos na lista: ${totalContacts}, Destinatários únicos (total da lista): ${uniqueNumbers}`);
        }
        else {
            // Fallback para campanhas sem lista/tag específica
            console.log(`[CAMPAIGN-STATS] Campanha ${campaignId} sem lista/tag específica`);
            const uniqueNumbersResult = await CampaignShipping_1.default.findAll({
                where: { campaignId },
                attributes: ['number'],
                group: ['number'],
                raw: true
            });
            uniqueNumbers = uniqueNumbersResult.length;
            totalContacts = uniqueNumbers;
        }
        // Buscar estatísticas de envio (sempre baseadas em CampaignShipping)
        const deliveredMessages = await CampaignShipping_1.default.count({
            where: {
                campaignId,
                deliveredAt: { [sequelize_1.Op.ne]: null }
            }
        });
        const pendingMessages = await CampaignShipping_1.default.count({
            where: {
                campaignId,
                deliveredAt: null
            }
        });
        // Calcular mensagens pendentes baseado na diferença entre total da lista/tag e mensagens já processadas
        let totalMessages = deliveredMessages + pendingMessages;
        let actualPendingMessages = pendingMessages;
        if (campaign.tagListId && !campaign.contactListId) {
            // Para campanhas por TAG, o total deve ser o número de contatos da tag
            // Calcular pendentes reais incluindo contatos que ainda não foram processados
            const totalPendingFromTag = Math.max(0, totalContacts - totalMessages);
            actualPendingMessages = totalPendingFromTag;
            totalMessages = totalContacts;
            console.log(`[CAMPAIGN-STATS] Campanha por TAG - Total contatos: ${totalContacts}, Enviados: ${deliveredMessages}, Pendentes na fila: ${pendingMessages}, Pendentes da tag: ${totalPendingFromTag}`);
        }
        else if (campaign.contactListId) {
            // Para campanhas por lista, o total deve ser o número de contatos da lista
            // Calcular pendentes reais incluindo contatos que ainda não foram processados
            const totalPendingFromList = Math.max(0, totalContacts - totalMessages);
            actualPendingMessages = totalPendingFromList;
            totalMessages = totalContacts;
            console.log(`[CAMPAIGN-STATS] Campanha por LISTA - Total contatos: ${totalContacts}, Enviados: ${deliveredMessages}, Pendentes na fila: ${pendingMessages}, Pendentes da lista: ${totalPendingFromList}`);
        }
        // Buscar confirmações
        const confirmationRequested = await CampaignShipping_1.default.count({
            where: {
                campaignId,
                confirmationRequestedAt: { [sequelize_1.Op.ne]: null }
            }
        });
        const confirmed = await CampaignShipping_1.default.count({
            where: {
                campaignId,
                confirmedAt: { [sequelize_1.Op.ne]: null }
            }
        });
        // Calcular taxa de entrega
        const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;
        // Falhas são apenas mensagens que realmente falharam no envio, não pendentes
        const failedMessages = 0; // Por enquanto, não temos sistema de falhas implementado
        console.log(`[CAMPAIGN-STATS] Estatísticas finais - Total: ${totalMessages}, Entregues: ${deliveredMessages}, Pendentes: ${actualPendingMessages}, Falhas: ${failedMessages}, Taxa: ${deliveryRate.toFixed(2)}%`);
        return {
            totalMessages,
            deliveredMessages,
            pendingMessages: actualPendingMessages,
            failedMessages,
            uniqueNumbers,
            deliveryRate: Math.round(deliveryRate * 100) / 100,
            confirmationRequested,
            confirmed
        };
    }
    catch (error) {
        console.error("Erro ao calcular estatísticas da campanha:", error);
        throw new Error("Erro interno do servidor");
    }
};
exports.default = CampaignStatsService;
