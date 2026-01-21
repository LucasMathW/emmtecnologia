"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_graceful_shutdown_1 = __importDefault(require("http-graceful-shutdown"));
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./libs/socket");
const logger_1 = __importDefault(require("./utils/logger"));
const StartAllWhatsAppsSessions_1 = require("./services/WbotServices/StartAllWhatsAppsSessions");
const Company_1 = __importDefault(require("./models/Company"));
const queue_1 = __importDefault(require("./libs/queue"));
const queues_1 = require("./queues");
const LidSyncJob_1 = require("./jobs/LidSyncJob");
const server = app_1.default.listen(process.env.PORT, async () => {
    const companies = await Company_1.default.findAll({
        where: { status: true },
        attributes: ["id"]
    });
    const allPromises = [];
    companies.map(async (c) => {
        const promise = (0, StartAllWhatsAppsSessions_1.StartAllWhatsAppsSessions)(c.id);
        allPromises.push(promise);
    });
    Promise.all(allPromises).then(async () => {
        logger_1.default.info("Fila de processamento iniciando após sessões do WhatsApp");
        await (0, queues_1.startQueueProcess)();
    });
    if (process.env.REDIS_URI_ACK && process.env.REDIS_URI_ACK !== '') {
        queue_1.default.process();
    }
    (0, LidSyncJob_1.startLidSyncJob)();
    logger_1.default.info(`Servidor iniciado na porta ${process.env.PORT}`);
});
process.on("uncaughtException", err => {
    logger_1.default.error({ msg: "uncaughtException", error: err.message, stack: err.stack?.split("\n")[0] });
    process.exit(1);
});
process.on("unhandledRejection", (reason, p) => {
    logger_1.default.error({ msg: "unhandledRejection", reason: String(reason), promise: String(p) });
    process.exit(1);
});
(0, socket_1.initIO)(server);
(0, http_graceful_shutdown_1.default)(server);
