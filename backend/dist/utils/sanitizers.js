"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeObject = exports.sanitizeBoolean = exports.sanitizeNumberArray = exports.sanitizeNumber = exports.sanitizeText = exports.sanitizePhoneNumber = exports.sanitizeEmail = exports.sanitizeString = void 0;
// Sanitizar strings removendo caracteres perigosos
const sanitizeString = (input) => {
    if (!input || typeof input !== "string")
        return "";
    return input
        .trim()
        .replace(/[<>]/g, "") // Remove caracteres HTML básicos
        .replace(/['"]/g, "") // Remove aspas
        .replace(/\\/g, "") // Remove barras invertidas
        .substring(0, 255); // Limita tamanho
};
exports.sanitizeString = sanitizeString;
// Sanitizar emails
const sanitizeEmail = (email) => {
    if (!email || typeof email !== "string")
        return "";
    return email
        .toLowerCase()
        .trim()
        .replace(/[^\w@\.\-]/g, "") // Mantém apenas caracteres válidos para email
        .substring(0, 255);
};
exports.sanitizeEmail = sanitizeEmail;
// Sanitizar números de telefone
const sanitizePhoneNumber = (phone) => {
    if (!phone || typeof phone !== "string")
        return "";
    return phone
        .replace(/[^\d@]/g, "") // Remove tudo exceto dígitos e @
        .substring(0, 20);
};
exports.sanitizePhoneNumber = sanitizePhoneNumber;
// Sanitizar texto geral
const sanitizeText = (text) => {
    if (!text || typeof text !== "string")
        return "";
    return text
        .trim()
        .replace(/[<>]/g, "")
        .replace(/\\/g, "")
        .substring(0, 1000);
};
exports.sanitizeText = sanitizeText;
// Sanitizar números (ADICIONANDO O QUE ESTAVA FALTANDO)
const sanitizeNumber = (input) => {
    if (typeof input === "number") {
        return Math.max(0, Math.floor(Math.abs(input)));
    }
    if (typeof input === "string") {
        const parsed = parseInt(input.replace(/[^\d]/g, ""), 10);
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    return 0;
};
exports.sanitizeNumber = sanitizeNumber;
// Sanitizar array de números
const sanitizeNumberArray = (input) => {
    if (!Array.isArray(input))
        return [];
    return input
        .map(exports.sanitizeNumber)
        .filter(num => num > 0)
        .slice(0, 100); // Limita a 100 itens
};
exports.sanitizeNumberArray = sanitizeNumberArray;
// Sanitizar boolean de string
const sanitizeBoolean = (input) => {
    if (typeof input === "boolean")
        return input;
    if (typeof input === "string") {
        return input.toLowerCase() === "true";
    }
    return false;
};
exports.sanitizeBoolean = sanitizeBoolean;
// Sanitizar objeto removendo propriedades perigosas
const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== "object")
        return {};
    const sanitized = {};
    const allowedKeys = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    for (const [key, value] of Object.entries(obj)) {
        if (allowedKeys.test(key) && value !== undefined) {
            if (typeof value === "string") {
                sanitized[key] = (0, exports.sanitizeString)(value);
            }
            else if (typeof value === "number") {
                sanitized[key] = (0, exports.sanitizeNumber)(value);
            }
            else if (typeof value === "boolean") {
                sanitized[key] = value;
            }
        }
    }
    return sanitized;
};
exports.sanitizeObject = sanitizeObject;
