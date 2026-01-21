"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FlowBuilder_1 = require("../../models/FlowBuilder");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const ActionsWebhookService_1 = require("../WebhookService/ActionsWebhookService");
const UpdateTicketService_1 = __importDefault(require("./UpdateTicketService"));
const CreateLogTicketService_1 = __importDefault(require("./CreateLogTicketService"));
const GenerateHashWebhookId_1 = require("../../utils/GenerateHashWebhookId");
const TriggerFlowService = async ({ ticketId, flowId, companyId, userId }) => {
    // Buscar o ticket com todas as informações necessárias
    const ticket = await Ticket_1.default.findOne({
        where: {
            id: ticketId,
            companyId,
            status: "open"
        },
        include: [
            { model: Contact_1.default, as: "contact" },
            { model: Whatsapp_1.default, as: "whatsapp" }
        ]
    });
    if (!ticket) {
        throw new Error("Ticket não encontrado ou não está em atendimento");
    }
    // Buscar o fluxo
    const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
        where: {
            id: flowId,
            company_id: companyId
        }
    });
    if (!flow) {
        throw new Error("Fluxo não encontrado");
    }
    // Extrair nós e conexões do fluxo
    const nodes = flow.flow["nodes"];
    const connections = flow.flow["connections"];
    if (!nodes || nodes.length === 0) {
        throw new Error("Fluxo não possui nós configurados");
    }
    // Gerar hash para controle do fluxo
    const hashWebhookId = (0, GenerateHashWebhookId_1.generateHashWebhookId)();
    // Dados do contato para o fluxo
    const mountDataContact = {
        number: ticket.contact.number,
        name: ticket.contact.name,
        email: ticket.contact.email || ""
    }; //
    // Atualizar o ticket para status "chatbot" e configurar campos do fluxo
    await (0, UpdateTicketService_1.default)({
        ticketData: {
            userId: ticket.userId,
            queueId: ticket.queueId,
            isBot: false,
            isTransfered: false
        },
        ticketId: ticket.id,
        companyId
    });
    // Criar log de mudança para chatbot
    await (0, CreateLogTicketService_1.default)({
        userId,
        ticketId: ticket.id,
        type: "open"
    });
    // Disparar o fluxo através do ActionsWebhookService
    await (0, ActionsWebhookService_1.ActionsWebhookService)(ticket.whatsapp.id, flowId, companyId, nodes, connections, nodes[0].id, // Começar pelo primeiro nó
    null, "", hashWebhookId, null, ticket.id, mountDataContact, false // inputResponded false para início do fluxo
    );
    // Buscar o ticket atualizado
    const updatedTicket = await Ticket_1.default.findByPk(ticket.id, {
        include: [
            { model: Contact_1.default, as: "contact" },
            { model: Whatsapp_1.default, as: "whatsapp" }
        ]
    });
    return {
        ticket: updatedTicket,
        flow,
        message: `Fluxo "${flow.name}" disparado com sucesso no ticket ${ticket.id}`
    };
};
exports.default = TriggerFlowService;
