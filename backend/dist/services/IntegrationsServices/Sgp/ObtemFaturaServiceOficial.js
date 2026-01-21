"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../../../utils/logger"));
const SendWhatsAppOficialMessage_1 = __importDefault(require("../../WhatsAppOficial/SendWhatsAppOficialMessage"));
const SendWhatsAppMessage_1 = __importDefault(require("../../WbotServices/SendWhatsAppMessage"));
const SgpClient_1 = __importDefault(require("./SgpClient"));
const date_fns_1 = require("date-fns");
const core_1 = require("openai/core");
const normalizeCpfCnpj = (value) => String(value || "").replace(/\D/g, "").trim();
const formatCurrency = (valor) => {
    if (valor === undefined || valor === null)
        return "";
    const num = typeof valor === "string" ? parseFloat(valor) : valor;
    if (isNaN(num))
        return String(valor);
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
const compareByDate = (a, b) => {
    const da = a ? new Date(a).getTime() : 0;
    const db = b ? new Date(b).getTime() : 0;
    return da - db;
};
const ObtemFaturaServiceOficial = async ({ queueIntegrationJson, ticket, cpfcnpj, senha, contratoSelecionado }) => {
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
        await sendText("Aguarde! Estamos consultando seus boletos...");
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
        let contratoCodigo = contratoSelecionado;
        if (!contratoCodigo && contratos.length > 1) {
            const header = "Localizamos mais de um contrato ativo. Informe o código do contrato desejado:";
            await sendText(header);
            const list = contratos.map(c => `• Código: ${c.contrato} | Titular: ${c.nome || "-"} | Situação: ${c.situacao || "-"}`).join("\n");
            await sendText(list);
            const newData = {
                ...(ticket.dataWebhook || {}),
                sgp: {
                    ...(ticket.dataWebhook?.sgp || {}),
                    cpfUsuario: cpf,
                    senhaUsuario: senha,
                    doisContratos: true,
                    aguardandoContrato: true
                }
            };
            await ticket.update({ dataWebhook: newData });
            return;
        }
        if (!contratoCodigo) {
            contratoCodigo = contratos[0].contrato;
        }
        const segundaVia = await client.obtemSegundaVia(cpf, sgpIeSenha === "S" ? senha : undefined, contratoCodigo);
        const itens = (segundaVia?.boletos && segundaVia.boletos.length > 0)
            ? segundaVia.boletos
            : (segundaVia?.links || []);
        // Ordena por vencimento_original quando disponível
        itens.sort((a, b) => {
            const dataA = a?.vencimento_original ? new Date(a.vencimento_original).getTime() : 0;
            const dataB = b?.vencimento_original ? new Date(b.vencimento_original).getTime() : 0;
            return dataA - dataB;
        });
        if (itens.length > 0) {
            const headerMsg = `Segue a segunda via da(s) sua(s) fatura(s) vencida(s) ou a vencer. Verifique os dados e efetue o pagamento para manter seu serviço ativo ou reativar o seu serviço.`;
            if (ticket?.channel === "whatsapp_oficial") {
                await (0, SendWhatsAppOficialMessage_1.default)({ body: headerMsg, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
            }
            else {
                await (0, SendWhatsAppMessage_1.default)({ body: headerMsg, ticket });
            }
        }
        for (const data of itens) {
            const item = data; // permite acessar campos extras como linhadigitavel e codigopix
            const vencOriginalStr = data?.vencimento_original || "";
            const vencAtualStr = data?.vencimento || "";
            const dataVencOriginal = vencOriginalStr ? (0, date_fns_1.format)((0, date_fns_1.parseISO)(vencOriginalStr), 'dd/MM/yyyy') : "-";
            const dataVencAtual = vencAtualStr ? (0, date_fns_1.format)((0, date_fns_1.parseISO)(vencAtualStr), 'dd/MM/yyyy') : "-";
            const valorFormatado = formatCurrency(data?.valor);
            const linkBoleto = item?.link || segundaVia?.link || "-";
            const linhaDigitavel = item?.linhadigitavel || segundaVia?.linhadigitavel || "";
            const codigoPix = item?.codigopix || segundaVia?.codigopix || "";
            const msgBoleto = [
                `*Data Vencimento Original:* ${dataVencOriginal}`,
                `*Data de Vencimento Atualizado:* ${dataVencAtual}`,
                `*Valor:* ${valorFormatado || "-"}`,
                linkBoleto ? `*Link do Boleto:* ${linkBoleto}` : null,
                linhaDigitavel ? `*Linha Digitável:* ${linhaDigitavel}` : null
            ].filter(Boolean).join("\n");
            if (ticket?.channel === "whatsapp_oficial") {
                await (0, SendWhatsAppOficialMessage_1.default)({ body: msgBoleto, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
            }
            else {
                await (0, SendWhatsAppMessage_1.default)({ body: msgBoleto, ticket });
            }
            if (codigoPix) {
                const msgPixHeader = "Este é o *PIX Copia e Cola*";
                const msgPixCode = String(codigoPix);
                if (ticket?.channel === "whatsapp_oficial") {
                    await (0, SendWhatsAppOficialMessage_1.default)({ body: msgPixHeader, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
                    await (0, SendWhatsAppOficialMessage_1.default)({ body: msgPixCode, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
                }
                else {
                    await (0, SendWhatsAppMessage_1.default)({ body: msgPixHeader, ticket });
                    await (0, SendWhatsAppMessage_1.default)({ body: msgPixCode, ticket });
                }
            }
        }
    }
    catch (err) {
        logger_1.default.error({ err }, "Erro em ObtemFaturaServiceOficial");
        const fallback = "Ocorreu um erro ao consultar seus boletos. Tente novamente em instantes.";
        if (ticket?.channel === "whatsapp_oficial") {
            await (0, SendWhatsAppOficialMessage_1.default)({ body: fallback, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
        }
        else {
            await (0, SendWhatsAppMessage_1.default)({ body: fallback, ticket });
        }
    }
    await (0, core_1.sleep)(5000); // espera 5 segundos antes de fechar o ticket
    try {
        const clearedDataWebhook = { ...(ticket.dataWebhook || {}) };
        if (clearedDataWebhook && clearedDataWebhook.sgp) {
            delete clearedDataWebhook.sgp;
        }
        await ticket.update({
            status: "closed",
            useIntegration: false,
            integrationId: null,
            dataWebhook: clearedDataWebhook
        });
    }
    catch (e) {
        logger_1.default.warn({ err: e }, "Falha ao fechar ticket/limpar integração após envio de boletos");
    }
};
exports.default = ObtemFaturaServiceOficial;
