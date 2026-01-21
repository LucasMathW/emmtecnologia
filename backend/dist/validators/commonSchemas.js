"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmationSchema = exports.idArraySchema = exports.createTextSchema = exports.booleanStringSchema = exports.idSchema = exports.paginationSchema = exports.searchParamSchema = exports.birthDateSchema = exports.nameSchema = exports.phoneSchema = exports.emailSchema = void 0;
const Yup = __importStar(require("yup"));
// Schema para emails
exports.emailSchema = Yup.string()
    .email("Invalid email format")
    .max(255, "Email must be at most 255 characters")
    .nullable();
// Schema para telefones
exports.phoneSchema = Yup.string()
    .matches(/^\d+(@lid)?$/, "Invalid phone number format")
    .min(8, "Phone number must be at least 8 digits")
    .max(20, "Phone number must be at most 20 characters");
// Schema para nomes
exports.nameSchema = Yup.string()
    .min(1, "Name must be at least 1 character")
    .max(255, "Name must be at most 255 characters")
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\-_\.\(\)]+$/, "Name contains invalid characters");
// Schema para data de nascimento
exports.birthDateSchema = Yup.date()
    .nullable()
    .max(new Date(), "Birth date cannot be in the future")
    .min(new Date("1900-01-01"), "Birth date cannot be before 1900");
// Schema para parâmetros de busca
exports.searchParamSchema = Yup.string()
    .max(255, "Search parameter must be at most 255 characters")
    .nullable();
// Schema para paginação
exports.paginationSchema = {
    pageNumber: Yup.string()
        .matches(/^\d+$/, "Page number must be a positive integer")
        .transform((value) => value === "" ? "1" : value)
        .default("1")
};
// Schema para IDs (ADICIONANDO O QUE ESTAVA FALTANDO)
exports.idSchema = Yup.number()
    .integer("ID must be an integer")
    .positive("ID must be a positive number")
    .required("ID is required");
// Schema para strings booleanas
exports.booleanStringSchema = Yup.string()
    .oneOf(["true", "false"], "Must be 'true' or 'false'")
    .nullable();
// Schema para criação de textos com validação customizada
const createTextSchema = (options = {}) => {
    const { required = false, maxLength = 500, minLength = 0, allowSpecialChars = false } = options;
    let schema = Yup.string();
    if (minLength > 0) {
        schema = schema.min(minLength, `Text must be at least ${minLength} characters`);
    }
    if (maxLength > 0) {
        schema = schema.max(maxLength, `Text must be at most ${maxLength} characters`);
    }
    if (!allowSpecialChars) {
        schema = schema.matches(/^[a-zA-ZÀ-ÿ0-9\s\-_\.\(\)]+$/, "Text contains invalid characters");
    }
    return required ? schema.required("Text is required") : schema.nullable();
};
exports.createTextSchema = createTextSchema;
// Schema específico para validação de arrays de IDs
exports.idArraySchema = Yup.array()
    .of(exports.idSchema)
    .nullable();
// Schema para validação de confirmação de texto
exports.confirmationSchema = Yup.string()
    .required("Confirmation is required");
