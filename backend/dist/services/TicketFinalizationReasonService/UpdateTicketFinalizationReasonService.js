"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const TicketFinalizationReason_1 = __importDefault(require("../../models/TicketFinalizationReason"));
const UpdateTicketFinalizationReasonService = async ({ id, name, description, companyId }) => {
    const schema = Yup.object().shape({
        name: Yup.string().min(2),
        description: Yup.string().optional(),
        companyId: Yup.number().required()
    });
    try {
        await schema.validate({ name, description, companyId });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const reason = await TicketFinalizationReason_1.default.findOne({
        where: { id, companyId }
    });
    if (!reason) {
        throw new AppError_1.default("ERR_FINALIZATION_REASON_NOT_FOUND", 404);
    }
    if (name && name !== reason.name) {
        const reasonExists = await TicketFinalizationReason_1.default.findOne({
            where: { name, companyId }
        });
        if (reasonExists) {
            throw new AppError_1.default("ERR_DUPLICATED_FINALIZATION_REASON");
        }
    }
    await reason.update({
        name: name || reason.name,
        description: description !== undefined ? description : reason.description
    });
    return reason;
};
exports.default = UpdateTicketFinalizationReasonService;
