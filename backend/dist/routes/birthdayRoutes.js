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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/birthdayRoutes.ts
const express_1 = __importDefault(require("express"));
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const BirthdayController = __importStar(require("../controllers/BirthdayController"));
const birthdayRoutes = express_1.default.Router();
// Buscar aniversariantes do dia
birthdayRoutes.get("/birthdays/today", isAuth_1.default, BirthdayController.getTodayBirthdays);
// Configurações de aniversário
birthdayRoutes.get("/birthdays/settings", isAuth_1.default, BirthdayController.getBirthdaySettings);
birthdayRoutes.put("/birthdays/settings", isAuth_1.default, BirthdayController.updateBirthdaySettings);
// Enviar mensagem de aniversário manualmente
birthdayRoutes.post("/birthdays/send-message", isAuth_1.default, BirthdayController.sendBirthdayMessage);
// Testar mensagem de aniversário
birthdayRoutes.post("/birthdays/test-message", isAuth_1.default, BirthdayController.testBirthdayMessage);
// Processar aniversários manualmente (admin only)
birthdayRoutes.post("/birthdays/process", isAuth_1.default, BirthdayController.processTodayBirthdays);
// Debug do sistema de aniversários
birthdayRoutes.get("/birthdays/debug", isAuth_1.default, BirthdayController.debugBirthdaySystem);
// Diagnóstico de aniversário específico
birthdayRoutes.get("/birthdays/diagnose", isAuth_1.default, BirthdayController.diagnoseBirthday);
exports.default = birthdayRoutes;
