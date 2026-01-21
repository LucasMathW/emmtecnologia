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
exports.initWASocket = exports.dataMessages = exports.internalIsJidGroup = exports.removeWbot = exports.restartWbot = exports.getWbot = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const Sentry = __importStar(require("@sentry/node"));
const baileys_1 = __importStar(require("baileys"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const logger_1 = __importDefault(require("../utils/logger"));
const logger_2 = __importDefault(require("baileys/lib/Utils/logger"));
const useMultiFileAuthState_1 = require("../helpers/useMultiFileAuthState");
const AppError_1 = __importDefault(require("../errors/AppError"));
const socket_1 = require("./socket");
const StartWhatsAppSession_1 = require("../services/WbotServices/StartWhatsAppSession");
const DeleteBaileysService_1 = __importDefault(require("../services/BaileysServices/DeleteBaileysService"));
const cache_1 = __importDefault(require("../libs/cache"));
const ImportWhatsAppMessageService_1 = __importDefault(require("../services/WhatsappService/ImportWhatsAppMessageService"));
const date_fns_1 = require("date-fns");
const moment_1 = __importDefault(require("moment"));
const wbotMessageListener_1 = require("../services/WbotServices/wbotMessageListener");
const addLogs_1 = require("../helpers/addLogs");
const node_cache_1 = __importDefault(require("node-cache"));
const Message_1 = __importDefault(require("../models/Message"));
const versionHelper_1 = require("../utils/versionHelper");
const path_1 = __importDefault(require("path"));
const RedisGroupCache_1 = require("../utils/RedisGroupCache");
const loggerBaileys = logger_2.default.child({});
loggerBaileys.level = "error";
const sessions = [];
const retriesQrCodeMap = new Map();
async function deleteFolder(folder) {
    try {
        await promises_1.default.rm(folder, { recursive: true });
        console.log('Pasta deletada com sucesso!', folder);
    }
    catch (err) {
        console.error('Erro ao deletar pasta:', err);
    }
}
const getWbot = async (whatsappId) => {
    const whatsapp = await Whatsapp_1.default.findByPk(whatsappId);
    if (whatsapp.channel !== "whatsapp_oficial") {
        const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
        if (sessionIndex === -1) {
            throw new AppError_1.default("ERR_WAPP_NOT_INITIALIZED");
        }
        return sessions[sessionIndex];
    }
};
exports.getWbot = getWbot;
const restartWbot = async (companyId, session) => {
    try {
        const options = {
            where: {
                companyId,
            },
            attributes: ["id"],
        };
        const whatsapp = await Whatsapp_1.default.findAll(options);
        whatsapp.map(async (c) => {
            const sessionIndex = sessions.findIndex(s => s.id === c.id);
            if (sessionIndex !== -1) {
                sessions[sessionIndex].ws.close();
            }
        });
    }
    catch (err) {
        logger_1.default.error(err);
    }
};
exports.restartWbot = restartWbot;
const removeWbot = async (whatsappId, isLogout = true) => {
    try {
        const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
        if (sessionIndex !== -1) {
            if (isLogout) {
                sessions[sessionIndex].logout();
                sessions[sessionIndex].ws.close();
            }
            sessions.splice(sessionIndex, 1);
        }
    }
    catch (err) {
        logger_1.default.error(err);
    }
};
exports.removeWbot = removeWbot;
function internalIsJidGroup(jid) {
    return (0, baileys_1.isJidGroup)(jid);
}
exports.internalIsJidGroup = internalIsJidGroup;
exports.dataMessages = {};
// export const msgDB = msg();
const initWASocket = async (whatsapp) => {
    return new Promise(async (resolve, reject) => {
        try {
            (async () => {
                const io = (0, socket_1.getIO)();
                const whatsappUpdate = await Whatsapp_1.default.findOne({
                    where: { id: whatsapp.id }
                });
                if (!whatsappUpdate)
                    return;
                const { id, name, allowGroup, companyId } = whatsappUpdate;
                logger_1.default.info(`Starting session ${name}`);
                let retriesQrCode = 0;
                let wsocket = null;
                const store = new node_cache_1.default({
                    stdTTL: 3600,
                    checkperiod: 30,
                    useClones: false
                });
                const msgRetryCounterCache = new node_cache_1.default({
                    stdTTL: 60 * 60,
                    useClones: false
                });
                async function getMessage(key) {
                    console.log("key", key);
                    if (!key.id)
                        return null;
                    const message = store.get(key.id);
                    if (message) {
                        logger_1.default.info({ message }, "cacheMessage: recovered from cache");
                        return message;
                    }
                    logger_1.default.info({ key }, "cacheMessage: not found in cache - fallback to database");
                    let msg;
                    msg = await Message_1.default.findOne({
                        where: { wid: key.id, fromMe: true }
                    });
                    if (!msg) {
                        logger_1.default.info({ key }, "cacheMessage: not found in database");
                        return undefined;
                    }
                    try {
                        const data = JSON.parse(msg.dataJson);
                        logger_1.default.info({ key, data }, "cacheMessage: recovered from database");
                        store.set(key.id, data.message);
                        return data.message || undefined;
                    }
                    catch (error) {
                        logger_1.default.error({ key }, `cacheMessage: error parsing message from database - ${error.message}`);
                    }
                    return undefined;
                }
                const versionWA = await (0, versionHelper_1.getVersionByIndexFromUrl)(2);
                console.info("[WBOT.ts] Versao sendo puxada de url:", versionWA);
                const publicFolder = path_1.default.join(__dirname, '..', '..', '..', 'backend', 'sessions');
                const folderSessions = path_1.default.join(publicFolder, `company${whatsapp.companyId}`, whatsapp.id.toString());
                // const { state, saveCreds } = await useMultiFileAuthState(folderSessions);
                const { state, saveCreds } = await (0, useMultiFileAuthState_1.useMultiFileAuthState)(whatsapp);
                wsocket = (0, baileys_1.default)({
                    version: versionWA || [2, 3000, 1030220586],
                    logger: loggerBaileys,
                    auth: {
                        creds: state.creds,
                        /** caching makes the store faster to send/recv messages */
                        keys: state.keys,
                    },
                    syncFullHistory: true,
                    transactionOpts: { maxCommitRetries: 1, delayBetweenTriesMs: 10 },
                    generateHighQualityLinkPreview: true,
                    linkPreviewImageThumbnailWidth: 200,
                    emitOwnEvents: true,
                    browser: baileys_1.Browsers.windows("Chrome"),
                    defaultQueryTimeoutMs: 60000,
                    cachedGroupMetadata: async (jid) => {
                        const cachedGroupMetadata = await (0, RedisGroupCache_1.getGroupMetadataCache)(whatsapp.id, jid);
                        if (cachedGroupMetadata?.data === 403) {
                            throw new AppError_1.default("ERR_SENDING_WAPP_MSG_GROUP_BLOCKED");
                        }
                        return cachedGroupMetadata;
                    },
                    // msgRetryCounterCache,
                    // maxMsgRetryCount: 5,
                    shouldIgnoreJid: jid => {
                        const ignoreJid = (!allowGroup && (0, baileys_1.isJidGroup)(jid)) ||
                            (0, baileys_1.isJidBroadcast)(jid) ||
                            (0, baileys_1.isJidNewsletter)(jid) ||
                            (0, baileys_1.isJidStatusBroadcast)(jid);
                        // || isJidMetaIa(jid)
                        return ignoreJid;
                    },
                    getMessage
                });
                wsocket.id = whatsapp.id;
                wsocket.store = (msg) => {
                    if (!msg.key.fromMe)
                        return;
                    logger_1.default.debug({ message: msg.message }, "cacheMessage: saved");
                    store.set(msg.key.id, msg.message);
                };
                setTimeout(async () => {
                    const wpp = await Whatsapp_1.default.findByPk(whatsapp.id);
                    // console.log("Status:::::",wpp.status)
                    if (wpp?.importOldMessages && wpp.status === "CONNECTED") {
                        let dateOldLimit = new Date(wpp.importOldMessages).getTime();
                        let dateRecentLimit = new Date(wpp.importRecentMessages).getTime();
                        (0, addLogs_1.addLogs)({
                            fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`, forceNewFile: true,
                            text: `Aguardando conexão para iniciar a importação de mensagens:
  Whatsapp nome: ${wpp.name}
  Whatsapp Id: ${wpp.id}
  Criação do arquivo de logs: ${(0, moment_1.default)().format("DD/MM/YYYY HH:mm:ss")}
  Selecionado Data de inicio de importação: ${(0, moment_1.default)(dateOldLimit).format("DD/MM/YYYY HH:mm:ss")}
  Selecionado Data final da importação: ${(0, moment_1.default)(dateRecentLimit).format("DD/MM/YYYY HH:mm:ss")}
  `
                        });
                        const statusImportMessages = new Date().getTime();
                        await wpp.update({
                            statusImportMessages
                        });
                        wsocket.ev.on("messaging-history.set", async (messageSet) => {
                            //if(messageSet.isLatest){
                            const statusImportMessages = new Date().getTime();
                            await wpp.update({
                                statusImportMessages
                            });
                            const whatsappId = whatsapp.id;
                            let filteredMessages = messageSet.messages;
                            let filteredDateMessages = [];
                            filteredMessages.forEach(msg => {
                                const timestampMsg = Math.floor(msg.messageTimestamp["low"] * 1000);
                                if ((0, wbotMessageListener_1.isValidMsg)(msg) && dateOldLimit < timestampMsg && dateRecentLimit > timestampMsg) {
                                    if (msg.key?.remoteJid.split("@")[1] != "g.us") {
                                        (0, addLogs_1.addLogs)({
                                            fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`, text: `Adicionando mensagem para pos processamento:
  Não é Mensagem de GRUPO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  Data e hora da mensagem: ${(0, moment_1.default)(timestampMsg).format("DD/MM/YYYY HH:mm:ss")}
  Contato da Mensagem : ${msg.key?.remoteJid}
  Tipo da mensagem : ${(0, wbotMessageListener_1.getTypeMessage)(msg)}

  `
                                        });
                                        filteredDateMessages.push(msg);
                                    }
                                    else {
                                        if (wpp?.importOldMessagesGroups) {
                                            (0, addLogs_1.addLogs)({
                                                fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`, text: `Adicionando mensagem para pos processamento:
  Mensagem de GRUPO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  Data e hora da mensagem: ${(0, moment_1.default)(timestampMsg).format("DD/MM/YYYY HH:mm:ss")}
  Contato da Mensagem : ${msg.key?.remoteJid}
  Tipo da mensagem : ${(0, wbotMessageListener_1.getTypeMessage)(msg)}

  `
                                            });
                                            filteredDateMessages.push(msg);
                                        }
                                    }
                                }
                            });
                            if (!exports.dataMessages?.[whatsappId]) {
                                exports.dataMessages[whatsappId] = [];
                                exports.dataMessages[whatsappId].unshift(...filteredDateMessages);
                            }
                            else {
                                exports.dataMessages[whatsappId].unshift(...filteredDateMessages);
                            }
                            setTimeout(async () => {
                                const wpp = await Whatsapp_1.default.findByPk(whatsappId);
                                io.of(String(companyId))
                                    .emit(`importMessages-${wpp.companyId}`, {
                                    action: "update",
                                    status: { this: -1, all: -1 }
                                });
                                io.of(String(companyId))
                                    .emit(`company-${companyId}-whatsappSession`, {
                                    action: "update",
                                    session: wpp
                                });
                                //console.log(JSON.stringify(wpp, null, 2));
                            }, 500);
                            setTimeout(async () => {
                                const wpp = await Whatsapp_1.default.findByPk(whatsappId);
                                if (wpp?.importOldMessages) {
                                    let isTimeStamp = !isNaN(new Date(Math.floor(parseInt(wpp?.statusImportMessages))).getTime());
                                    if (isTimeStamp) {
                                        const ultimoStatus = new Date(Math.floor(parseInt(wpp?.statusImportMessages))).getTime();
                                        const dataLimite = +(0, date_fns_1.add)(ultimoStatus, { seconds: +45 }).getTime();
                                        if (dataLimite < new Date().getTime()) {
                                            //console.log("Pronto para come?ar")
                                            (0, ImportWhatsAppMessageService_1.default)(wpp.id);
                                            wpp.update({
                                                statusImportMessages: "Running"
                                            });
                                        }
                                        else {
                                            //console.log("Aguardando inicio")
                                        }
                                    }
                                }
                                io.of(String(companyId))
                                    .emit(`company-${companyId}-whatsappSession`, {
                                    action: "update",
                                    session: wpp
                                });
                            }, 1000 * 45);
                        });
                    }
                }, 2500);
                wsocket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
                    logger_1.default.info(`Socket  ${name} Connection Update ${connection || ""} ${lastDisconnect ? lastDisconnect.error.message : ""}`);
                    if (connection === "close") {
                        console.log("DESCONECTOU", JSON.stringify(lastDisconnect, null, 2));
                        logger_1.default.info(`Socket  ${name} Connection Update ${connection || ""} ${lastDisconnect ? lastDisconnect.error.message : ""}`);
                        if (lastDisconnect?.error?.output?.statusCode === 403) {
                            await whatsapp.update({ status: "PENDING", session: "" });
                            await (0, DeleteBaileysService_1.default)(whatsapp.id);
                            // await deleteFolder(folderSessions);
                            await cache_1.default.delFromPattern(`sessions:${whatsapp.id}:*`);
                            io.of(String(companyId))
                                .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                                action: "update",
                                session: whatsapp
                            });
                            (0, exports.removeWbot)(id, false);
                        }
                        if (lastDisconnect?.error?.output?.statusCode !==
                            baileys_1.DisconnectReason.loggedOut) {
                            (0, exports.removeWbot)(id, false);
                            setTimeout(() => (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, whatsapp.companyId), 2000);
                        }
                        else {
                            await whatsapp.update({ status: "PENDING", session: "" });
                            await (0, DeleteBaileysService_1.default)(whatsapp.id);
                            // await deleteFolder(folderSessions);
                            await cache_1.default.delFromPattern(`sessions:${whatsapp.id}:*`);
                            io.of(String(companyId))
                                .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                                action: "update",
                                session: whatsapp
                            });
                            (0, exports.removeWbot)(id, false);
                            setTimeout(() => (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, whatsapp.companyId), 2000);
                        }
                    }
                    if (connection === "open") {
                        wsocket.myLid = (0, baileys_1.jidNormalizedUser)(wsocket.user?.lid);
                        wsocket.myJid = (0, baileys_1.jidNormalizedUser)(wsocket.user.id);
                        await whatsapp.update({
                            status: "CONNECTED",
                            qrcode: "",
                            retries: 0,
                            number: wsocket.type === "md"
                                ? (0, baileys_1.jidNormalizedUser)(wsocket.user.id).split("@")[0]
                                : "-"
                        });
                        logger_1.default.debug({
                            id: (0, baileys_1.jidNormalizedUser)(wsocket.user.id),
                            name: wsocket.user.name,
                            lid: (0, baileys_1.jidNormalizedUser)(wsocket.user?.lid),
                            notify: wsocket.user?.notify,
                            verifiedName: wsocket.user?.verifiedName,
                            imgUrl: wsocket.user?.imgUrl,
                            status: wsocket.user?.status
                        }, `Session ${name} details`);
                        io.of(String(companyId))
                            .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                            action: "update",
                            session: whatsapp
                        });
                        const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
                        if (sessionIndex === -1) {
                            wsocket.id = whatsapp.id;
                            sessions.push(wsocket);
                        }
                        resolve(wsocket);
                    }
                    if (qr !== undefined) {
                        if (retriesQrCodeMap.get(id) && retriesQrCodeMap.get(id) >= 3) {
                            await whatsappUpdate.update({
                                status: "DISCONNECTED",
                                qrcode: ""
                            });
                            await (0, DeleteBaileysService_1.default)(whatsappUpdate.id);
                            // await deleteFolder(folderSessions);
                            await cache_1.default.delFromPattern(`sessions:${whatsapp.id}:*`);
                            io.of(String(companyId))
                                .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                                action: "update",
                                session: whatsappUpdate
                            });
                            wsocket.ev.removeAllListeners("connection.update");
                            wsocket.ws.close();
                            wsocket = null;
                            retriesQrCodeMap.delete(id);
                        }
                        else {
                            logger_1.default.info(`Session QRCode Generate ${name}`);
                            retriesQrCodeMap.set(id, (retriesQrCode += 1));
                            await whatsapp.update({
                                qrcode: qr,
                                status: "qrcode",
                                retries: 0,
                                number: ""
                            });
                            const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
                            if (sessionIndex === -1) {
                                wsocket.id = whatsapp.id;
                                sessions.push(wsocket);
                            }
                            io.of(String(companyId))
                                .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                                action: "update",
                                session: whatsapp
                            });
                        }
                    }
                });
                wsocket.ev.on("creds.update", saveCreds);
                // wsocket.store = store;
                // store.bind(wsocket.ev);
            })();
        }
        catch (error) {
            Sentry.captureException(error);
            console.log(error);
            reject(error);
        }
    });
};
exports.initWASocket = initWASocket;
