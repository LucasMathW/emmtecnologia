"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const TicketFinalizationReason_1 = __importDefault(require("../../models/TicketFinalizationReason"));
const DeleteTicketFinalizationReasonService = async ({ id, companyId }) => {
    const reason = await TicketFinalizationReason_1.default.findOne({
        where: { id, companyId }
    });
    if (!reason) {
        throw new AppError_1.default("ERR_FINALIZATION_REASON_NOT_FOUND", 404);
    }
    await reason.destroy();
};
exports.default = DeleteTicketFinalizationReasonService;
