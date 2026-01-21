"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const User_1 = __importDefault(require("../../models/User"));
const socket_1 = require("../../libs/socket");
const ListUserQueueImmediateService_1 = __importDefault(require("../UserQueueServices/ListUserQueueImmediateService"));
const UpdateTicketService_1 = __importDefault(require("./UpdateTicketService"));
const CreateLogTicketService_1 = __importDefault(require("./CreateLogTicketService"));
const TicketTimeoutService = async ({ ticketId, queueId, companyId, timeoutMinutes = 5 }) => {
    // Aguardar o tempo de timeout
    setTimeout(async () => {
        try {
            // Buscar o ticket
            const ticket = await Ticket_1.default.findByPk(ticketId, {
                include: [
                    { model: Queue_1.default, as: "queue" },
                    { model: User_1.default, as: "user" }
                ]
            });
            if (!ticket) {
                console.log(`[TICKET TIMEOUT] Ticket ${ticketId} não encontrado`);
                return;
            }
            // Verificar se o ticket ainda está pendente (não foi aceito)
            if (ticket.status !== "pending") {
                console.log(`[TICKET TIMEOUT] Ticket ${ticketId} já foi aceito, cancelando timeout`);
                return;
            }
            // Verificar se a fila ainda tem randomização imediata ativada
            const queue = await Queue_1.default.findByPk(queueId);
            if (!queue || !queue.randomizeImmediate || !queue.ativarRoteador) {
                console.log(`[TICKET TIMEOUT] Randomização imediata desativada para fila ${queueId}`);
                return;
            }
            console.log(`[TICKET TIMEOUT] Timeout atingido para ticket ${ticketId}, transferindo para próximo usuário`);
            // Buscar próximo usuário disponível
            const nextUserResult = await (0, ListUserQueueImmediateService_1.default)(queueId, ticketId);
            if (nextUserResult.isImmediate && nextUserResult.userId) {
                // Atualizar ticket para o próximo usuário
                const updatedTicket = await (0, UpdateTicketService_1.default)({
                    ticketData: {
                        userId: nextUserResult.userId,
                        status: "pending"
                    },
                    ticketId: ticket.id,
                    companyId
                });
                // Criar log da transferência
                await (0, CreateLogTicketService_1.default)({
                    ticketId: ticket.id,
                    type: "transfered",
                    queueId: queueId,
                    userId: nextUserResult.userId
                });
                // Notificar via socket
                const io = (0, socket_1.getIO)();
                io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
                    action: "update",
                    ticket: {
                        ticket: updatedTicket.ticket,
                        userId: nextUserResult.userId
                    }
                });
                console.log(`[TICKET TIMEOUT] Ticket ${ticketId} transferido para usuário ${nextUserResult.userId}`);
                // Agendar próximo timeout se necessário
                await TicketTimeoutService({
                    ticketId,
                    queueId,
                    companyId,
                    timeoutMinutes
                });
            }
            else if (nextUserResult.isImmediate && !nextUserResult.userId) {
                console.log(`[TICKET TIMEOUT] Nenhum usuário online disponível para ticket ${ticketId}, mantendo na fila`);
                // Não agendar próximo timeout se não há usuários disponíveis
            }
        }
        catch (error) {
            console.error(`[TICKET TIMEOUT] Erro ao processar timeout do ticket ${ticketId}:`, error);
        }
    }, timeoutMinutes * 60 * 1000); // Converter minutos para milissegundos
};
exports.default = TicketTimeoutService;
