"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CompanyKanbanConfig_1 = __importDefault(require("../../models/CompanyKanbanConfig"));
const SetKanbanLaneOrderService = async ({ companyId, laneOrder, }) => {
    const [config, created] = await CompanyKanbanConfig_1.default.findOrCreate({
        where: {
            companyId,
        },
        defaults: {
            companyId,
            laneOrder: JSON.stringify(laneOrder),
        },
    });
    if (!created) {
        await config.update({ laneOrder: JSON.stringify(laneOrder) });
    }
    return config;
};
exports.default = SetKanbanLaneOrderService;
