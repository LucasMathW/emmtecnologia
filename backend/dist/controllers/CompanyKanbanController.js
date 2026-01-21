"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLaneOrder = exports.setLaneOrder = void 0;
const SetKanbanLaneOrderService_1 = __importDefault(require("../services/CompanyKanbanService/SetKanbanLaneOrderService"));
const GetKanbanLaneOrderService_1 = __importDefault(require("../services/CompanyKanbanService/GetKanbanLaneOrderService"));
const setLaneOrder = async (req, res) => {
    const { laneOrder } = req.body;
    const { companyId } = req.user;
    // Verificar se o usuário é admin
    if (req.user.profile !== 'admin') {
        return res.status(403).json({
            error: "Apenas administradores podem reordenar as lanes do Kanban",
        });
    }
    try {
        const config = await (0, SetKanbanLaneOrderService_1.default)({
            companyId,
            laneOrder,
        });
        return res.status(200).json({
            success: true,
            message: "Ordem das lanes atualizada com sucesso",
            laneOrder: JSON.parse(config.laneOrder),
        });
    }
    catch (error) {
        console.error("Error setting kanban lane order:", error);
        return res.status(500).json({
            error: "Erro interno do servidor",
        });
    }
};
exports.setLaneOrder = setLaneOrder;
const getLaneOrder = async (req, res) => {
    const { companyId } = req.user;
    try {
        const laneOrder = await (0, GetKanbanLaneOrderService_1.default)({
            companyId,
        });
        return res.status(200).json({
            laneOrder,
        });
    }
    catch (error) {
        console.error("Error getting kanban lane order:", error);
        return res.status(500).json({
            error: "Erro interno do servidor",
        });
    }
};
exports.getLaneOrder = getLaneOrder;
