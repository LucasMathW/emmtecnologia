"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClosedAllOpenTickets = void 0;
const Sequelize = (() => { try {
    return require("sequelize");
}
catch (_) {
    return {};
} })();
const Op = (Sequelize && Sequelize.Op) ? Sequelize.Op : { lt: Symbol("lt"), gt: Symbol("gt"), or: Symbol("or"), not: Symbol("not") };
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const socket_1 = require("../../libs/socket");
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const SendWhatsAppMessage_1 = __importDefault(require("./SendWhatsAppMessage"));
const SendWhatsAppOficialMessage_1 = __importDefault(require("../WhatsAppOficial/SendWhatsAppOficialMessage"));
const moment_1 = __importDefault(require("moment"));
const wbotMessageListener_1 = require("./wbotMessageListener");
const TicketTraking_1 = __importDefault(require("../../models/TicketTraking"));
const CreateLogTicketService_1 = __importDefault(require("../TicketServices/CreateLogTicketService"));
const logger_1 = __importDefault(require("../../utils/logger"));
const lodash_1 = require("lodash");
const date_fns_1 = require("date-fns");
const ActionsWebhookService_1 = require("../WebhookService/ActionsWebhookService");
const FlowBuilder_1 = require("../../models/FlowBuilder");
const Contact_1 = __importDefault(require("../../models/Contact"));
const ShowTicketFromUUIDService_1 = __importDefault(require("../TicketServices/ShowTicketFromUUIDService"));
const closeTicket = async (ticket, body) => {
    await ticket.update({
        status: "closed",
        lastMessage: body,
        unreadMessages: 0,
        amountUsedBotQueues: 0
    });
    await (0, CreateLogTicketService_1.default)({
        userId: ticket.userId || null,
        queueId: ticket.queueId || null,
        ticketId: ticket.id,
        type: "autoClose"
    });
};
const handleOpenTickets = async (companyId, whatsapp) => {
    const currentTime = new Date();
    const brazilTimeZoneOffset = -3 * 60; // Fuso horário do Brasil é UTC-3
    const currentTimeBrazil = new Date(currentTime.getTime() + brazilTimeZoneOffset * 60000); // Adiciona o offset ao tempo atual
    let timeInactiveMessage = Number(whatsapp.timeInactiveMessage || 0);
    let expiresTime = Number(whatsapp.expiresTicket || 0);
    let flowInactiveTime = Number(whatsapp.flowInactiveTime || 0);
    if (!(0, lodash_1.isNil)(expiresTime) && expiresTime > 0) {
        if (!(0, lodash_1.isNil)(timeInactiveMessage) && timeInactiveMessage > 0) {
            let whereCondition1;
            whereCondition1 = {
                status: {
                    [Op.or]: ["open", "pending"]
                },
                companyId,
                whatsappId: whatsapp.id,
                updatedAt: {
                    [Op.lt]: +(0, date_fns_1.sub)(new Date(), {
                        minutes: Number(timeInactiveMessage)
                    })
                },
                imported: null,
                sendInactiveMessage: false
            };
            if (Number(whatsapp.whenExpiresTicket) === 1) {
                whereCondition1 = {
                    ...whereCondition1,
                    fromMe: true
                };
            }
            const ticketsForInactiveMessage = await Ticket_1.default.findAll({
                where: whereCondition1
            });
            if (ticketsForInactiveMessage && ticketsForInactiveMessage.length > 0) {
                logger_1.default.info(`Encontrou ${ticketsForInactiveMessage.length} atendimentos para enviar mensagem de inatividade na empresa ${companyId}- na conexão ${whatsapp.name}!`);
                await Promise.all(ticketsForInactiveMessage.map(async (ticket) => {
                    await ticket.reload();
                    if (!ticket.sendInactiveMessage) {
                        const bodyMessageInactive = (0, Mustache_1.default)(`\u200e ${whatsapp.inactiveMessage}`, ticket);
                        if (ticket.channel === "whatsapp_oficial") {
                            await (0, SendWhatsAppOficialMessage_1.default)({
                                body: bodyMessageInactive,
                                ticket: ticket,
                                quotedMsg: null,
                                type: 'text',
                                media: null,
                                vCard: null
                            });
                        }
                        else {
                            const sentMessage = await (0, SendWhatsAppMessage_1.default)({ body: bodyMessageInactive, ticket: ticket });
                            await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, ticket.contact);
                        }
                        await ticket.update({ sendInactiveMessage: true, fromMe: true });
                    }
                }));
            }
            expiresTime += timeInactiveMessage; // Adicionando o tempo de inatividade ao tempo de expiração
        }
        let whereCondition;
        whereCondition = {
            status: "open",
            companyId,
            whatsappId: whatsapp.id,
            updatedAt: {
                [Op.lt]: +(0, date_fns_1.sub)(new Date(), {
                    minutes: Number(expiresTime)
                })
            },
            imported: null
        };
        if (timeInactiveMessage > 0) {
            whereCondition = {
                ...whereCondition,
                sendInactiveMessage: true,
            };
        }
        if (Number(whatsapp.whenExpiresTicket) === 1) {
            whereCondition = {
                ...whereCondition,
                fromMe: true
            };
        }
        const ticketsToClose = await Ticket_1.default.findAll({
            where: whereCondition
        });
        if (ticketsToClose && ticketsToClose.length > 0) {
            logger_1.default.info(`Encontrou ${ticketsToClose.length} atendimentos para encerrar na empresa ${companyId} - na conexão ${whatsapp.name}!`);
            for (const ticket of ticketsToClose) {
                await ticket.reload();
                const ticketTraking = await TicketTraking_1.default.findOne({
                    where: { ticketId: ticket.id, finishedAt: null }
                });
                let bodyExpiresMessageInactive = "";
                if (!(0, lodash_1.isNil)(whatsapp.expiresInactiveMessage) && whatsapp.expiresInactiveMessage !== "") {
                    bodyExpiresMessageInactive = (0, Mustache_1.default)(`\u200e${whatsapp.expiresInactiveMessage}`, ticket);
                    if (ticket.channel === "whatsapp_oficial") {
                        await (0, SendWhatsAppOficialMessage_1.default)({
                            body: bodyExpiresMessageInactive,
                            ticket: ticket,
                            quotedMsg: null,
                            type: 'text',
                            media: null,
                            vCard: null
                        });
                    }
                    else {
                        const sentMessage = await (0, SendWhatsAppMessage_1.default)({ body: bodyExpiresMessageInactive, ticket: ticket });
                        await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, ticket.contact);
                    }
                }
                // Como o campo sendInactiveMessage foi atualizado, podemos garantir que a mensagem foi enviada
                await closeTicket(ticket, bodyExpiresMessageInactive);
                await ticketTraking.update({
                    finishedAt: new Date(),
                    closedAt: new Date(),
                    whatsappId: ticket.whatsappId,
                    userId: ticket.userId,
                });
                // console.log("emitiu socket 144", ticket.id)
                const io = (0, socket_1.getIO)();
                io.of(companyId.toString()).emit(`company-${companyId}-ticket`, {
                    action: "delete",
                    ticketId: ticket.id
                });
            }
        }
    }
    if (!(0, lodash_1.isNil)(flowInactiveTime) && flowInactiveTime > 0) {
        let whereCondition1;
        whereCondition1 = {
            status: "open",
            companyId,
            whatsappId: whatsapp.id,
            updatedAt: {
                [Op.lt]: +(0, date_fns_1.sub)(new Date(), {
                    minutes: Number(flowInactiveTime)
                })
            },
            imported: null,
            sendInactiveMessage: false
        };
        if (Number(whatsapp.whenExpiresTicket) === 1) {
            whereCondition1 = {
                ...whereCondition1,
                fromMe: true
            };
        }
        const ticketsForInactiveMessage = await Ticket_1.default.findAll({
            where: whereCondition1,
            include: [
                {
                    model: Contact_1.default,
                    attributes: ["number", "name", "email"]
                }
            ]
        });
        if (ticketsForInactiveMessage && ticketsForInactiveMessage.length > 0) {
            logger_1.default.info(`Encontrou ${ticketsForInactiveMessage.length} atendimentos para acionar o fluxo de inatividade na empresa ${companyId}- na conexão ${whatsapp.name}!`);
            await Promise.all(ticketsForInactiveMessage.map(async (ticket) => {
                await ticket.reload();
                if (!ticket.sendInactiveMessage) {
                    if (ticket.maxUseInactiveTime < whatsapp.maxUseInactiveTime) {
                        const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
                            where: {
                                id: whatsapp.flowIdInactiveTime
                            }
                        });
                        if (flow) {
                            const contact = ticket.contact;
                            const nodes = flow.flow["nodes"];
                            const connections = flow.flow["connections"];
                            const mountDataContact = {
                                number: contact.number,
                                name: contact.name,
                                email: contact.email
                            };
                            await (0, ActionsWebhookService_1.ActionsWebhookService)(whatsapp.id, whatsapp.flowIdInactiveTime, ticket.companyId, nodes, connections, flow.flow["nodes"][0].id, null, "", "", null, ticket.id, mountDataContact);
                            await ticket.update({
                                maxUseInactiveTime: ticket.maxUseInactiveTime ? ticket.maxUseInactiveTime + 1 : 1
                            });
                        }
                    }
                }
            }));
        }
        expiresTime += timeInactiveMessage; // Adicionando o tempo de inatividade ao tempo de expiração
    }
    ;
};
const handleNPSTickets = async (companyId, whatsapp) => {
    const expiresTime = Number(whatsapp.expiresTicketNPS);
    const dataLimite = (0, moment_1.default)().subtract(expiresTime, 'minutes');
    const ticketsToClose = await Ticket_1.default.findAll({
        where: {
            status: "nps",
            companyId,
            whatsappId: whatsapp.id,
            updatedAt: { [Op.lt]: dataLimite.toDate() },
            imported: null
        }
    });
    if (ticketsToClose && ticketsToClose.length > 0) {
        logger_1.default.info(`Encontrou ${ticketsToClose.length} atendimentos para encerrar NPS na empresa ${companyId} - na conexão ${whatsapp.name}!`);
        await Promise.all(ticketsToClose.map(async (ticket) => {
            await ticket.reload();
            const ticketTraking = await TicketTraking_1.default.findOne({
                where: { ticketId: ticket.id, finishedAt: null }
            });
            let bodyComplationMessage = "";
            if (!(0, lodash_1.isNil)(whatsapp.complationMessage) && whatsapp.complationMessage !== "") {
                bodyComplationMessage = (0, Mustache_1.default)(`\u200e${whatsapp.complationMessage}`, ticket);
                if (ticket.channel === "whatsapp_oficial") {
                    await (0, SendWhatsAppOficialMessage_1.default)({
                        body: bodyComplationMessage,
                        ticket: ticket,
                        quotedMsg: null,
                        type: 'text',
                        media: null,
                        vCard: null
                    });
                }
                else {
                    const sentMessage = await (0, SendWhatsAppMessage_1.default)({ body: bodyComplationMessage, ticket: ticket });
                    await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, ticket.contact);
                }
            }
            await closeTicket(ticket, bodyComplationMessage);
            await ticketTraking.update({
                finishedAt: (0, moment_1.default)().toDate(),
                closedAt: (0, moment_1.default)().toDate(),
                whatsappId: ticket.whatsappId,
                userId: ticket.userId,
            });
            (0, socket_1.getIO)().of(companyId.toString()).emit(`company-${companyId}-ticket`, {
                action: "delete",
                ticketId: ticket.id
            });
        }));
    }
};
const handleOpenPendingTickets = async (companyId, whatsapp) => {
    const currentTime = new Date();
    const brazilTimeZoneOffset = -3 * 60; // Fuso horário do Brasil é UTC-3
    const currentTimeBrazil = new Date(currentTime.getTime() + brazilTimeZoneOffset * 60000); // Adiciona o offset ao tempo atual
    let timeInactiveMessage = Number(whatsapp.timeInactiveMessage || 0);
    let expiresTime = Number(whatsapp.expiresTicket || 0);
    let flowInactiveTime = Number(whatsapp.flowInactiveTime || 0);
    if (!(0, lodash_1.isNil)(expiresTime) && expiresTime > 0) {
        if (!(0, lodash_1.isNil)(timeInactiveMessage) && timeInactiveMessage > 0) {
            let whereCondition1;
            whereCondition1 = {
                status: {
                    [Op.or]: ["open", "pending"]
                },
                companyId,
                whatsappId: whatsapp.id,
                updatedAt: {
                    [Op.lt]: +(0, date_fns_1.sub)(new Date(), {
                        minutes: Number(timeInactiveMessage)
                    })
                },
                imported: null,
                sendInactiveMessage: false
            };
            if (Number(whatsapp.whenExpiresTicket) === 1) {
                whereCondition1 = {
                    ...whereCondition1,
                    fromMe: true
                };
            }
            const ticketsForInactiveMessage = await Ticket_1.default.findAll({
                where: whereCondition1
            });
            if (ticketsForInactiveMessage && ticketsForInactiveMessage.length > 0) {
                logger_1.default.info(`Encontrou ${ticketsForInactiveMessage.length} atendimentos para enviar mensagem de inatividade na empresa ${companyId}- na conexão ${whatsapp.name}!`);
                await Promise.all(ticketsForInactiveMessage.map(async (ticket) => {
                    await ticket.reload();
                    if (!ticket.sendInactiveMessage) {
                        const bodyMessageInactive = (0, Mustache_1.default)(`\u200e ${whatsapp.inactiveMessage}`, ticket);
                        const sentMessage = await (0, SendWhatsAppMessage_1.default)({ body: bodyMessageInactive, ticket: ticket });
                        await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, ticket.contact);
                        await ticket.update({ sendInactiveMessage: true, fromMe: true });
                    }
                }));
            }
            expiresTime += timeInactiveMessage; // Adicionando o tempo de inatividade ao tempo de expiração
        }
        let whereCondition;
        whereCondition = {
            status: {
                [Op.or]: ["open", "pending"]
            },
            companyId,
            whatsappId: whatsapp.id,
            updatedAt: {
                [Op.lt]: +(0, date_fns_1.sub)(new Date(), {
                    minutes: Number(expiresTime)
                })
            },
            imported: null
        };
        if (timeInactiveMessage > 0) {
            whereCondition = {
                ...whereCondition,
                sendInactiveMessage: true,
            };
        }
        if (Number(whatsapp.whenExpiresTicket) === 1) {
            whereCondition = {
                ...whereCondition,
                fromMe: true
            };
        }
        const ticketsToClose = await Ticket_1.default.findAll({
            where: whereCondition
        });
        if (ticketsToClose && ticketsToClose.length > 0) {
            logger_1.default.info(`Encontrou ${ticketsToClose.length} atendimentos para encerrar na empresa ${companyId} - na conexão ${whatsapp.name}!`);
            for (const ticket of ticketsToClose) {
                await ticket.reload();
                const ticketTraking = await TicketTraking_1.default.findOne({
                    where: { ticketId: ticket.id, finishedAt: null }
                });
                let bodyExpiresMessageInactive = "";
                if (!(0, lodash_1.isNil)(whatsapp.expiresInactiveMessage) && whatsapp.expiresInactiveMessage !== "") {
                    bodyExpiresMessageInactive = (0, Mustache_1.default)(`\u200e${whatsapp.expiresInactiveMessage}`, ticket);
                    const sentMessage = await (0, SendWhatsAppMessage_1.default)({ body: bodyExpiresMessageInactive, ticket: ticket });
                    await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, ticket.contact);
                }
                // Como o campo sendInactiveMessage foi atualizado, podemos garantir que a mensagem foi enviada
                await closeTicket(ticket, bodyExpiresMessageInactive);
                await ticketTraking.update({
                    finishedAt: new Date(),
                    closedAt: new Date(),
                    whatsappId: ticket.whatsappId,
                    userId: ticket.userId,
                });
                // console.log("emitiu socket 144", ticket.id)
                const io = (0, socket_1.getIO)();
                io.of(companyId.toString()).emit(`company-${companyId}-ticket`, {
                    action: "delete",
                    ticketId: ticket.id
                });
            }
        }
    }
    if (!(0, lodash_1.isNil)(flowInactiveTime) && flowInactiveTime > 0) {
        let whereCondition1;
        whereCondition1 = {
            status: {
                [Op.or]: ["open", "pending"]
            },
            companyId,
            whatsappId: whatsapp.id,
            updatedAt: {
                [Op.lt]: +(0, date_fns_1.sub)(new Date(), {
                    minutes: Number(flowInactiveTime)
                })
            },
            imported: null,
            sendInactiveMessage: false
        };
        if (Number(whatsapp.whenExpiresTicket) === 1) {
            whereCondition1 = {
                ...whereCondition1,
                fromMe: true
            };
        }
        const ticketsForInactiveMessage = await Ticket_1.default.findAll({
            where: whereCondition1,
            include: [
                {
                    model: Contact_1.default,
                    attributes: ["number", "name", "email"]
                }
            ]
        });
        if (ticketsForInactiveMessage && ticketsForInactiveMessage.length > 0) {
            logger_1.default.info(`Encontrou ${ticketsForInactiveMessage.length} atendimentos para acionar o fluxo de inatividade na empresa ${companyId}- na conexão ${whatsapp.name}!`);
            await Promise.all(ticketsForInactiveMessage.map(async (ticket) => {
                await ticket.reload();
                if (!ticket.sendInactiveMessage) {
                    if (ticket.maxUseInactiveTime < whatsapp.maxUseInactiveTime) {
                        const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
                            where: {
                                id: whatsapp.flowIdInactiveTime
                            }
                        });
                        if (flow) {
                            const contact = ticket.contact;
                            const nodes = flow.flow["nodes"];
                            const connections = flow.flow["connections"];
                            const mountDataContact = {
                                number: contact.number,
                                name: contact.name,
                                email: contact.email
                            };
                            await (0, ActionsWebhookService_1.ActionsWebhookService)(whatsapp.id, whatsapp.flowIdInactiveTime, ticket.companyId, nodes, connections, flow.flow["nodes"][0].id, null, "", "", null, ticket.id, mountDataContact);
                            await ticket.update({
                                maxUseInactiveTime: ticket.maxUseInactiveTime ? ticket.maxUseInactiveTime + 1 : 1
                            });
                        }
                    }
                }
            }));
        }
        expiresTime += timeInactiveMessage; // Adicionando o tempo de inatividade ao tempo de expiração
    }
    ;
};
const handleReturnQueue = async (companyId, whatsapp) => {
    const timeToReturnQueue = Number(whatsapp.timeToReturnQueue || 0);
    const currentTime = new Date();
    const currentTimeBrazil = new Date(currentTime.getTime() + timeToReturnQueue * 60000);
    const ticketsToReturnQueue = await Ticket_1.default.findAll({
        where: {
            status: { [Op.or]: ["open", "group"] },
            companyId,
            whatsappId: whatsapp.id,
            userId: { [Op.not]: null },
            fromMe: Number(whatsapp.whenExpiresTicket) === 1 ? true : false,
            updatedAt: {
                [Op.lt]: +(0, date_fns_1.sub)(new Date(), {
                    minutes: Number(timeToReturnQueue)
                })
            },
            imported: null
        }
    });
    if (ticketsToReturnQueue && ticketsToReturnQueue.length > 0) {
        logger_1.default.info(`Encontrou ${ticketsToReturnQueue.length} atendimentos para retornar a fila na empresa ${companyId} - na conexão ${whatsapp.name}!`);
        await Promise.all(ticketsToReturnQueue.map(async (ticket) => {
            await ticket.update({
                status: "pending",
                userId: null,
            });
            await ticket.reload();
            await (0, CreateLogTicketService_1.default)({
                userId: ticket.userId || null,
                ticketId: ticket.id,
                type: "autoReturnQueue"
            });
            const ticketSocket = await (0, ShowTicketFromUUIDService_1.default)(ticket.uuid, companyId);
            const io = (0, socket_1.getIO)();
            io.of(companyId.toString()).emit(`company-${companyId}-ticket`, {
                action: "delete",
                ticketId: ticketSocket.id
            });
            io.of(companyId.toString()).emit(`company-${companyId}-ticket`, {
                action: "update",
                ticket: ticketSocket,
                ticketId: ticketSocket.id
            });
        }));
    }
};
// const handleAwaitActiveFlow = async (companyId: number, whatsapp: Whatsapp) => {
//   const timeAwaitActiveFlow = Number(whatsapp.timeAwaitActiveFlow || 0);
//   const currentTime = new Date();
//   const currentTimeBrazil = new Date(currentTime.getTime() + timeAwaitActiveFlow * 60000);
//   const ticketsToAwaitActiveFlow = await Ticket.findAll({
//     where: {
//       status: "open",
//       companyId,
//       whatsappId: whatsapp.id,
//       updatedAt: {
//         [Op.lt]: +sub(new Date(), {
//           minutes: Number(timeAwaitActiveFlow)
//         })
//       },
//       imported: null
//     },
//     include: [
//       {
//         model: Contact,
//         attributes: ["number", "name", "email"],
//         as: "contact"
//       }
//     ]
//   });
//   if (ticketsToAwaitActiveFlow && ticketsToAwaitActiveFlow.length > 0) {
//     logger.info(`Encontrou ${ticketsToAwaitActiveFlow.length} atendimentos para aguardar ativação do fluxo na empresa ${companyId} - na conexão ${whatsapp.name}!`);
//     await Promise.all(ticketsToAwaitActiveFlow.map(async ticket => {
//       const flow = await FlowBuilderModel.findOne({
//         where: {
//           id: whatsapp.timeAwaitActiveFlowId
//         }
//       });
//       if (flow) {
//         const contact = ticket.contact;
//         const nodes: INodes[] = flow.flow["nodes"];
//         const connections: IConnections[] = flow.flow["connections"];
//         const mountDataContact = {
//           number: contact.number,
//           name: contact.name,
//           email: contact.email
//         };
//         await ActionsWebhookService(
//           whatsapp.id,
//           whatsapp.timeAwaitActiveFlowId,
//           ticket.companyId,
//           nodes,
//           connections,
//           flow.flow["nodes"][0].id,
//           null,
//           "",
//           "",
//           null,
//           ticket.id,
//           mountDataContact
//         );
//         await ticket.update({
//           maxUseInactiveTime: ticket.maxUseInactiveTime ? ticket.maxUseInactiveTime + 1 : 1
//         });
//         await ticket.reload();
//         const io = getIO();
//         io.of(companyId.toString()).emit(`company-${companyId}-ticket`, {
//           action: "update",
//           ticket: ticket,
//           ticketId: ticket.id
//         });
//       }
//     }));
//   }
// };
const ClosedAllOpenTickets = async (companyId) => {
    try {
        const whatsapps = await Whatsapp_1.default.findAll({
            attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue", "timeInactiveMessage",
                "expiresInactiveMessage", "inactiveMessage", "expiresTicket", "expiresTicketNPS", "whenExpiresTicket",
                "complationMessage", "flowInactiveTime", "flowIdInactiveTime", "maxUseInactiveTime", "timeToReturnQueue", "timeAwaitActiveFlowId", "timeAwaitActiveFlow"],
            where: {
                [Op.or]: [
                    { expiresTicket: { [Op.gt]: '0' } },
                    { expiresTicketNPS: { [Op.gt]: '0' } },
                    { flowInactiveTime: { [Op.gt]: '0' } },
                    { timeToReturnQueue: { [Op.gt]: '0' } },
                    { timeAwaitActiveFlow: { [Op.gt]: '0' } }
                ],
                companyId: companyId,
                status: "CONNECTED"
            }
        });
        // Agora você pode iterar sobre as instâncias de Whatsapp diretamente
        if (whatsapps.length > 0) {
            for (const whatsapp of whatsapps) {
                if (whatsapp.expiresTicket) {
                    await handleOpenTickets(companyId, whatsapp);
                }
                if (whatsapp.expiresTicketNPS) {
                    await handleNPSTickets(companyId, whatsapp);
                }
                if (whatsapp.flowInactiveTime) {
                    await handleOpenPendingTickets(companyId, whatsapp);
                }
                if (whatsapp.timeToReturnQueue) {
                    await handleReturnQueue(companyId, whatsapp);
                }
                // if (whatsapp.timeAwaitActiveFlowId && whatsapp.timeAwaitActiveFlow > 0) {
                //   await handleAwaitActiveFlow(companyId, whatsapp);
                // }
            }
        }
    }
    catch (error) {
        console.error('Erro:', error);
    }
};
exports.ClosedAllOpenTickets = ClosedAllOpenTickets;
