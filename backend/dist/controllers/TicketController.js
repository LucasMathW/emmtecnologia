"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerFlow = exports.transferTickets = exports.relatorioVendas = exports.closeAll = exports.remove = exports.update = exports.showFromUUID = exports.showLog = exports.show = exports.store = exports.kanban = exports.report = exports.index = void 0;
const socket_1 = require("../libs/socket");
const Ticket_1 = __importDefault(require("../models/Ticket"));
const FlowBuilder_1 = require("../models/FlowBuilder");
const Contact_1 = __importDefault(require("../models/Contact"));
const User_1 = __importDefault(require("../models/User"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const CreateTicketService_1 = __importDefault(require("../services/TicketServices/CreateTicketService"));
const DeleteTicketService_1 = __importDefault(require("../services/TicketServices/DeleteTicketService"));
const ListTicketsService_1 = __importDefault(require("../services/TicketServices/ListTicketsService"));
const ShowTicketFromUUIDService_1 = __importDefault(require("../services/TicketServices/ShowTicketFromUUIDService"));
const ShowTicketService_1 = __importDefault(require("../services/TicketServices/ShowTicketService"));
const UpdateTicketService_1 = __importDefault(require("../services/TicketServices/UpdateTicketService"));
const ListTicketsServiceKanban_1 = __importDefault(require("../services/TicketServices/ListTicketsServiceKanban"));
const TriggerFlowService_1 = __importDefault(require("../services/TicketServices/TriggerFlowService"));
const CreateLogTicketService_1 = __importDefault(require("../services/TicketServices/CreateLogTicketService"));
const ShowLogTicketService_1 = __importDefault(require("../services/TicketServices/ShowLogTicketService"));
const ListTicketsServiceReport_1 = __importDefault(require("../services/TicketServices/ListTicketsServiceReport"));
const RelatorioVendasService_1 = __importDefault(require("../services/ReportService/RelatorioVendasService"));
const SetTicketMessagesAsRead_1 = __importDefault(require("../helpers/SetTicketMessagesAsRead"));
const async_mutex_1 = require("async-mutex");
const index = async (req, res) => {
    const { pageNumber, status, date, dateStart, dateEnd, updatedAt, searchParam, showAll, queueIds: queueIdsStringified, tags: tagIdsStringified, users: userIdsStringified, withUnreadMessages, whatsapps: whatsappIdsStringified, statusFilter: statusStringfied, sortTickets, searchOnMessages } = req.query;
    const userId = Number(req.user.id);
    const { companyId } = req.user;
    let queueIds = [];
    let tagsIds = [];
    let usersIds = [];
    let whatsappIds = [];
    let statusFilters = [];
    if (queueIdsStringified) {
        queueIds = JSON.parse(queueIdsStringified);
    }
    if (tagIdsStringified) {
        tagsIds = JSON.parse(tagIdsStringified);
    }
    if (userIdsStringified) {
        usersIds = JSON.parse(userIdsStringified);
    }
    if (whatsappIdsStringified) {
        whatsappIds = JSON.parse(whatsappIdsStringified);
    }
    if (statusStringfied) {
        statusFilters = JSON.parse(statusStringfied);
    }
    const { tickets, count, hasMore } = await (0, ListTicketsService_1.default)({
        searchParam,
        tags: tagsIds,
        users: usersIds,
        pageNumber,
        status,
        date,
        dateStart,
        dateEnd,
        updatedAt,
        showAll,
        userId,
        queueIds,
        withUnreadMessages,
        whatsappIds,
        statusFilters,
        companyId,
        sortTickets,
        searchOnMessages
    });
    return res.status(200).json({ tickets, count, hasMore });
};
exports.index = index;
const report = async (req, res) => {
    const { searchParam, contactId, whatsappId: whatsappIdsStringified, dateFrom, dateTo, status: statusStringified, queueIds: queueIdsStringified, tags: tagIdsStringified, users: userIdsStringified, page: pageNumber, pageSize, onlyRated } = req.query;
    const userId = req.user.id;
    const { companyId } = req.user;
    let queueIds = [];
    let whatsappIds = [];
    let tagsIds = [];
    let usersIds = [];
    let statusIds = [];
    if (statusStringified) {
        statusIds = JSON.parse(statusStringified);
    }
    if (whatsappIdsStringified) {
        whatsappIds = JSON.parse(whatsappIdsStringified);
    }
    if (queueIdsStringified) {
        queueIds = JSON.parse(queueIdsStringified);
    }
    if (tagIdsStringified) {
        tagsIds = JSON.parse(tagIdsStringified);
    }
    if (userIdsStringified) {
        usersIds = JSON.parse(userIdsStringified);
    }
    const { tickets, totalTickets } = await (0, ListTicketsServiceReport_1.default)(companyId, {
        searchParam,
        queueIds,
        tags: tagsIds,
        users: usersIds,
        status: statusIds,
        dateFrom,
        dateTo,
        userId,
        contactId,
        whatsappId: whatsappIds,
        onlyRated: onlyRated
    }, +pageNumber, +pageSize);
    return res.status(200).json({ tickets, totalTickets });
};
exports.report = report;
const kanban = async (req, res) => {
    const { pageNumber, status, date, dateStart, dateEnd, updatedAt, searchParam, showAll, queueIds: queueIdsStringified, tags: tagIdsStringified, users: userIdsStringified, withUnreadMessages } = req.query;
    const userId = req.user.id;
    const { companyId } = req.user;
    let queueIds = [];
    let tagsIds = [];
    let usersIds = [];
    if (queueIdsStringified) {
        queueIds = JSON.parse(queueIdsStringified);
    }
    if (tagIdsStringified) {
        tagsIds = JSON.parse(tagIdsStringified);
    }
    if (userIdsStringified) {
        usersIds = JSON.parse(userIdsStringified);
    }
    const { tickets, count, hasMore } = await (0, ListTicketsServiceKanban_1.default)({
        searchParam,
        tags: tagsIds,
        users: usersIds,
        pageNumber,
        status,
        date,
        dateStart,
        dateEnd,
        updatedAt,
        showAll,
        userId,
        queueIds,
        withUnreadMessages,
        companyId
    });
    return res.status(200).json({ tickets, count, hasMore });
};
exports.kanban = kanban;
const store = async (req, res) => {
    const { contactId, status, userId, queueId, whatsappId } = req.body;
    const { companyId } = req.user;
    try {
        const ticket = await (0, CreateTicketService_1.default)({
            contactId,
            status,
            userId,
            companyId,
            queueId,
            whatsappId
        });
        const io = (0, socket_1.getIO)();
        io.of(String(companyId))
            // .to(ticket.status)
            .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket
        });
        return res.status(200).json(ticket);
    }
    catch (err) {
        // Se for erro 409 (ticket já existe)
        if (err.statusCode === 409) {
            const existingTicket = JSON.parse(err.message);
            // Verificar se o usuário que está tentando criar é o dono do ticket existente
            if (existingTicket.userId === userId) {
                // É o mesmo usuário, retornar o ticket existente
                return res.status(200).json(existingTicket);
            }
            else {
                // É outro usuário, retornar erro 403 (Forbidden)
                return res.status(403).json({
                    error: "Ticket já existe",
                    message: `Este contato já está sendo atendido por outro usuário: ${existingTicket.user?.name || 'Desconhecido'}`,
                    ticket: existingTicket
                });
            }
        }
        // Para outros erros, lançar novamente
        throw err;
    }
};
exports.store = store;
const show = async (req, res) => {
    const { ticketId } = req.params;
    const { id: userId, companyId } = req.user;
    const contact = await (0, ShowTicketService_1.default)(ticketId, companyId);
    await (0, CreateLogTicketService_1.default)({
        userId,
        ticketId,
        type: "access"
    });
    return res.status(200).json(contact);
};
exports.show = show;
const showLog = async (req, res) => {
    const { ticketId } = req.params;
    const { id: userId, companyId } = req.user;
    const log = await (0, ShowLogTicketService_1.default)({ ticketId, companyId });
    return res.status(200).json(log);
};
exports.showLog = showLog;
const showFromUUID = async (req, res) => {
    const { uuid } = req.params;
    const { id: userId, companyId } = req.user;
    const ticket = await (0, ShowTicketFromUUIDService_1.default)(uuid, companyId);
    if (["whatsapp", "whatsapp_oficial"].includes(ticket.channel) &&
        ticket.whatsappId &&
        ticket.unreadMessages > 0) {
        (0, SetTicketMessagesAsRead_1.default)(ticket);
    }
    await (0, CreateLogTicketService_1.default)({
        userId,
        ticketId: ticket.id,
        type: "access"
    });
    return res.status(200).json(ticket);
};
exports.showFromUUID = showFromUUID;
const update = async (req, res) => {
    const { ticketId } = req.params;
    const ticketData = req.body;
    const { companyId } = req.user;
    const mutex = new async_mutex_1.Mutex();
    const { ticket } = await mutex.runExclusive(async () => {
        const result = await (0, UpdateTicketService_1.default)({
            ticketData,
            ticketId,
            companyId
        });
        return result;
    });
    return res.status(200).json(ticket);
};
exports.update = update;
const remove = async (req, res) => {
    const { ticketId } = req.params;
    const { id: userId, companyId } = req.user;
    // await ShowTicketService(ticketId, companyId);
    const ticket = await (0, DeleteTicketService_1.default)(ticketId, userId, companyId);
    const io = (0, socket_1.getIO)();
    io.of(String(companyId))
        // .to(ticket.status)
        // .to(ticketId)
        // .to("notification")
        .emit(`company-${companyId}-ticket`, {
        action: "delete",
        ticketId: +ticketId
    });
    return res.status(200).json({ message: "ticket deleted" });
};
exports.remove = remove;
const closeAll = async (req, res) => {
    const { companyId } = req.user;
    const { status } = req.body;
    const io = (0, socket_1.getIO)();
    const { rows: tickets } = await Ticket_1.default.findAndCountAll({
        where: { companyId: companyId, status: status },
        order: [["updatedAt", "DESC"]]
    });
    tickets.forEach(async (ticket) => {
        const ticketData = {
            status: "closed",
            userId: ticket.userId || null,
            queueId: ticket.queueId || null,
            unreadMessages: 0,
            amountUsedBotQueues: 0,
            sendFarewellMessage: false
        };
        await (0, UpdateTicketService_1.default)({ ticketData, ticketId: ticket.id, companyId });
    });
    return res.status(200).json();
};
exports.closeAll = closeAll;
const relatorioVendas = async (req, res) => {
    const { dateFrom, dateTo, userId } = req.query;
    const { companyId } = req.user;
    if (!dateFrom || !dateTo) {
        return res.status(400).json({
            error: "Data inicial e final são obrigatórias"
        });
    }
    try {
        const relatorio = await (0, RelatorioVendasService_1.default)({
            dateFrom: dateFrom,
            dateTo: dateTo,
            userId: userId ? Number(userId) : undefined,
            companyId
        });
        return res.status(200).json(relatorio);
    }
    catch (error) {
        console.error("Erro ao gerar relatório de vendas:", error);
        return res.status(500).json({
            error: "Erro interno do servidor"
        });
    }
};
exports.relatorioVendas = relatorioVendas;
const transferTickets = async (req, res) => {
    const { sourceConnectionId, targetConnectionId } = req.body;
    const { companyId } = req.user;
    try {
        // Contar tickets para transferir
        const ticketCount = await Ticket_1.default.count({
            where: {
                whatsappId: sourceConnectionId,
                companyId,
                status: ["open", "pending"]
            }
        });
        if (ticketCount === 0) {
            return res.status(200).json({
                requiresProgress: false,
                transferred: 0,
                message: "Nenhum ticket encontrado para transferir"
            });
        }
        const PROGRESS_THRESHOLD = 50;
        const io = (0, socket_1.getIO)();
        if (ticketCount <= PROGRESS_THRESHOLD) {
            // Transferência imediata
            const tickets = await Ticket_1.default.findAll({
                where: {
                    whatsappId: sourceConnectionId,
                    companyId,
                    status: ["open", "pending"]
                }
            });
            let transferred = 0;
            for (const ticket of tickets) {
                try {
                    await ticket.update({ whatsappId: targetConnectionId });
                    transferred++;
                }
                catch (error) {
                    console.error(`Error transferring ticket ${ticket.id}:`, error);
                }
            }
            return res.status(200).json({
                requiresProgress: false,
                transferred,
                message: "Tickets transferidos com sucesso"
            });
        }
        else {
            // Transferência em background
            const jobId = `transfer-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2)}`;
            // Processar em background
            setTimeout(async () => {
                const BATCH_SIZE = 50;
                let processed = 0;
                try {
                    while (processed < ticketCount) {
                        const tickets = await Ticket_1.default.findAll({
                            where: {
                                whatsappId: sourceConnectionId,
                                companyId,
                                status: ["open", "pending"]
                            },
                            limit: BATCH_SIZE,
                            offset: processed
                        });
                        if (tickets.length === 0)
                            break;
                        for (const ticket of tickets) {
                            try {
                                await ticket.update({ whatsappId: targetConnectionId });
                                processed++;
                            }
                            catch (error) {
                                console.error(`Error transferring ticket ${ticket.id}:`, error);
                            }
                        }
                        // Enviar progresso via WebSocket
                        io.to(`company-${companyId}`).emit(`transferTickets-${companyId}`, {
                            action: "progress",
                            current: processed,
                            total: ticketCount,
                            jobId
                        });
                        // Pequena pausa para não sobrecarregar o banco
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    // Enviar conclusão
                    io.to(`company-${companyId}`).emit(`transferTickets-${companyId}`, {
                        action: "completed",
                        transferred: processed,
                        jobId
                    });
                }
                catch (error) {
                    console.error(`Error in transfer job ${jobId}:`, error);
                    // Enviar erro via WebSocket
                    io.to(`company-${companyId}`).emit(`transferTickets-${companyId}`, {
                        action: "error",
                        message: "Erro na transferência",
                        jobId
                    });
                }
            }, 0);
            return res.status(200).json({
                requiresProgress: true,
                totalTickets: ticketCount,
                jobId,
                message: "Transferência iniciada em background"
            });
        }
    }
    catch (error) {
        console.error("Error in transferTickets:", error);
        return res.status(500).json({
            message: "Erro interno do servidor"
        });
    }
};
exports.transferTickets = transferTickets;
const triggerFlow = async (req, res) => {
    const { ticketId } = req.params;
    const { flowId } = req.body;
    const { companyId } = req.user;
    try {
        // Verificar se o ticket existe e está com status "open"
        const ticket = await Ticket_1.default.findOne({
            where: {
                id: ticketId,
                companyId,
                status: "open"
            },
            include: [
                { model: Contact_1.default, as: "contact" },
                { model: User_1.default, as: "user" },
                { model: Whatsapp_1.default, as: "whatsapp" }
            ]
        });
        if (!ticket) {
            return res.status(404).json({
                error: "Ticket não encontrado ou não está em atendimento"
            });
        }
        // Verificar se o usuário tem permissão para disparar fluxo no ticket
        if (ticket.userId !== parseInt(req.user.id)) {
            return res.status(403).json({
                error: "Você não tem permissão para disparar fluxo neste ticket"
            });
        }
        // Verificar se o fluxo existe
        const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
            where: {
                id: flowId,
                company_id: companyId
            }
        });
        if (!flow) {
            return res.status(404).json({
                error: "Fluxo não encontrado"
            });
        }
        // Chamar o serviço para disparar o fluxo
        const result = await (0, TriggerFlowService_1.default)({
            ticketId: ticket.id,
            flowId: flow.id,
            companyId,
            userId: parseInt(req.user.id)
        });
        return res.status(200).json({
            success: true,
            message: "Fluxo disparado com sucesso",
            data: result
        });
    }
    catch (error) {
        console.error("Erro ao disparar fluxo no ticket:", error);
        return res.status(500).json({
            error: "Erro interno do servidor"
        });
    }
};
exports.triggerFlow = triggerFlow;
