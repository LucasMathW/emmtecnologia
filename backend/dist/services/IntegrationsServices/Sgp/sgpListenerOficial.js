"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SendWhatsAppOficialMessage_1 = __importDefault(require("../../WhatsAppOficial/SendWhatsAppOficialMessage"));
const SendWhatsAppMessage_1 = __importDefault(require("../../WbotServices/SendWhatsAppMessage"));
const ObtemFaturaServiceOficial_1 = __importDefault(require("./ObtemFaturaServiceOficial"));
const LiberacaoConfiancaServiceOficial_1 = __importDefault(require("./LiberacaoConfiancaServiceOficial"));
const logger_1 = __importDefault(require("../../../utils/logger"));
const getBody = (msg) => {
    try {
        const text = msg?.message?.conversation || msg?.message?.text || msg?.text || msg?.body || "";
        return String(text).trim();
    }
    catch {
        return "";
    }
};
const parseJsonContent = (jsonContent) => {
    if (!jsonContent)
        return {};
    try {
        return JSON.parse(jsonContent);
    }
    catch (err) {
        logger_1.default.warn({ err }, "Falha ao parsear queueIntegration.jsonContent para SGP");
        return {};
    }
};
const onlyDigits = (v) => String(v || "").replace(/\D/g, "");
const isValidCpf = (raw) => {
    const str = onlyDigits(raw);
    if (str.length !== 11)
        return false;
    if (/^(\d)\1{10}$/.test(str))
        return false;
    const calc = (base, factor) => {
        let total = 0;
        for (let i = 0; i < factor - 1; i++)
            total += parseInt(base.charAt(i)) * (factor - i);
        const rest = (total * 10) % 11;
        return rest === 10 ? 0 : rest;
    };
    const d1 = calc(str, 10);
    const d2 = calc(str, 11);
    return d1 === parseInt(str.charAt(9)) && d2 === parseInt(str.charAt(10));
};
const isValidCnpj = (raw) => {
    const str = onlyDigits(raw);
    if (str.length !== 14)
        return false;
    if (/^(\d)\1{13}$/.test(str))
        return false;
    const calc = (digits, pos) => {
        let size = pos - 7, sum = 0, i = pos;
        for (let n = 0; n < pos; n++) {
            sum += parseInt(digits.charAt(n)) * i;
            i--;
            if (i < 2)
                i = 9;
        }
        const rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    };
    const d1 = calc(str.substring(0, 12), 5);
    const d2 = calc(str.substring(0, 13), 6);
    return d1 === parseInt(str.charAt(12)) && d2 === parseInt(str.charAt(13));
};
const isValidCpfCnpj = (raw) => {
    const digits = onlyDigits(raw);
    return (digits.length === 11 && isValidCpf(digits)) || (digits.length === 14 && isValidCnpj(digits));
};
const sgpListenerOficial = async ({ msg, ticket, queueIntegration }) => {
    const bodyMsg = getBody(msg);
    const cfg = parseJsonContent(queueIntegration?.jsonContent);
    const tipoIntegracao = String(cfg?.tipoIntegracao || "").toUpperCase(); // 'SB' segunda via, 'LC' liberacao
    const sgpIeSenha = String(cfg?.sgpIeSenha || "N").toUpperCase();
    const state = ticket.dataWebhook?.sgp || {};
    if (!bodyMsg) {
        return;
    }
    // Envio unificado: escolhe Baileys ou Oficial conforme o canal do ticket
    const sendText = async (text) => {
        const body = text;
        if (ticket?.channel === "whatsapp_oficial") {
            await (0, SendWhatsAppOficialMessage_1.default)({ body, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
        }
        else {
            await (0, SendWhatsAppMessage_1.default)({ body, ticket });
        }
    };
    // Fluxo com senha obrigatória: primeiro CPF/CNPJ, depois senha
    if (sgpIeSenha === "S") {
        if (!state.cpfUsuario && !state.aguardandoSenha) {
            // Primeiro passo: armazenar CPF e solicitar senha
            if (!isValidCpfCnpj(bodyMsg)) {
                await sendText("CPF/CNPJ inválido. Por favor, informe um CPF/CNPJ válido.");
                return;
            }
            const newData = {
                ...(ticket.dataWebhook || {}),
                sgp: {
                    ...(ticket.dataWebhook?.sgp || {}),
                    cpfUsuario: bodyMsg,
                    aguardandoSenha: true
                }
            };
            await ticket.update({ dataWebhook: newData });
            await sendText("Perfeito! Agora, informe a sua senha.");
            return;
        }
        if (state.aguardandoSenha && !state.senhaUsuario) {
            const newData = {
                ...(ticket.dataWebhook || {}),
                sgp: {
                    ...(ticket.dataWebhook?.sgp || {}),
                    senhaUsuario: bodyMsg,
                    aguardandoSenha: false
                }
            };
            await ticket.update({ dataWebhook: newData });
            // prosseguir com execução
        }
    }
    // Se estava aguardando escolha de contrato, tratar resposta
    if (state.aguardandoContrato) {
        const codigo = String(bodyMsg).replace(/\D/g, "");
        if (!codigo) {
            await sendText("Informe apenas o código numérico do contrato.");
            return;
        }
        await (0, ObtemFaturaServiceOficial_1.default)({
            queueIntegrationJson: cfg,
            ticket,
            cpfcnpj: state.cpfUsuario || bodyMsg,
            senha: state.senhaUsuario,
            contratoSelecionado: codigo
        });
        return;
    }
    // Execução principal conforme tipo de integração
    if (tipoIntegracao === "SB") {
        const cpf = sgpIeSenha === "S" ? (ticket.dataWebhook?.sgp?.cpfUsuario || bodyMsg) : bodyMsg;
        const senha = sgpIeSenha === "S" ? (ticket.dataWebhook?.sgp?.senhaUsuario) : undefined;
        if (!isValidCpfCnpj(cpf)) {
            await sendText("CPF/CNPJ inválido. Por favor, informe um CPF/CNPJ válido.");
            return;
        }
        await (0, ObtemFaturaServiceOficial_1.default)({ queueIntegrationJson: cfg, ticket, cpfcnpj: cpf, senha });
        return;
    }
    if (tipoIntegracao === "LC") {
        const cpf = sgpIeSenha === "S" ? (ticket.dataWebhook?.sgp?.cpfUsuario || bodyMsg) : bodyMsg;
        const senha = sgpIeSenha === "S" ? (ticket.dataWebhook?.sgp?.senhaUsuario) : undefined;
        if (!isValidCpfCnpj(cpf)) {
            await sendText("CPF/CNPJ inválido. Por favor, informe um CPF/CNPJ válido.");
            return;
        }
        await (0, LiberacaoConfiancaServiceOficial_1.default)({ queueIntegrationJson: cfg, ticket, cpfcnpj: cpf, senha });
        return;
    }
    await sendText("Integração SGP não configurada corretamente. Contate o suporte.");
};
exports.default = sgpListenerOficial;
