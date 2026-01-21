"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportContactsService = void 0;
const lodash_1 = require("lodash");
const xlsx_1 = __importDefault(require("xlsx"));
const lodash_2 = require("lodash");
const logger_1 = __importDefault(require("../../utils/logger"));
const Contact_1 = __importDefault(require("../../models/Contact"));
async function ImportContactsService(companyId, file) {
    const workbook = xlsx_1.default.readFile(file?.path);
    const worksheet = (0, lodash_1.head)(Object.values(workbook.Sheets));
    const rows = xlsx_1.default.utils.sheet_to_json(worksheet, { header: 0 });
    const contacts = rows.map(row => {
        let name = "";
        let number = "";
        let email = "";
        let birthDate = null;
        if ((0, lodash_2.has)(row, "nome") || (0, lodash_2.has)(row, "Nome")) {
            name = row["nome"] || row["Nome"];
        }
        if ((0, lodash_2.has)(row, "numero") ||
            (0, lodash_2.has)(row, "número") ||
            (0, lodash_2.has)(row, "Numero") ||
            (0, lodash_2.has)(row, "Número")) {
            number = row["numero"] || row["número"] || row["Numero"] || row["Número"];
            number = `${number}`.replace(/\D/g, "");
        }
        if ((0, lodash_2.has)(row, "email") ||
            (0, lodash_2.has)(row, "e-mail") ||
            (0, lodash_2.has)(row, "Email") ||
            (0, lodash_2.has)(row, "E-mail")) {
            email = row["email"] || row["e-mail"] || row["Email"] || row["E-mail"];
        }
        // Processar data de nascimento - Suporta múltiplos formatos de cabeçalho
        if ((0, lodash_2.has)(row, "birthdate") ||
            (0, lodash_2.has)(row, "birthDate") ||
            (0, lodash_2.has)(row, "data_nascimento") ||
            (0, lodash_2.has)(row, "data_nasc") ||
            (0, lodash_2.has)(row, "nascimento") ||
            (0, lodash_2.has)(row, "Dt Nasc") ||
            (0, lodash_2.has)(row, "Data de Nascimento") ||
            (0, lodash_2.has)(row, "Data Nascimento")) {
            const birthDateStr = row["birthdate"] || row["birthDate"] ||
                row["data_nascimento"] || row["data_nasc"] ||
                row["nascimento"] || row["Dt Nasc"] ||
                row["Data de Nascimento"] || row["Data Nascimento"];
            if (birthDateStr) {
                try {
                    const parsedDate = new Date(birthDateStr);
                    // Validar que é data válida e não futura
                    if (!isNaN(parsedDate.getTime()) && parsedDate <= new Date()) {
                        birthDate = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
                    }
                    else {
                        logger_1.default.warn(`Data de nascimento inválida ou futura: ${birthDateStr}`);
                    }
                }
                catch (error) {
                    logger_1.default.warn(`Erro ao processar data de nascimento: ${birthDateStr}`, error);
                }
            }
        }
        return { name, number, email, birthDate, companyId };
    });
    const contactList = [];
    for (const contact of contacts) {
        const [newContact, created] = await Contact_1.default.findOrCreate({
            where: {
                number: `${contact.number}`,
                companyId: contact.companyId
            },
            defaults: contact
        });
        if (created) {
            contactList.push(newContact);
        }
    }
    // Verifica se existe os contatos
    // if (contactList) {
    //   for (let newContact of contactList) {
    //     try {
    //       const response = await CheckContactNumber(newContact.number, companyId);
    //       const number = response;
    //       newContact.number = number;
    //       console.log('number', number)
    //       await newContact.save();
    //     } catch (e) {
    //       logger.error(`Número de contato inválido: ${newContact.number}`);
    //     }
    //   }
    // }
    return contactList;
}
exports.ImportContactsService = ImportContactsService;
