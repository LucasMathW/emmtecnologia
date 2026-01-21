"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHashWebhookId = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateHashWebhookId = () => {
    // Gerar hash único baseado no timestamp e número aleatório
    const timestamp = Date.now().toString();
    const randomNum = Math.random().toString(36).substring(2, 15);
    const combined = `${timestamp}-${randomNum}`;
    // Criar hash SHA256
    const hash = crypto_1.default.createHash('sha256').update(combined).digest('hex');
    // Retornar primeiros 16 caracteres
    return hash.substring(0, 16);
};
exports.generateHashWebhookId = generateHashWebhookId;
