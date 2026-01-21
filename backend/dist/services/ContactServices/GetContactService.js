"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const CreateContactService_1 = __importDefault(require("./CreateContactService"));
const logger_1 = __importDefault(require("../../utils/logger"));
const debug_1 = require("../../config/debug");
const GetContactService = async ({ name, number, companyId }) => {
    // if (ENABLE_LID_DEBUG) {
    //   logger.info(
    //     `[RDS-LID] Buscando contato: number=${number}, companyId=${companyId}`
    //   );
    // }
    const numberExists = await Contact_1.default.findOne({
        where: { number, companyId }
    });
    if (!numberExists) {
        // logger.info(
        //   `[RDS-LID] Contato não encontrado, criando novo: number=${number}`
        // );
        const contact = await (0, CreateContactService_1.default)({
            name,
            number,
            companyId
        });
        if (contact == null)
            throw new AppError_1.default("CONTACT_NOT_FIND");
        else {
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] Novo contato criado: id=${contact.id}, number=${contact.number}, jid=${contact.remoteJid}, lid=${contact.lid}`);
            }
            return contact;
        }
    }
    // if (ENABLE_LID_DEBUG) {
    //   logger.info(
    //     `[RDS-LID] Contato encontrado: id=${numberExists.id}, number=${numberExists.number}, jid=${numberExists.remoteJid}, lid=${numberExists.lid}`
    //   );
    // }
    return numberExists;
};
exports.default = GetContactService;
