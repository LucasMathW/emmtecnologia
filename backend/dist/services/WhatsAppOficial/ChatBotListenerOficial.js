"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sayChatbotOficial = exports.deleteAndCreateDialogStageOficial = void 0;
const path_1 = __importDefault(require("path"));
const wbotMessageListener_1 = require("../WbotServices/wbotMessageListener");
const ShowDialogChatBotsServices_1 = __importDefault(require("../DialogChatBotsServices/ShowDialogChatBotsServices"));
const ShowQueueService_1 = __importDefault(require("../QueueService/ShowQueueService"));
const ShowChatBotServices_1 = __importDefault(require("../ChatBotServices/ShowChatBotServices"));
const DeleteDialogChatBotsServices_1 = __importDefault(require("../DialogChatBotsServices/DeleteDialogChatBotsServices"));
const ShowChatBotByChatbotIdServices_1 = __importDefault(require("../ChatBotServices/ShowChatBotByChatbotIdServices"));
const CreateDialogChatBotsServices_1 = __importDefault(require("../DialogChatBotsServices/CreateDialogChatBotsServices"));
const ShowWhatsAppService_1 = __importDefault(require("../WhatsappService/ShowWhatsAppService"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const UpdateTicketService_1 = __importDefault(require("../TicketServices/UpdateTicketService"));
const ShowService_1 = __importDefault(require("../../services/FileServices/ShowService"));
const lodash_1 = require("lodash");
const moment_1 = __importDefault(require("moment"));
const SendWhatsAppOficialMessage_1 = __importDefault(require("./SendWhatsAppOficialMessage"));
const CompaniesSettings_1 = __importDefault(require("../../models/CompaniesSettings"));
const CreateLogTicketService_1 = __importDefault(require("../TicketServices/CreateLogTicketService"));
const debug_1 = require("../../config/debug");
const logger_1 = __importDefault(require("../../utils/logger"));
const SendWhatsAppMedia_1 = require("../WbotServices/SendWhatsAppMedia");
const fs = require("fs");
const isNumeric = (value) => /^-?\d+$/.test(value);
const deleteAndCreateDialogStageOficial = async (contact, chatbotId, ticket) => {
    try {
        await (0, DeleteDialogChatBotsServices_1.default)(contact.id);
        const bots = await (0, ShowChatBotByChatbotIdServices_1.default)(chatbotId);
        if (!bots) {
            await ticket.update({ isBot: false });
        }
        return await (0, CreateDialogChatBotsServices_1.default)({
            awaiting: 1,
            contactId: contact.id,
            chatbotId,
            queueId: bots.queueId
        });
    }
    catch (error) {
        await ticket.update({ isBot: false });
    }
};
exports.deleteAndCreateDialogStageOficial = deleteAndCreateDialogStageOficial;
const sendMessageOficial = async (contact, ticket, body) => {
    if (debug_1.ENABLE_LID_DEBUG) {
        logger_1.default.info(`[RDS-LID] ChatBot Oficial - Enviando mensagem: ${body}`);
        logger_1.default.info(`[RDS-LID] ChatBot Oficial - Contact lid: ${contact.lid}`);
        logger_1.default.info(`[RDS-LID] ChatBot Oficial - Contact remoteJid: ${contact.remoteJid}`);
    }
    try {
        await (0, SendWhatsAppOficialMessage_1.default)({
            body: (0, Mustache_1.default)(body, ticket),
            ticket,
            type: 'text',
            media: null,
            vCard: null
        });
    }
    catch (error) {
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.error(`[RDS-LID] ChatBot Oficial - Erro ao enviar mensagem: ${error.message}`);
        }
        throw error;
    }
};
// const sendMessageLinkOficial = async (
//   contact: Contact,
//   ticket: Ticket,
//   url: string,
//   caption: string
// ) => {
//   try {
//     await SendWhatsAppOficialMessage({
//       body: caption,
//       ticket,
//       type: 'document',
//       media: { url },
//       vCard: null
//     });
//   } catch (error) {
//     await SendWhatsAppOficialMessage({
//       body: formatBody(
//         "\u200eNão consegui enviar o PDF, tente novamente!",
//         ticket
//       ),
//       ticket,
//       type: 'text',
//       media: null,
//       vCard: null
//     });
//   }
// };
// const sendMessageImageOficial = async (
//   contact: Contact,
//   ticket: Ticket,
//   url: string,
//   caption: string
// ) => {
//   try {
//     await SendWhatsAppOficialMessage({
//       body: caption,
//       ticket,
//       type: 'image',
//       media: { url },
//       vCard: null
//     });
//   } catch (error) {
//     await SendWhatsAppOficialMessage({
//       body: formatBody("Não consegui enviar a imagem, tente novamente!", ticket),
//       ticket,
//       type: 'text',
//       media: null,
//       vCard: null
//     });
//   }
// };
const sendDialogOficial = async (choosenQueue, contact, ticket) => {
    if (debug_1.ENABLE_LID_DEBUG) {
        logger_1.default.info(`[RDS-LID] ChatBot Oficial - sendDialogOficial iniciado para: ${choosenQueue.name}`);
    }
    const showChatBots = await (0, ShowChatBotServices_1.default)(choosenQueue.id);
    if (showChatBots.options) {
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] ChatBot Oficial - Opções encontradas: ${showChatBots.options.length}`);
        }
        let companyId = ticket.companyId;
        const buttonActive = await CompaniesSettings_1.default.findOne({
            where: { companyId }
        });
        const typeBot = buttonActive?.chatBotType || "text";
        const botText = async () => {
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] ChatBot Oficial - botText executado`);
            }
            let options = "";
            showChatBots.options.forEach((option, index) => {
                options += `*[ ${index + 1} ]* - ${option.name}\n`;
            });
            const optionsBack = options.length > 0
                ? `${options}\n*[ # ]* Voltar para o menu principal\n*[ Sair ]* Encerrar atendimento`
                : `${options}\n*[ Sair ]* Encerrar atendimento`;
            if (options.length > 0) {
                const body = (0, Mustache_1.default)(`\u200e ${choosenQueue.greetingMessage}\n\n${optionsBack}`, ticket);
                if (debug_1.ENABLE_LID_DEBUG) {
                    logger_1.default.info(`[RDS-LID] ChatBot Oficial - Enviando mensagem com opções: ${body}`);
                }
                const sendOption = await sendMessageOficial(contact, ticket, body);
                return sendOption;
            }
            const body = (0, Mustache_1.default)(`\u200e ${choosenQueue.greetingMessage}`, ticket);
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] ChatBot Oficial - Enviando mensagem simples: ${body}`);
            }
            const send = await sendMessageOficial(contact, ticket, body);
            return send;
        };
        const botButton = async () => {
            const buttons = [];
            showChatBots.options.forEach((option, index) => {
                buttons.push({
                    buttonId: `${index + 1}`,
                    buttonText: { displayText: option.name },
                    type: 1
                });
            });
            if (buttons.length > 0) {
                const buttonMessage = {
                    text: `\u200e${choosenQueue.greetingMessage}`,
                    buttons,
                    headerType: 1
                };
                await (0, SendWhatsAppOficialMessage_1.default)({
                    body: buttonMessage.text,
                    ticket,
                    type: 'interactive',
                    media: null,
                    vCard: null,
                    interative: buttonMessage
                });
                return buttonMessage;
            }
            const body = `\u200e${choosenQueue.greetingMessage}`;
            const send = await sendMessageOficial(contact, ticket, body);
            return send;
        };
        const botList = async () => {
            const sectionsRows = [];
            showChatBots.options.forEach((queue, index) => {
                sectionsRows.push({
                    title: queue.name,
                    rowId: `${index + 1}`
                });
            });
            if (sectionsRows.length > 0) {
                const sections = [
                    {
                        title: "Menu",
                        rows: sectionsRows
                    }
                ];
                const listMessage = {
                    text: (0, Mustache_1.default)(`\u200e${choosenQueue.greetingMessage}`, ticket),
                    buttonText: "Escolha uma opção",
                    sections
                };
                await (0, SendWhatsAppOficialMessage_1.default)({
                    body: listMessage.text,
                    ticket,
                    type: 'interactive',
                    media: null,
                    vCard: null,
                    interative: listMessage
                });
                return listMessage;
            }
            const body = `\u200e${choosenQueue.greetingMessage}`;
            const send = await sendMessageOficial(contact, ticket, body);
            return send;
        };
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] ChatBot Oficial - Tipo de bot: ${typeBot}, Opções: ${showChatBots.options.length}`);
        }
        if (typeBot === "text") {
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] ChatBot Oficial - Executando botText`);
            }
            const result = await botText();
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] ChatBot Oficial - botText concluído`);
            }
            return result;
        }
        if (typeBot === "button" && showChatBots.options.length > 4) {
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] ChatBot Oficial - Executando botText (muitas opções)`);
            }
            return await botText();
        }
        if (typeBot === "button" && showChatBots.options.length <= 4) {
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] ChatBot Oficial - Executando botButton`);
            }
            return await botButton();
        }
        if (typeBot === "list") {
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] ChatBot Oficial - Executando botList`);
            }
            return await botList();
        }
    }
};
const backToMainMenuOficial = async (contact, ticket, ticketTraking) => {
    await (0, UpdateTicketService_1.default)({
        ticketData: { queueId: null, userId: null },
        ticketId: ticket.id,
        companyId: ticket.companyId
    });
    const { queues, greetingMessage, greetingMediaAttachment } = await (0, ShowWhatsAppService_1.default)(ticket.whatsappId, ticket.companyId);
    const buttonActive = await CompaniesSettings_1.default.findOne({
        where: {
            companyId: ticket.companyId
        }
    });
    const botText = async () => {
        let options = "";
        queues.forEach((option, index) => {
            options += `*[ ${index + 1} ]* - ${option.name}\n`;
        });
        options += `\n*[ Sair ]* - Encerrar Atendimento`;
        const body = (0, Mustache_1.default)(`\u200e ${greetingMessage}\n\n${options}`, ticket);
        if (greetingMediaAttachment !== null) {
            const filePath = path_1.default.resolve("public", `company${ticket.companyId}`, ticket.whatsapp.greetingMediaAttachment);
            const messagePath = ticket.whatsapp.greetingMediaAttachment;
            const optionsMsg = await (0, SendWhatsAppMedia_1.getMessageOptions)(messagePath, filePath, String(ticket.companyId), body);
            await (0, SendWhatsAppOficialMessage_1.default)({
                body,
                ticket,
                type: optionsMsg.mimetype?.includes('image') ? 'image' :
                    optionsMsg.mimetype?.includes('video') ? 'video' :
                        optionsMsg.mimetype?.includes('audio') ? 'audio' : 'document',
                media: optionsMsg,
                vCard: null
            });
        }
        else {
            await (0, SendWhatsAppOficialMessage_1.default)({
                body,
                ticket,
                type: 'text',
                media: null,
                vCard: null
            });
        }
        const deleteDialog = await (0, DeleteDialogChatBotsServices_1.default)(contact.id);
        return deleteDialog;
    };
    if (buttonActive.chatBotType === "text") {
        return botText();
    }
};
async function sendMsgAndCloseTicketOficial(contact, ticket) {
    const ticketUpdateAgent = {
        ticketData: {
            status: "closed",
            userId: ticket?.userId || null,
            sendFarewellMessage: false,
            amountUsedBotQueues: 0
        },
        ticketId: ticket.id,
        companyId: ticket.companyId
    };
    await new Promise(resolve => setTimeout(resolve, 2000));
    await (0, UpdateTicketService_1.default)(ticketUpdateAgent);
}
const sayChatbotOficial = async (queueId, ticket, contact, msg, ticketTraking) => {
    // ✅ VERIFICAÇÃO PREVENTIVA: Não processar se ticket estiver "open" (aceito por atendente)
    if (ticket.status === "open") {
        console.log(`[CHATBOT OFICIAL] Ticket ${ticket.id} está "open" - ChatBot não deve processar`);
        return;
    }
    // ✅ CORREÇÃO: Extrair selectedOption corretamente para API oficial
    const selectedOption = msg?.message?.buttonsResponseMessage?.selectedButtonId ||
        msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
        msg?.message?.conversation ||
        (0, wbotMessageListener_1.getBodyMessage)(msg);
    if (debug_1.ENABLE_LID_DEBUG) {
        logger_1.default.info(`[RDS-LID] ChatBot Oficial - sayChatbotOficial iniciado`);
        logger_1.default.info(`[RDS-LID] ChatBot Oficial - selectedOption: ${selectedOption}`);
        logger_1.default.info(`[RDS-LID] ChatBot Oficial - queueId: ${queueId}`);
        logger_1.default.info(`[RDS-LID] ChatBot Oficial - msg.key.fromMe: ${msg.key.fromMe}`);
    }
    if (!queueId && selectedOption && msg.key.fromMe)
        return;
    // ✅ VERIFICAÇÃO ADICIONAL: SÓ PROCESSAR SE HOUVER UMA OPÇÃO VÁLIDA
    if (!selectedOption || selectedOption.trim() === "") {
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] ChatBot Oficial - Nenhuma opção selecionada, saindo`);
        }
        return;
    }
    const getStageBot = await (0, ShowDialogChatBotsServices_1.default)(contact.id);
    if (debug_1.ENABLE_LID_DEBUG) {
        logger_1.default.info(`[RDS-LID] ChatBot Oficial - getStageBot: ${JSON.stringify(getStageBot)}`);
        logger_1.default.info(`[RDS-LID] ChatBot Oficial - contact.id: ${contact.id}`);
    }
    if (String(selectedOption).toLocaleLowerCase() === "sair") {
        // Enviar mensagem de conclusão primeiro para aparecer no frontend
        const complationMessage = ticket.whatsapp?.complationMessage;
        if (!(0, lodash_1.isNil)(complationMessage)) {
            const textMessage = { text: (0, Mustache_1.default)(`\u200e${complationMessage}`, ticket) };
            await (0, SendWhatsAppOficialMessage_1.default)({
                body: textMessage.text,
                ticket,
                type: 'text',
                media: null,
                vCard: null
            });
        }
        // Fechar ticket de forma centralizada e emitir sockets
        const ticketUpdateAgent = {
            ticketData: {
                status: "closed",
                userId: ticket?.userId || null,
                // já enviamos a mensagem de conclusão acima
                sendFarewellMessage: false,
                amountUsedBotQueues: 0
            },
            ticketId: ticket.id,
            companyId: ticket.companyId
        };
        await (0, UpdateTicketService_1.default)(ticketUpdateAgent);
        await ticketTraking.update({
            userId: ticket.userId,
            closedAt: (0, moment_1.default)().toDate(),
            finishedAt: (0, moment_1.default)().toDate()
        });
        await (0, CreateLogTicketService_1.default)({
            ticketId: ticket.id,
            type: "clientClosed",
            queueId: ticket.queueId
        });
        // Limpar diálogos do bot para evitar loops
        try {
            await (0, DeleteDialogChatBotsServices_1.default)(contact.id);
        }
        catch (error) {
            console.error("Erro ao deletar dialogs", error);
        }
        return;
    }
    if (selectedOption === "#") {
        const backTo = await backToMainMenuOficial(contact, ticket, ticketTraking);
        return;
    }
    if (!getStageBot) {
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] ChatBot Oficial - Entrando na lógica de !getStageBot`);
        }
        const queue = await (0, ShowQueueService_1.default)(queueId, ticket.companyId);
        const selectedOptions = msg?.message?.buttonsResponseMessage?.selectedButtonId ||
            msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
            (0, wbotMessageListener_1.getBodyMessage)(msg);
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] ChatBot Oficial - selectedOptions: ${selectedOptions}`);
            logger_1.default.info(`[RDS-LID] ChatBot Oficial - queue.chatbots.length: ${queue.chatbots.length}`);
        }
        const choosenQueue = queue.chatbots[+selectedOptions - 1];
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] ChatBot Oficial - choosenQueue: ${choosenQueue?.name}, queueType: ${choosenQueue?.queueType}`);
        }
        if (choosenQueue) {
            if (choosenQueue.queueType === "integration") {
                try {
                    await ticket.update({
                        integrationId: choosenQueue.optIntegrationId,
                        useIntegration: true,
                        status: "pending",
                        queueId: null
                    });
                    if (debug_1.ENABLE_LID_DEBUG) {
                        logger_1.default.info(`[RDS-LID] ChatBot Oficial - Integração configurada: ${choosenQueue.optIntegrationId}`);
                    }
                }
                catch (error) {
                    if (debug_1.ENABLE_LID_DEBUG) {
                        logger_1.default.error(`[RDS-LID] ChatBot Oficial - Erro ao configurar integração: ${error.message}`);
                    }
                    await (0, exports.deleteAndCreateDialogStageOficial)(contact, choosenQueue.id, ticket);
                }
            }
            else if (choosenQueue.queueType === "queue") {
                try {
                    const ticketUpdateAgent = {
                        ticketData: {
                            queueId: choosenQueue.optQueueId,
                            status: "pending"
                        },
                        ticketId: ticket.id
                    };
                    await (0, UpdateTicketService_1.default)({
                        ticketData: {
                            ...ticketUpdateAgent.ticketData
                        },
                        ticketId: ticketUpdateAgent.ticketId,
                        companyId: ticket.companyId
                    });
                }
                catch (error) {
                    await (0, exports.deleteAndCreateDialogStageOficial)(contact, choosenQueue.id, ticket);
                }
            }
            else if (choosenQueue.queueType === "attendent") {
                try {
                    const ticketUpdateAgent = {
                        ticketData: {
                            queueId: choosenQueue.optQueueId,
                            userId: choosenQueue.optUserId,
                            status: "pending"
                        },
                        ticketId: ticket.id
                    };
                    await (0, UpdateTicketService_1.default)({
                        ticketData: {
                            ...ticketUpdateAgent.ticketData
                        },
                        ticketId: ticketUpdateAgent.ticketId,
                        companyId: ticket.companyId
                    });
                }
                catch (error) {
                    await (0, exports.deleteAndCreateDialogStageOficial)(contact, choosenQueue.id, ticket);
                }
            }
            await (0, exports.deleteAndCreateDialogStageOficial)(contact, choosenQueue.id, ticket);
            // ✅ SEMPRE ENVIAR MENSAGEM DA SUBFILA (igual ao ChatBotListener original)
            let send;
            if (choosenQueue?.greetingMessage) {
                if (debug_1.ENABLE_LID_DEBUG) {
                    logger_1.default.info(`[RDS-LID] ChatBot Oficial - Enviando mensagem da subfila: ${choosenQueue.name}`);
                    logger_1.default.info(`[RDS-LID] ChatBot Oficial - Mensagem: ${choosenQueue.greetingMessage}`);
                }
                send = await sendDialogOficial(choosenQueue, contact, ticket);
            }
            if (choosenQueue.queueType === "file") {
                try {
                    const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public");
                    const files = await (0, ShowService_1.default)(choosenQueue.optFileId, ticket.companyId);
                    const folder = path_1.default.resolve(publicFolder, `company${ticket.companyId}`, "fileList", String(files.id));
                    for (const [index, file] of files.options.entries()) {
                        const mediaSrc = {
                            fieldname: "medias",
                            originalname: path_1.default.basename(file.path),
                            encoding: "7bit",
                            mimetype: file.mediaType,
                            filename: file.path,
                            path: path_1.default.resolve(folder, file.path)
                        };
                        await (0, SendWhatsAppOficialMessage_1.default)({
                            media: mediaSrc,
                            body: file.name,
                            ticket,
                            type: null
                        });
                    }
                }
                catch (error) {
                    await (0, exports.deleteAndCreateDialogStageOficial)(contact, choosenQueue.id, ticket);
                }
            }
            if (choosenQueue.queueType === "text" && choosenQueue.greetingMessage) {
                send = await sendDialogOficial(choosenQueue, contact, ticket);
            }
            if (choosenQueue.closeTicket) {
                await sendMsgAndCloseTicketOficial(ticket.contact, ticket);
            }
            return send;
        }
    }
    if (getStageBot) {
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] ChatBot Oficial - getStageBot encontrado: ${getStageBot.chatbotId}`);
        }
        const selected = isNumeric(selectedOption) ? selectedOption : 0;
        const bots = await (0, ShowChatBotServices_1.default)(getStageBot.chatbotId);
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] ChatBot Oficial - selected: ${selected}, bots.options.length: ${bots.options.length}`);
        }
        if (selected === 0 || +selected > bots.options.length) {
            const body = "\u200eOpção inválida! Digite um número válido para continuar!";
            await new Promise(resolve => setTimeout(resolve, 2000));
            await sendMessageOficial(ticket.contact, ticket, body);
            return;
        }
        const choosenQueue = bots.options[+selected - 1]
            ? bots.options[+selected - 1]
            : bots.options[0];
        if (debug_1.ENABLE_LID_DEBUG) {
            logger_1.default.info(`[RDS-LID] ChatBot Oficial - choosenQueue: ${choosenQueue?.name}, queueType: ${choosenQueue?.queueType}`);
        }
        if (!choosenQueue.greetingMessage) {
            await (0, DeleteDialogChatBotsServices_1.default)(contact.id);
            return;
        }
        if (choosenQueue) {
            // ✅ REGRA PRINCIPAL: choosenQueue.queueType === "integration"
            if (choosenQueue.queueType === "integration") {
                try {
                    const ticketUpdateAgent = {
                        ticketData: {
                            integrationId: choosenQueue.optIntegrationId,
                            useIntegration: true,
                            status: "pending"
                        },
                        ticketId: ticket.id
                    };
                    await (0, UpdateTicketService_1.default)({
                        ticketData: {
                            ...ticketUpdateAgent.ticketData
                        },
                        ticketId: ticketUpdateAgent.ticketId,
                        companyId: ticket.companyId
                    });
                    if (debug_1.ENABLE_LID_DEBUG) {
                        logger_1.default.info(`[RDS-LID] ChatBot Oficial - Integração configurada no estágio: ${choosenQueue.optIntegrationId}`);
                    }
                }
                catch (error) {
                    if (debug_1.ENABLE_LID_DEBUG) {
                        logger_1.default.error(`[RDS-LID] ChatBot Oficial - Erro ao configurar integração no estágio: ${error.message}`);
                    }
                    await (0, exports.deleteAndCreateDialogStageOficial)(contact, choosenQueue.id, ticket);
                }
            }
            else if (choosenQueue.queueType === "queue") {
                try {
                    const ticketUpdateAgent = {
                        ticketData: {
                            queueId: choosenQueue.optQueueId,
                            status: "pending"
                        },
                        ticketId: ticket.id
                    };
                    await (0, UpdateTicketService_1.default)({
                        ticketData: {
                            ...ticketUpdateAgent.ticketData
                        },
                        ticketId: ticketUpdateAgent.ticketId,
                        companyId: ticket.companyId
                    });
                }
                catch (error) {
                    await (0, exports.deleteAndCreateDialogStageOficial)(contact, choosenQueue.id, ticket);
                }
            }
            else if (choosenQueue.queueType === "attendent") {
                try {
                    const ticketUpdateAgent = {
                        ticketData: {
                            queueId: choosenQueue.optQueueId,
                            userId: choosenQueue.optUserId,
                            status: "pending"
                        },
                        ticketId: ticket.id
                    };
                    await (0, UpdateTicketService_1.default)({
                        ticketData: {
                            ...ticketUpdateAgent.ticketData
                        },
                        ticketId: ticketUpdateAgent.ticketId,
                        companyId: ticket.companyId
                    });
                }
                catch (error) {
                    await (0, exports.deleteAndCreateDialogStageOficial)(contact, choosenQueue.id, ticket);
                }
            }
            await (0, exports.deleteAndCreateDialogStageOficial)(contact, choosenQueue.id, ticket);
            if (choosenQueue.queueType === "file") {
                try {
                    const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public");
                    const files = await (0, ShowService_1.default)(choosenQueue.optFileId, ticket.companyId);
                    const folder = path_1.default.resolve(publicFolder, `company${ticket.companyId}`, "fileList", String(files.id));
                    for (const [index, file] of files.options.entries()) {
                        const mediaSrc = {
                            fieldname: "medias",
                            originalname: path_1.default.basename(file.path),
                            encoding: "7bit",
                            mimetype: file.mediaType,
                            filename: file.path,
                            path: path_1.default.resolve(folder, file.path)
                        };
                        await (0, SendWhatsAppOficialMessage_1.default)({
                            media: mediaSrc,
                            body: file.name,
                            ticket,
                            type: null
                        });
                    }
                }
                catch (error) {
                    await (0, exports.deleteAndCreateDialogStageOficial)(contact, choosenQueue.id, ticket);
                }
            }
            if (choosenQueue.closeTicket) {
                await sendMsgAndCloseTicketOficial(ticket.contact, ticket);
            }
            // ✅ SEMPRE ENVIAR RESPOSTA DO SUBMENU (igual ao ChatBotListener original)
            await (0, exports.deleteAndCreateDialogStageOficial)(contact, choosenQueue.id, ticket);
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[RDS-LID] ChatBot Oficial - Enviando submenu para: ${choosenQueue.name}`);
                logger_1.default.info(`[RDS-LID] ChatBot Oficial - Mensagem: ${choosenQueue.greetingMessage}`);
            }
            const send = await sendDialogOficial(choosenQueue, contact, ticket);
            return send;
        }
        else {
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.warn(`[RDS-LID] ChatBot Oficial - getStageBot não encontrado para contact: ${contact.id}`);
            }
        }
    }
};
exports.sayChatbotOficial = sayChatbotOficial;
