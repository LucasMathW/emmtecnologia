"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CompanyKanbanConfig_1 = __importDefault(require("../../models/CompanyKanbanConfig"));
const GetKanbanLaneOrderService = async ({ companyId, }) => {
    const config = await CompanyKanbanConfig_1.default.findOne({
        where: {
            companyId,
        },
    });
    if (!config || !config.laneOrder) {
        return null;
    }
    try {
        return JSON.parse(config.laneOrder);
    }
    catch (error) {
        console.error("Error parsing lane order:", error);
        return null;
    }
};
exports.default = GetKanbanLaneOrderService;
