"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.index = exports.store = void 0;
const socket_1 = require("../libs/socket");
const CreateTicketFinalizationReasonService_1 = __importDefault(require("../services/TicketFinalizationReasonService/CreateTicketFinalizationReasonService"));
const ListTicketFinalizationReasonsService_1 = __importDefault(require("../services/TicketFinalizationReasonService/ListTicketFinalizationReasonsService"));
const UpdateTicketFinalizationReasonService_1 = __importDefault(require("../services/TicketFinalizationReasonService/UpdateTicketFinalizationReasonService"));
const DeleteTicketFinalizationReasonService_1 = __importDefault(require("../services/TicketFinalizationReasonService/DeleteTicketFinalizationReasonService"));
const store = async (req, res) => {
    const { name, description } = req.body;
    const { companyId } = req.user;
    const reason = await (0, CreateTicketFinalizationReasonService_1.default)({
        name,
        description,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.emit(`ticketFinalizationReason:${companyId}`, {
        action: "create",
        reason
    });
    return res.status(200).json(reason);
};
exports.store = store;
const index = async (req, res) => {
    const { searchParam } = req.query;
    const { companyId } = req.user;
    const reasons = await (0, ListTicketFinalizationReasonsService_1.default)({
        companyId,
        searchParam
    });
    return res.status(200).json(reasons);
};
exports.index = index;
const update = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const { companyId } = req.user;
    const reason = await (0, UpdateTicketFinalizationReasonService_1.default)({
        id: parseInt(id),
        name,
        description,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.emit(`ticketFinalizationReason:${companyId}`, {
        action: "update",
        reason
    });
    return res.status(200).json(reason);
};
exports.update = update;
const remove = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    await (0, DeleteTicketFinalizationReasonService_1.default)({
        id: parseInt(id),
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.emit(`ticketFinalizationReason:${companyId}`, {
        action: "delete",
        reasonId: id
    });
    return res
        .status(200)
        .json({ message: "Motivo de finalização excluído com sucesso" });
};
exports.remove = remove;
