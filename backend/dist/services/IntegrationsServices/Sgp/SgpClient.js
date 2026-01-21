"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SgpClient = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../../../utils/logger"));
class SgpClient {
    constructor(config) {
        this.baseUrl = config.url;
    }
    static fromEnvOrConfig(configUrl) {
        const url = configUrl || process.env.SGP_API_URL || "";
        if (!url) {
            logger_1.default.warn("SGP url not configured. Set SGP_API_URL or jsonContent.sgpUrl");
        }
        return new SgpClient({ url });
    }
    async obtemContrato(cpfcnpj, senha) {
        try {
            // Garante que se a senha for vazia, usa o CPF (comportamento padrão se não configurado o contrário no Service)
            const senhaToSend = (senha && String(senha).length > 0) ? senha : cpfcnpj;
            const dataD = JSON.stringify({
                cpfcnpj: `${cpfcnpj}`,
                senha: `${senhaToSend}`
            });
            const { data } = await axios_1.default.request({
                method: "POST",
                url: `${this.baseUrl}/api/central/contratos`,
                headers: { 'Content-Type': 'application/json' },
                data: dataD
            });
            return data;
        }
        catch (error) {
            const err = error;
            logger_1.default.error({ err: err?.message, url: this.baseUrl }, "SGP obtemContrato error");
            return null;
        }
    }
    async obtemSegundaVia(cpfcnpj, senha, contrato) {
        try {
            const senhaToSend = (senha && String(senha).length > 0) ? senha : cpfcnpj;
            const dataD = JSON.stringify({
                cpfcnpj: `${cpfcnpj}`,
                senha: `${senhaToSend}`,
                contrato: `${contrato}`
            });
            console.error(`cpfcnpj: ${cpfcnpj}, senha: ${senhaToSend}, contrato: ${contrato}`);
            const { data } = await axios_1.default.request({
                method: "POST",
                url: `${this.baseUrl}/api/central/fatura2via`,
                headers: { 'Content-Type': 'application/json' },
                data: dataD
            });
            return data;
        }
        catch (error) {
            const err = error;
            logger_1.default.error({ err: err?.message, url: this.baseUrl }, "SGP obtemSegundaVia error");
            return null;
        }
    }
    async liberaCliente(cpfcnpj, senha, contrato) {
        try {
            const senhaToSend = (senha && String(senha).length > 0) ? senha : cpfcnpj;
            const dataD = JSON.stringify({
                cpfcnpj: `${cpfcnpj}`,
                senha: `${senhaToSend}`,
                contrato: `${contrato}`
            });
            const { data } = await axios_1.default.request({
                method: "POST",
                url: `${this.baseUrl}/api/central/promessapagamento`,
                headers: { 'Content-Type': 'application/json' },
                data: dataD
            });
            return data;
        }
        catch (error) {
            const err = error;
            logger_1.default.error({ err: err?.message, url: this.baseUrl }, "SGP liberaCliente error");
            return null;
        }
    }
}
exports.SgpClient = SgpClient;
exports.default = SgpClient;
