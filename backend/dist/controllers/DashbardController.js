"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashTicketsQueues = exports.reportsDay = exports.reportsUsers = exports.index = void 0;
const DashbardDataService_1 = __importDefault(require("../services/ReportService/DashbardDataService"));
const TicketsAttendance_1 = require("../services/ReportService/TicketsAttendance");
const TicketsDayService_1 = require("../services/ReportService/TicketsDayService");
const TicketsQueuesService_1 = __importDefault(require("../services/TicketServices/TicketsQueuesService"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const index = async (req, res) => {
    try {
        const params = req.query;
        const { companyId } = req.user;
        console.log('Dashboard params recebidos:', params);
        console.log('Company ID:', companyId);
        // Validar se a empresa existe
        if (!companyId) {
            throw new AppError_1.default('ID da empresa não encontrado', 400);
        }
        // Se não há parâmetros de data, usar os últimos 30 dias como padrão
        let processedParams = { ...params };
        if (!params.days && !params.date_from && !params.date_to) {
            processedParams = {
                days: 30 // Padrão de 30 dias
            };
        }
        // Validar parâmetros de data
        if (params.date_from && params.date_to) {
            const dateFrom = new Date(params.date_from);
            const dateTo = new Date(params.date_to);
            if (dateFrom > dateTo) {
                throw new AppError_1.default('Data inicial não pode ser maior que data final', 400);
            }
        }
        console.log('Parâmetros processados:', processedParams);
        const dashboardData = await (0, DashbardDataService_1.default)(companyId, processedParams);
        console.log('Dashboard data retornado:', dashboardData);
        // Garantir que os dados tenham a estrutura esperada
        const responseData = {
            counters: dashboardData.counters || {},
            attendants: Array.isArray(dashboardData.attendants) ? dashboardData.attendants : []
        };
        return res.status(200).json(responseData);
    }
    catch (error) {
        console.error('Erro no dashboard controller:', error);
        if (error instanceof AppError_1.default) {
            return res.status(error.statusCode).json({
                status: 'error',
                message: error.message
            });
        }
        return res.status(500).json({
            status: 'error',
            message: 'Erro interno do servidor ao buscar dados do dashboard'
        });
    }
};
exports.index = index;
const reportsUsers = async (req, res) => {
    try {
        const { initialDate, finalDate, companyId } = req.query;
        if (!initialDate || !finalDate) {
            throw new AppError_1.default('Datas inicial e final são obrigatórias', 400);
        }
        const { data } = await (0, TicketsAttendance_1.TicketsAttendance)({ initialDate, finalDate, companyId });
        return res.json({ data });
    }
    catch (error) {
        console.error('Erro no reportsUsers:', error);
        if (error instanceof AppError_1.default) {
            return res.status(error.statusCode).json({
                status: 'error',
                message: error.message
            });
        }
        return res.status(500).json({
            status: 'error',
            message: 'Erro interno do servidor ao buscar relatório de usuários'
        });
    }
};
exports.reportsUsers = reportsUsers;
const reportsDay = async (req, res) => {
    try {
        const { initialDate, finalDate, companyId } = req.query;
        if (!initialDate || !finalDate) {
            throw new AppError_1.default('Datas inicial e final são obrigatórias', 400);
        }
        const { count, data } = await (0, TicketsDayService_1.TicketsDayService)({ initialDate, finalDate, companyId });
        return res.json({ count, data });
    }
    catch (error) {
        console.error('Erro no reportsDay:', error);
        if (error instanceof AppError_1.default) {
            return res.status(error.statusCode).json({
                status: 'error',
                message: error.message
            });
        }
        return res.status(500).json({
            status: 'error',
            message: 'Erro interno do servidor ao buscar relatório diário'
        });
    }
};
exports.reportsDay = reportsDay;
const DashTicketsQueues = async (req, res) => {
    try {
        const { companyId, profile, id: userId } = req.user;
        const { dateStart, dateEnd, status, queuesIds, showAll } = req.query;
        const tickets = await (0, TicketsQueuesService_1.default)({
            showAll: profile === "admin" ? showAll : false,
            dateStart,
            dateEnd,
            status,
            queuesIds,
            userId,
            companyId,
            profile
        });
        return res.status(200).json(tickets);
    }
    catch (error) {
        console.error('Erro no DashTicketsQueues:', error);
        if (error instanceof AppError_1.default) {
            return res.status(error.statusCode).json({
                status: 'error',
                message: error.message
            });
        }
        return res.status(500).json({
            status: 'error',
            message: 'Erro interno do servidor ao buscar tickets das filas'
        });
    }
};
exports.DashTicketsQueues = DashTicketsQueues;
