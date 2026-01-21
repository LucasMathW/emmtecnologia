"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_1 = require("../../libs/socket");
const Contact_1 = __importDefault(require("../../models/Contact"));
const CreateOrUpdateContactServiceForImport = async ({ name, number: rawNumber, profilePicUrl, isGroup, email = "", commandBot = "", extraInfo = [], companyId, whatsappId, birthDate }) => {
    // Normalizar número de telefone para evitar duplicações com formatos diferentes
    const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");
    const io = (0, socket_1.getIO)();
    let contact;
    try {
        // Buscar contato existente
        contact = await Contact_1.default.findOne({ where: { number, companyId } });
        if (contact) {
            // Atualizar contato existente
            if (contact.companyId === null) {
                await contact.update({
                    name,
                    profilePicUrl,
                    companyId,
                    email: email || contact.email,
                    whatsappId: whatsappId || contact.whatsappId,
                    birthDate
                });
            }
            else {
                await contact.update({
                    name,
                    profilePicUrl,
                    email: email || contact.email,
                    whatsappId: whatsappId || contact.whatsappId,
                    birthDate
                });
            }
            io.of(String(companyId))
                .emit(`company-${companyId}-contact`, {
                action: "update",
                contact
            });
        }
        else {
            // Criar novo contato
            contact = await Contact_1.default.create({
                name,
                companyId,
                number,
                profilePicUrl,
                email,
                commandBot,
                isGroup,
                extraInfo,
                whatsappId,
                birthDate
            });
            io.of(String(companyId))
                .emit(`company-${companyId}-contact`, {
                action: "create",
                contact
            });
        }
        return contact;
    }
    catch (error) {
        throw new Error(`Erro ao criar/atualizar contato: ${error.message}`);
    }
};
exports.default = CreateOrUpdateContactServiceForImport;
