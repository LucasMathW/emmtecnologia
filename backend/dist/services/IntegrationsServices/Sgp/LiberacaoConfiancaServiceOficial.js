"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../../../utils/logger"));
const SendWhatsAppOficialMessage_1 = __importDefault(require("../../WhatsAppOficial/SendWhatsAppOficialMessage"));
const SendWhatsAppMessage_1 = __importDefault(require("../../WbotServices/SendWhatsAppMessage"));
const SgpClient_1 = __importDefault(require("./SgpClient"));
const normalizeCpfCnpj = (value) => String(value || "").replace(/\D/g, "").trim();
const LiberacaoConfiancaServiceOficial = async ({ queueIntegrationJson, ticket, cpfcnpj, senha }) => {
    const sgpUrl = queueIntegrationJson?.sgpUrl || process.env.SGP_API_URL || "";
    const sgpIeSenha = String(queueIntegrationJson?.sgpIeSenha || "N").toUpperCase();
    const client = SgpClient_1.default.fromEnvOrConfig(sgpUrl);
    const cpf = normalizeCpfCnpj(cpfcnpj);
    try {
        const sendText = async (text) => {
            if (ticket?.channel === "whatsapp_oficial") {
                await (0, SendWhatsAppOficialMessage_1.default)({ body: text, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
            }
            else {
                await (0, SendWhatsAppMessage_1.default)({ body: text, ticket });
            }
        };
        await sendText("Aguarde! Estou verificando a possibilidade de liberação por confiança...");
        const contratosResp = await client.obtemContrato(cpf, sgpIeSenha === "S" ? senha : undefined);
        if (!contratosResp || contratosResp?.auth === false) {
            await sendText("Não foi possível localizar seu contrato. Verifique os dados e tente novamente.");
            return;
        }
        const contratos = (contratosResp.contratos || []).filter(c => String(c.situacao || "").toUpperCase() !== "CANCELADO");
        if (!contratos.length) {
            await sendText("Nenhum contrato ativo foi localizado para este CPF/CNPJ.");
            return;
        }
        const contratoCodigo = contratos[0].contrato;
        const libera = await client.liberaCliente(cpf, sgpIeSenha === "S" ? senha : undefined, contratoCodigo);
        if (!libera) {
            await sendText("Não foi possível realizar a liberação por confiança.");
            return;
        }
        const msg = libera.msg || libera.message || "Solicitação processada.";
        await sendText(msg);
    }
    catch (err) {
        logger_1.default.error({ err }, "Erro em LiberacaoConfiancaServiceOficial");
        const fallback = "Ocorreu um erro ao processar a liberação. Tente novamente em instantes.";
        if (ticket?.channel === "whatsapp_oficial") {
            await (0, SendWhatsAppOficialMessage_1.default)({ body: fallback, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
        }
        else {
            await (0, SendWhatsAppMessage_1.default)({ body: fallback, ticket });
        }
    }
};
exports.default = LiberacaoConfiancaServiceOficial;
