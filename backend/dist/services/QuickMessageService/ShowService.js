"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const QuickMessage_1 = __importDefault(require("../../models/QuickMessage"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const QuickMessageComponent_1 = __importDefault(require("../../models/QuickMessageComponent"));
const ShowService = async (id, companyId) => {
    const record = await QuickMessage_1.default.findOne({ where: { id, companyId },
        include: [
            {
                model: QuickMessageComponent_1.default,
                as: 'components',
                attributes: ['id', 'type', 'text', 'buttons', 'format', 'example'],
                order: [['id', 'ASC']]
            }
        ]
    });
    if (!record) {
        throw new AppError_1.default("ERR_NO_TICKETNOTE_FOUND", 404);
    }
    return record;
};
exports.default = ShowService;
