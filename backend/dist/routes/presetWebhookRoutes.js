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
const express_1 = __importDefault(require("express"));
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const PresetWebhookController = __importStar(require("../controllers/PresetWebhookController"));
const presetWebhookRoutes = express_1.default.Router();
presetWebhookRoutes.get("/preset-webhooks", isAuth_1.default, PresetWebhookController.list);
presetWebhookRoutes.get("/preset-webhooks/:id", isAuth_1.default, PresetWebhookController.show);
presetWebhookRoutes.post("/preset-webhooks", isAuth_1.default, PresetWebhookController.create);
presetWebhookRoutes.put("/preset-webhooks/:id", isAuth_1.default, PresetWebhookController.update);
presetWebhookRoutes.delete("/preset-webhooks/:id", isAuth_1.default, PresetWebhookController.remove);
exports.default = presetWebhookRoutes;
