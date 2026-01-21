"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitBirthdayEvents = exports.getIO = exports.initIO = void 0;
const socket_io_1 = require("socket.io");
const AppError_1 = __importDefault(require("../errors/AppError"));
const logger_1 = __importDefault(require("../utils/logger"));
const admin_ui_1 = require("@socket.io/admin-ui");
const User_1 = __importDefault(require("../models/User"));
const ReceivedWhatsApp_1 = require("../services/WhatsAppOficial/ReceivedWhatsApp");
const jsonwebtoken_1 = require("jsonwebtoken");
const auth_1 = __importDefault(require("../config/auth"));
const BirthdayService_1 = __importDefault(require("../services/BirthdayService/BirthdayService"));
let io;
const initIO = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL
        }
    });
    if (process.env.SOCKET_ADMIN && JSON.parse(process.env.SOCKET_ADMIN)) {
        User_1.default.findByPk(1).then((adminUser) => {
            (0, admin_ui_1.instrument)(io, {
                auth: {
                    type: "basic",
                    username: adminUser.email,
                    password: adminUser.passwordHash
                },
                mode: "development",
            });
        });
    }
    const workspaces = io.of(/^\/\w+$/);
    workspaces.on("connection", socket => {
        const token_api_oficial = process.env.TOKEN_API_OFICIAL || "";
        const token = Array.isArray(socket?.handshake?.query?.token) ? socket.handshake.query.token[1] : socket?.handshake?.query?.token?.split(" ")[1];
        if (!token) {
            return socket.disconnect();
        }
        if (token !== token_api_oficial) {
            try {
                const decoded = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
                const companyId = socket.nsp.name.split("/")[1];
                const decodedPayload = decoded;
                const companyIdToken = decodedPayload.companyId;
                if (+companyIdToken !== +companyId) {
                    logger_1.default.error(`CompanyId do token ${companyIdToken} diferente da companyId do socket ${companyId}`);
                    return socket.disconnect();
                }
            }
            catch (error) {
                logger_1.default.error(JSON.stringify(error), "Error decoding token");
                if (error.message !== "jwt expired") {
                    return socket.disconnect();
                }
            }
        }
        else {
            logger_1.default.info(`Client connected namespace ${socket.nsp.name}`);
            logger_1.default.info(`Conectado com sucesso na API OFICIAL`);
        }
        //  ADICIONAR: Eventos de heartbeat e gerenciamento de usuários
        const handleHeartbeat = async (socket) => {
            try {
                const companyId = socket.nsp.name.split("/")[1];
                const decoded = (0, jsonwebtoken_1.verify)(token !== token_api_oficial ? token : "", auth_1.default.secret);
                const decodedPayload = decoded;
                const userId = decodedPayload.id;
                await User_1.default.update({
                    online: true,
                    lastSeen: new Date()
                }, { where: { id: userId } });
                socket.broadcast.to(`company-${companyId}`).emit("user:online", {
                    userId,
                    lastSeen: new Date()
                });
                clearTimeout(socket.heartbeatTimeout);
                socket.heartbeatTimeout = setTimeout(async () => {
                    await User_1.default.update({
                        online: false,
                        lastSeen: new Date()
                    }, { where: { id: userId } });
                    socket.broadcast.to(`company-${companyId}`).emit("user:offline", {
                        userId,
                        lastSeen: new Date()
                    });
                }, 30000);
            }
            catch (error) {
                logger_1.default.error("Error in handleHeartbeat:", error);
            }
        };
        //  NOVO: Handler para verificar aniversários quando usuário se conecta
        const checkAndEmitBirthdays = async (companyId) => {
            try {
                const birthdayData = await BirthdayService_1.default.getTodayBirthdaysForCompany(companyId);
                // Emitir eventos de aniversário se houver aniversariantes
                if (birthdayData.users.length > 0) {
                    birthdayData.users.forEach(user => {
                        io.of(`/${companyId}`).emit("user-birthday", {
                            userId: user.id,
                            userName: user.name,
                            userAge: user.age
                        });
                        logger_1.default.info(` [GLOBAL] Emitido evento de aniversário para usuário: ${user.name}`);
                    });
                }
                if (birthdayData.contacts.length > 0) {
                    birthdayData.contacts.forEach(contact => {
                        io.of(`/${companyId}`).emit("contact-birthday", {
                            contactId: contact.id,
                            contactName: contact.name,
                            contactAge: contact.age
                        });
                        logger_1.default.info(` [GLOBAL] Emitido evento de aniversário para contato: ${contact.name}`);
                    });
                }
            }
            catch (error) {
                logger_1.default.error(" Error checking birthdays:", error);
            }
        };
        //  EVENTO: Quando cliente se conecta
        socket.on("connect", async () => {
            try {
                if (token !== token_api_oficial) {
                    const decoded = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
                    const decodedPayload = decoded;
                    const userId = decodedPayload.id;
                    const companyId = parseInt(socket.nsp.name.split("/")[1]);
                    socket.join(`company-${companyId}`);
                    // Buscar dados do usuário
                    const user = await User_1.default.findByPk(userId, {
                        attributes: ["id", "name", "profileImage", "lastSeen"]
                    });
                    socket.broadcast.to(`company-${companyId}`).emit("user:new", {
                        userId,
                        user
                    });
                    // Buscar usuários online
                    const onlineUsers = await User_1.default.findAll({
                        where: {
                            companyId,
                            online: true
                        },
                        attributes: ["id", "name", "profileImage", "lastSeen"]
                    });
                    socket.emit("users:online", onlineUsers);
                    //  NOVO: Verificar e emitir aniversários quando usuário se conecta
                    await checkAndEmitBirthdays(companyId);
                }
            }
            catch (error) {
                logger_1.default.error("Error in socket connect:", error);
            }
        });
        //  NOVO: Evento para solicitar verificação manual de aniversários
        socket.on("checkBirthdays", async () => {
            try {
                const companyId = parseInt(socket.nsp.name.split("/")[1]);
                await checkAndEmitBirthdays(companyId);
            }
            catch (error) {
                logger_1.default.error(" Error in manual birthday check:", error);
            }
        });
        // Eventos existentes
        socket.on("joinChatBox", (ticketId) => {
            socket.join(ticketId);
        });
        socket.on("joinNotification", () => {
            socket.join("notification");
        });
        socket.on("joinVersion", () => {
            logger_1.default.info(`A client joined version channel namespace ${socket.nsp.name}`);
            socket.join("version");
        });
        socket.on("joinTickets", (status) => {
            socket.join(status);
        });
        socket.on("joinTicketsLeave", (status) => {
            socket.leave(status);
        });
        socket.on("joinChatBoxLeave", (ticketId) => {
            socket.leave(ticketId);
        });
        socket.on("receivedMessageWhatsAppOficial", (data) => {
            const receivedService = new ReceivedWhatsApp_1.ReceibedWhatsAppService();
            receivedService.getMessage(data);
        });
        socket.on("readMessageWhatsAppOficial", (data) => {
            const receivedService = new ReceivedWhatsApp_1.ReceibedWhatsAppService();
            receivedService.readMessage(data);
        });
        //  NOVO: Heartbeat para manter usuário online e verificar aniversários periodicamente
        socket.on("heartbeat", () => handleHeartbeat(socket));
        //  EVENTO: Quando cliente se desconecta
        socket.on("disconnect", async () => {
            try {
                if (token !== token_api_oficial) {
                    const companyId = parseInt(socket.nsp.name.split("/")[1]);
                    const decoded = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
                    const decodedPayload = decoded;
                    const userId = decodedPayload.id;
                    await User_1.default.update({
                        online: false,
                        lastSeen: new Date()
                    }, { where: { id: userId } });
                    socket.broadcast.to(`company-${companyId}`).emit("user:offline", {
                        userId,
                        lastSeen: new Date()
                    });
                }
            }
            catch (error) {
                logger_1.default.error("Error in socket disconnect:", error);
            }
        });
    });
    return io;
};
exports.initIO = initIO;
const getIO = () => {
    if (!io) {
        throw new AppError_1.default("Socket IO not initialized");
    }
    return io;
};
exports.getIO = getIO;
//  NOVA FUNÇÃO: Emitir eventos de aniversário para uma empresa específica
const emitBirthdayEvents = async (companyId) => {
    try {
        if (!io) {
            logger_1.default.warn(`[RDS-SOCKET] Socket IO não inicializado ao tentar emitir eventos de aniversário para empresa ${companyId}`);
            return;
        }
        const birthdayData = await BirthdayService_1.default.getTodayBirthdaysForCompany(companyId);
        // Emitir para todos os usuários da empresa
        if (birthdayData.users.length > 0) {
            birthdayData.users.forEach(user => {
                io.of(`/${companyId}`).emit("user-birthday", {
                    userId: user.id,
                    userName: user.name,
                    userAge: user.age
                });
                logger_1.default.info(` [GLOBAL] Emitido evento de aniversário para usuário: ${user.name}`);
            });
        }
        if (birthdayData.contacts.length > 0) {
            birthdayData.contacts.forEach(contact => {
                io.of(`/${companyId}`).emit("contact-birthday", {
                    contactId: contact.id,
                    contactName: contact.name,
                    contactAge: contact.age
                });
                logger_1.default.info(` [GLOBAL] Emitido evento de aniversário para contato: ${contact.name}`);
            });
        }
    }
    catch (error) {
        logger_1.default.error(` [RDS-SOCKET] Erro ao emitir eventos de aniversário para empresa ${companyId}:`, error instanceof Error ? error.message : "Unknown error");
        if (error instanceof Error && error.stack) {
            logger_1.default.debug(" [RDS-SOCKET] Error stack:", error.stack);
        }
    }
};
exports.emitBirthdayEvents = emitBirthdayEvents;
