"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FlowBuilder_1 = require("../../models/FlowBuilder");
const wbotMessageListener_1 = require("../WbotServices/wbotMessageListener");
const ActionsWebhookService_1 = require("./ActionsWebhookService");
const flowBuilderQueue = async (ticket, msg, wbot, whatsapp, companyId, contact, isFirstMsg) => {
    const body = (0, wbotMessageListener_1.getBodyMessage)(msg);
    // Verificar se existe fluxo interrompido válido
    if (!ticket.flowStopped || !ticket.lastFlowId) {
        console.log("Ticket sem fluxo interrompido ou ID de último fluxo");
        return;
    }
    try {
        const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
            where: {
                id: ticket.flowStopped,
                company_id: companyId // Usar company_id conforme o modelo
            }
        });
        if (!flow) {
            console.log(`Fluxo ${ticket.flowStopped} não encontrado para a empresa ${companyId}`);
            return;
        }
        const mountDataContact = {
            number: contact.number,
            name: contact.name,
            email: contact.email
        };
        const nodes = flow.flow["nodes"];
        const connections = flow.flow["connections"];
        await (0, ActionsWebhookService_1.ActionsWebhookService)(whatsapp.id, parseInt(ticket.flowStopped), ticket.companyId, nodes, connections, ticket.lastFlowId, null, "", "", body, ticket.id, mountDataContact);
        console.log(`Fluxo interrompido ${ticket.flowStopped} executado com sucesso`);
    }
    catch (error) {
        console.error("Erro ao executar fluxo interrompido:", error);
    }
};
exports.default = flowBuilderQueue;
