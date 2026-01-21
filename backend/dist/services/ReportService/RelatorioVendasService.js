"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const User_1 = __importDefault(require("../../models/User"));
const RelatorioVendasService = async ({ dateFrom, dateTo, userId, companyId }) => {
    const whereClause = {
        companyId,
        status: "closed",
        createdAt: {
            [sequelize_1.Op.between]: [new Date(dateFrom), new Date(dateTo)]
        }
    };
    if (userId) {
        whereClause.userId = userId;
    }
    // Buscar todos os tickets finalizados no período
    const tickets = await Ticket_1.default.findAll({
        where: whereClause,
        include: [
            {
                model: User_1.default,
                as: "user",
                attributes: ["id", "name"]
            }
        ],
        order: [["createdAt", "DESC"]]
    });
    // Estatísticas gerais
    const ticketsComVenda = tickets.filter(t => t.finalizadoComVenda);
    const ticketsSemVenda = tickets.filter(t => !t.finalizadoComVenda);
    const totalVendas = ticketsComVenda.length;
    const totalValorVendas = ticketsComVenda.reduce((sum, ticket) => {
        return sum + (ticket.valorVenda || 0);
    }, 0);
    const totalNaoVendas = ticketsSemVenda.length;
    // Motivos de não venda
    const motivosCount = {};
    ticketsSemVenda.forEach(ticket => {
        if (ticket.motivoNaoVenda) {
            motivosCount[ticket.motivoNaoVenda] =
                (motivosCount[ticket.motivoNaoVenda] || 0) + 1;
        }
    });
    const motivosNaoVenda = Object.entries(motivosCount).map(([motivo, quantidade]) => ({
        motivo,
        quantidade
    }));
    // Motivos de finalização
    const motivosFinalizacaoCount = {};
    tickets.forEach(ticket => {
        if (ticket.motivoFinalizacao) {
            motivosFinalizacaoCount[ticket.motivoFinalizacao] =
                (motivosFinalizacaoCount[ticket.motivoFinalizacao] || 0) + 1;
        }
    });
    const motivosFinalizacao = Object.entries(motivosFinalizacaoCount).map(([motivo, quantidade]) => ({
        motivo,
        quantidade
    }));
    // Estatísticas por atendente
    const atendentesMap = {};
    tickets.forEach(ticket => {
        if (ticket.user) {
            const atendenteId = ticket.user.id;
            if (!atendentesMap[atendenteId]) {
                atendentesMap[atendenteId] = {
                    id: atendenteId,
                    name: ticket.user.name,
                    totalVendas: 0,
                    totalValorVendas: 0,
                    totalNaoVendas: 0,
                    totalTickets: 0
                };
            }
            atendentesMap[atendenteId].totalTickets++;
            if (ticket.finalizadoComVenda) {
                atendentesMap[atendenteId].totalVendas++;
                atendentesMap[atendenteId].totalValorVendas += ticket.valorVenda || 0;
            }
            else {
                atendentesMap[atendenteId].totalNaoVendas++;
            }
        }
    });
    const atendentes = Object.values(atendentesMap).map(atendente => ({
        ...atendente,
        mediaTicket: atendente.totalTickets > 0 ? atendente.totalTickets : 0
    }));
    const mediaTicketPorAtendente = atendentes.length > 0
        ? atendentes.reduce((sum, atendente) => sum + atendente.mediaTicket, 0) /
            atendentes.length
        : 0;
    return {
        totalVendas,
        totalValorVendas,
        totalNaoVendas,
        motivosNaoVenda,
        motivosFinalizacao,
        mediaTicketPorAtendente,
        atendentes
    };
};
exports.default = RelatorioVendasService;
