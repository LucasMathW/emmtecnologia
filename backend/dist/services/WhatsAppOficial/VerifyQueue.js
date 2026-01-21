"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const ShowWhatsAppService_1 = __importDefault(require("../WhatsappService/ShowWhatsAppService"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const lodash_1 = require("lodash");
const SendWhatsAppOficialMessage_1 = __importDefault(require("./SendWhatsAppOficialMessage"));
const SendWhatsAppMedia_1 = require("../WbotServices/SendWhatsAppMedia");
const ShowService_1 = __importDefault(require("../FileServices/ShowService"));
const logger_1 = __importDefault(require("../../utils/logger"));
const UpdateTicketService_1 = __importDefault(require("../TicketServices/UpdateTicketService"));
const ListUserQueueServices_1 = __importDefault(require("../UserQueueServices/ListUserQueueServices"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const VerifyCurrentSchedule_1 = __importDefault(require("../CompanyService/VerifyCurrentSchedule"));
const CreateLogTicketService_1 = __importDefault(require("../TicketServices/CreateLogTicketService"));
const moment_1 = __importDefault(require("moment"));
const DeleteDialogChatBotsServices_1 = __importDefault(require("../DialogChatBotsServices/DeleteDialogChatBotsServices"));
const ShowQueueIntegrationService_1 = __importDefault(require("../QueueIntegrationServices/ShowQueueIntegrationService"));
const typebotListenerOficial_1 = __importDefault(require("../TypebotServices/typebotListenerOficial"));
const wbotMessageListener_1 = require("../WbotServices/wbotMessageListener");
const verifyQueueOficial = async (msg, ticket, settings, ticketTraking, fromMe) => {
    const companyId = ticket.companyId;
    // console.log("GETTING WHATSAPP VERIFY QUEUE", ticket.whatsappId, wbot.id)
    const { queues, greetingMessage, maxUseBotQueues, timeUseBotQueues } = await (0, ShowWhatsAppService_1.default)(ticket.whatsappId, companyId);
    let chatbot = false;
    if (queues.length === 1) {
        chatbot = queues[0]?.chatbots.length > 1;
    }
    const enableQueuePosition = settings.sendQueuePosition === "enabled";
    if (queues.length === 1 && !chatbot) {
        const sendGreetingMessageOneQueues = settings.sendGreetingMessageOneQueues === "enabled" || false;
        if (greetingMessage.length > 1 && sendGreetingMessageOneQueues) {
            const body = (0, Mustache_1.default)(`${greetingMessage}`, ticket);
            if (ticket.whatsapp.greetingMediaAttachment !== null) {
                const filePath = path_1.default.resolve("public", `company${companyId}`, ticket.whatsapp.greetingMediaAttachment);
                const fileExists = fs_1.default.existsSync(filePath);
                if (fileExists) {
                    const messagePath = ticket.whatsapp.greetingMediaAttachment;
                    const media = await (0, SendWhatsAppMedia_1.getMessageOptions)(messagePath, filePath, String(companyId), body);
                    await (0, SendWhatsAppOficialMessage_1.default)({
                        media, body, ticket, type: null
                    });
                }
                else {
                    await (0, SendWhatsAppOficialMessage_1.default)({
                        body, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                    });
                }
            }
            else {
                await (0, SendWhatsAppOficialMessage_1.default)({
                    body, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                });
            }
        }
        if (!(0, lodash_1.isNil)(queues[0].fileListId)) {
            try {
                const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public");
                const files = await (0, ShowService_1.default)(queues[0].fileListId, ticket.companyId);
                const folder = path_1.default.resolve(publicFolder, `company${ticket.companyId}`, "fileList", String(files.id));
                const destinationFolder = path_1.default.resolve(publicFolder, `company${ticket.companyId}`);
                if (!fs_1.default.existsSync(destinationFolder)) {
                    fs_1.default.mkdirSync(destinationFolder, { recursive: true });
                }
                try {
                    if (fs_1.default.existsSync(folder)) {
                        const filesInFolder = fs_1.default.readdirSync(folder);
                        for (const file of filesInFolder) {
                            const sourcePath = path_1.default.resolve(folder, file);
                            const destPath = path_1.default.resolve(destinationFolder, file);
                            if (fs_1.default.statSync(sourcePath).isFile()) {
                                fs_1.default.copyFileSync(sourcePath, destPath);
                            }
                        }
                    }
                    else {
                        logger_1.default.info(`Pasta de origem ${folder} não encontrada`);
                    }
                }
                catch (err) {
                    logger_1.default.error(`Erro ao copiar arquivos: ${err}`);
                }
                for (const [index, file] of files.options.entries()) {
                    const mediaSrc = {
                        fieldname: 'medias',
                        originalname: path_1.default.basename(file.path),
                        encoding: '7bit',
                        mimetype: file.mediaType,
                        filename: file.path,
                        path: path_1.default.resolve(folder, file.path),
                    };
                    await (0, SendWhatsAppOficialMessage_1.default)({
                        media: mediaSrc, body: file.name, ticket, type: null
                    });
                }
                ;
            }
            catch (error) {
                logger_1.default.info(error);
            }
        }
        if (queues[0].closeTicket) {
            await (0, UpdateTicketService_1.default)({
                ticketData: {
                    status: "closed",
                    queueId: queues[0].id,
                    sendFarewellMessage: false
                },
                ticketId: ticket.id,
                companyId
            });
            return;
        }
        else {
            await (0, UpdateTicketService_1.default)({
                ticketData: { queueId: queues[0].id, status: ticket.status === "lgpd" ? "pending" : ticket.status },
                ticketId: ticket.id,
                companyId
            });
        }
        const count = await Ticket_1.default.findAndCountAll({
            where: {
                userId: null,
                status: "pending",
                companyId,
                queueId: queues[0].id,
                isGroup: false
            }
        });
        if (enableQueuePosition) {
            // Lógica para enviar posição da fila de atendimento
            const qtd = count.count === 0 ? 1 : count.count;
            const msgFila = `${settings.sendQueuePositionMessage} *${qtd}*`;
            const bodyFila = (0, Mustache_1.default)(`${msgFila}`, ticket);
            await (0, SendWhatsAppOficialMessage_1.default)({
                body: bodyFila, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
            });
        }
        return;
    }
    // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
    if (ticket.contact.disableBot) {
        return;
    }
    let selectedOption = "";
    if (ticket.status !== "lgpd") {
        selectedOption = msg.text;
    }
    else {
        if (!(0, lodash_1.isNil)(ticket.lgpdAcceptedAt))
            await ticket.update({
                status: "pending"
            });
        await ticket.reload();
    }
    if (String(selectedOption).toLocaleLowerCase() === "sair") {
        const { complationMessage } = await (0, ShowWhatsAppService_1.default)(ticket.whatsappId, companyId);
        // Enviar mensagem de conclusão antes de fechar o ticket para garantir exibição no frontend
        if (complationMessage) {
            await (0, SendWhatsAppOficialMessage_1.default)({
                body: complationMessage,
                ticket,
                type: 'text',
                media: null,
                vCard: null
            });
        }
        const ticketData = {
            isBot: false,
            status: "closed",
            // Já enviamos a mensagem de conclusão acima; evitar duplicidade pelo UpdateTicketService
            sendFarewellMessage: false,
            amountUsedBotQueues: 0
        };
        await (0, UpdateTicketService_1.default)({ ticketData, ticketId: ticket.id, companyId });
        if (ticket.contactId) {
            try {
                await (0, DeleteDialogChatBotsServices_1.default)(ticket.contactId);
            }
            catch (error) {
                console.error("Erro ao deletar dialogs", error);
            }
        }
        await ticketTraking.update({
            userId: ticket.userId,
            closedAt: (0, moment_1.default)().toDate(),
            finishedAt: (0, moment_1.default)().toDate()
        });
        await (0, CreateLogTicketService_1.default)({
            ticketId: ticket.id,
            type: "clientClosed",
            queueId: ticket.queueId,
            userId: ticket.userId
        });
        return;
    }
    // Tratamento para "#" - voltar ao menu principal
    if (selectedOption === "#") {
        // Resetar o ticket para voltar ao menu principal
        await ticket.update({
            queueId: null,
            userId: null,
            amountUsedBotQueues: 0
        });
        // Deletar dialogs existentes
        await (0, DeleteDialogChatBotsServices_1.default)(ticket.contactId);
        // Buscar filas do WhatsApp
        const { queues, greetingMessage, greetingMediaAttachment } = await (0, ShowWhatsAppService_1.default)(ticket.whatsappId, ticket.companyId);
        if (queues.length === 0) {
            return;
        }
        let options = "";
        queues.forEach((option, index) => {
            options += `*[ ${index + 1} ]* - ${option.name}\n`;
        });
        options += `\n*[ Sair ]* - Encerrar Atendimento`;
        const body = (0, Mustache_1.default)(`\u200e${greetingMessage}\n\n${options}`, ticket);
        console.log('body1', body);
        await (0, CreateLogTicketService_1.default)({
            ticketId: ticket.id,
            type: "chatBot",
            queueId: ticket.queueId,
            userId: ticket.userId
        });
        if (greetingMediaAttachment !== null) {
            const filePath = path_1.default.resolve("public", `company${ticket.companyId}`, greetingMediaAttachment);
            const fileExists = fs_1.default.existsSync(filePath);
            if (fileExists) {
                const messageOptions = await (0, SendWhatsAppMedia_1.getMessageOptions)(greetingMediaAttachment, filePath, String(ticket.companyId), body);
                console.log('body2', body);
                await (0, SendWhatsAppOficialMessage_1.default)({
                    body,
                    ticket,
                    type: messageOptions.mimetype?.includes('image') ? 'image' :
                        messageOptions.mimetype?.includes('video') ? 'video' :
                            messageOptions.mimetype?.includes('audio') ? 'audio' : 'document',
                    media: messageOptions,
                    vCard: null
                });
            }
            else {
                console.log('body3', body);
                await (0, SendWhatsAppOficialMessage_1.default)({
                    body,
                    ticket,
                    type: 'text',
                    media: null,
                    vCard: null
                });
            }
        }
        else {
            console.log('body4', body);
            await (0, SendWhatsAppOficialMessage_1.default)({
                body,
                ticket,
                type: 'text',
                media: null,
                vCard: null
            });
        }
        return;
    }
    let choosenQueue = (chatbot && queues.length === 1) ? queues[+selectedOption] : queues[+selectedOption - 1];
    const typeBot = settings?.chatBotType || "text";
    // Serviço p/ escolher consultor aleatório para o ticket, ao selecionar fila.
    const botText = async () => {
        if (choosenQueue || (queues.length === 1 && chatbot)) {
            // console.log("entrou no choose", ticket.isOutOfHour, ticketTraking.chatbotAt)
            if (queues.length === 1)
                choosenQueue = queues[0];
            const queue = await Queue_1.default.findByPk(choosenQueue.id);
            if (ticket.isOutOfHour === false && ticketTraking.chatbotAt !== null) {
                await ticketTraking.update({
                    chatbotAt: null
                });
                await ticket.update({
                    amountUsedBotQueues: 0
                });
            }
            let currentSchedule;
            if (settings?.scheduleType === "queue") {
                currentSchedule = await (0, VerifyCurrentSchedule_1.default)(companyId, queue.id, 0);
            }
            if (settings?.scheduleType === "queue" && ticket.status !== "open" &&
                !(0, lodash_1.isNil)(currentSchedule) && (ticket.amountUsedBotQueues < maxUseBotQueues || maxUseBotQueues === 0)
                && (!currentSchedule || currentSchedule.inActivity === false)
                && (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")) {
                if (timeUseBotQueues !== "0") {
                    //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
                    //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
                    let dataLimite = new Date();
                    let Agora = new Date();
                    if (ticketTraking.chatbotAt !== null) {
                        dataLimite.setMinutes(ticketTraking.chatbotAt.getMinutes() + (Number(timeUseBotQueues)));
                        if (ticketTraking.chatbotAt !== null && Agora < dataLimite && timeUseBotQueues !== "0" && ticket.amountUsedBotQueues !== 0) {
                            return;
                        }
                    }
                    await ticketTraking.update({
                        chatbotAt: null
                    });
                }
                const outOfHoursMessage = queue.outOfHoursMessage;
                if (outOfHoursMessage !== "") {
                    // console.log("entrei3");
                    const body = (0, Mustache_1.default)(`${outOfHoursMessage}`, ticket);
                    console.log('body5', body);
                    await (0, SendWhatsAppOficialMessage_1.default)({
                        body, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                    });
                }
                //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
                await ticket.update({
                    queueId: queue.id,
                    isOutOfHour: true,
                    amountUsedBotQueues: ticket.amountUsedBotQueues + 1
                });
                return;
            }
            await (0, UpdateTicketService_1.default)({
                ticketData: {
                    amountUsedBotQueues: 0,
                    queueId: choosenQueue.id,
                    isBot: true
                },
                ticketId: ticket.id,
                companyId
            });
            // }
            // ✅ INICIA INTEGRAÇÃO TYPEBOT/DIALOGFLOW/N8N/SGP APÓS ESCOLHER FILA
            if (!fromMe && !ticket.isGroup && choosenQueue?.integrationId) {
                const integrations = await (0, ShowQueueIntegrationService_1.default)(choosenQueue.integrationId, companyId);
                // Criar um objeto msg simulado para compatibilidade
                const simulatedMsg = {
                    key: {
                        fromMe: false,
                        remoteJid: `${ticket.contact.number}@s.whatsapp.net`,
                        id: msg.idMessage || `ofc-${Date.now()}`
                    },
                    message: {
                        conversation: msg.text || "",
                        timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
                        text: msg.text || ""
                    }
                };
                // ✅ VERIFICAR SE É TYPEBOT
                if (integrations.type === "typebot") {
                    console.log("[TYPEBOT OFICIAL - QUEUE] Iniciando Typebot da fila");
                    await (0, typebotListenerOficial_1.default)({
                        ticket,
                        msg: simulatedMsg,
                        typebot: integrations
                    });
                    await ticket.update({
                        useIntegration: true,
                        integrationId: integrations.id,
                        typebotSessionTime: (0, moment_1.default)().toDate()
                    });
                }
                else {
                    // ✅ CHECAR SE É SGP VIA TYPE OU jsonContent
                    let cfg = {};
                    try {
                        cfg = integrations.jsonContent ? JSON.parse(integrations.jsonContent) : {};
                    }
                    catch {
                        cfg = {};
                    }
                    if (integrations.type === "SGP" || ((cfg?.sgpUrl || cfg?.tipoIntegracao) && integrations.type !== "typebot")) {
                        console.log("[SGP OFICIAL - QUEUE] SGP detectado: aguardando CPF do cliente");
                        // Não iniciar integração agora; apenas marcar no ticket
                        await ticket.update({ useIntegration: true, integrationId: integrations.id });
                    }
                    else {
                        // ✅ OUTRAS INTEGRAÇÕES (n8n, dialogflow, flowbuilder, webhook)
                        await (0, wbotMessageListener_1.handleMessageIntegration)(simulatedMsg, null, // wbot é null para API Oficial
                        companyId, integrations, ticket);
                        await ticket.update({
                            useIntegration: true,
                            integrationId: integrations.id
                        });
                    }
                }
            }
            if (choosenQueue.chatbots.length > 0 && !ticket.isGroup) {
                // let buttonsData: IMetaMessageinteractive;
                // if (choosenQueue.chatbots.length > 3) {
                let options = "";
                choosenQueue.chatbots.forEach((chatbot, index) => {
                    options += `*[ ${index + 1} ]* - ${chatbot.name}\n`;
                });
                const body = (0, Mustache_1.default)(`${choosenQueue.greetingMessage}\n\n${options}\n*[ # ]* Voltar para o menu principal\n*[ Sair ]* Encerrar atendimento`, ticket);
                console.log('body6', body);
                await (0, SendWhatsAppOficialMessage_1.default)({
                    body, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                });
                if (settings?.userRandom === "enabled") {
                    let randomUserId;
                    if (choosenQueue) {
                        try {
                            const userQueue = await (0, ListUserQueueServices_1.default)(choosenQueue.id);
                            if (userQueue.userId > -1) {
                                randomUserId = userQueue.userId;
                            }
                        }
                        catch (error) {
                            console.error(error);
                        }
                    }
                    if (randomUserId) {
                        await (0, UpdateTicketService_1.default)({
                            ticketData: { userId: randomUserId },
                            ticketId: ticket.id,
                            companyId
                        });
                    }
                }
            }
            if (!choosenQueue.chatbots.length && choosenQueue.greetingMessage.length !== 0) {
                const body = (0, Mustache_1.default)(choosenQueue.greetingMessage, ticket);
                console.log('body9', body);
                await (0, SendWhatsAppOficialMessage_1.default)({
                    body, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                });
            }
            if (!(0, lodash_1.isNil)(choosenQueue.fileListId)) {
                try {
                    const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public");
                    const files = await (0, ShowService_1.default)(choosenQueue.fileListId, ticket.companyId);
                    const folder = path_1.default.resolve(publicFolder, `company${ticket.companyId}`, "fileList", String(files.id));
                    const destinationFolder = path_1.default.resolve(publicFolder, `company${ticket.companyId}`);
                    if (!fs_1.default.existsSync(destinationFolder)) {
                        fs_1.default.mkdirSync(destinationFolder, { recursive: true });
                    }
                    try {
                        if (fs_1.default.existsSync(folder)) {
                            const filesInFolder = fs_1.default.readdirSync(folder);
                            for (const file of filesInFolder) {
                                const sourcePath = path_1.default.resolve(folder, file);
                                const destPath = path_1.default.resolve(destinationFolder, file);
                                if (fs_1.default.statSync(sourcePath).isFile()) {
                                    fs_1.default.copyFileSync(sourcePath, destPath);
                                }
                            }
                        }
                        else {
                            logger_1.default.info(`Pasta de origem ${folder} não encontrada`);
                        }
                    }
                    catch (err) {
                        logger_1.default.error(`Erro ao copiar arquivos: ${err}`);
                    }
                    for (const [index, file] of files.options.entries()) {
                        const mediaSrc = {
                            fieldname: 'medias',
                            originalname: path_1.default.basename(file.path),
                            encoding: '7bit',
                            mimetype: file.mediaType,
                            filename: file.path,
                            path: path_1.default.resolve(folder, file.path),
                        };
                        console.log('body10', file.name);
                        await (0, SendWhatsAppOficialMessage_1.default)({
                            media: mediaSrc, body: file.name, ticket, type: null
                        });
                    }
                    ;
                }
                catch (error) {
                    logger_1.default.info(error);
                }
            }
            //se fila está parametrizada para encerrar ticket automaticamente
            if (choosenQueue.closeTicket) {
                try {
                    await (0, UpdateTicketService_1.default)({
                        ticketData: {
                            status: "closed",
                            queueId: choosenQueue.id,
                            sendFarewellMessage: false,
                        },
                        ticketId: ticket.id,
                        companyId,
                    });
                }
                catch (error) {
                    logger_1.default.info(error);
                }
                return;
            }
            const count = await Ticket_1.default.findAndCountAll({
                where: {
                    userId: null,
                    status: "pending",
                    companyId,
                    queueId: choosenQueue.id,
                    whatsappId: ticket.whatsappId,
                    isGroup: false
                }
            });
            await (0, CreateLogTicketService_1.default)({
                ticketId: ticket.id,
                type: "queue",
                queueId: choosenQueue.id,
                userId: ticket.userId
            });
            if (enableQueuePosition && !choosenQueue.chatbots.length) {
                // Lógica para enviar posição da fila de atendimento
                const qtd = count.count === 0 ? 1 : count.count;
                const msgFila = `${settings.sendQueuePositionMessage} *${qtd}*`;
                const bodyFila = (0, Mustache_1.default)(`${msgFila}`, ticket);
                console.log('body11', bodyFila);
                await (0, SendWhatsAppOficialMessage_1.default)({
                    body: bodyFila, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                });
            }
        }
        else {
            if (ticket.isGroup)
                return;
            if (maxUseBotQueues && maxUseBotQueues !== 0 && ticket.amountUsedBotQueues >= maxUseBotQueues) {
                // await UpdateTicketService({
                //   ticketData: { queueId: queues[0].id },
                //   ticketId: ticket.id
                // });
                return;
            }
            if (timeUseBotQueues !== "0") {
                //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
                //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
                let dataLimite = new Date();
                let Agora = new Date();
                if (ticketTraking.chatbotAt !== null) {
                    dataLimite.setMinutes(ticketTraking.chatbotAt.getMinutes() + (Number(timeUseBotQueues)));
                    if (ticketTraking.chatbotAt !== null && Agora < dataLimite && timeUseBotQueues !== "0" && ticket.amountUsedBotQueues !== 0) {
                        return;
                    }
                }
                await ticketTraking.update({
                    chatbotAt: null
                });
            }
            let options = "";
            let body;
            let buttonsData;
            if (queues.length > 3) {
                queues.forEach((queue, index) => {
                    options += `*[ ${index + 1} ]* - ${queue.name}\n`;
                });
                options += `\n*[ Sair ]* - Encerrar atendimento`;
                body = (0, Mustache_1.default)(`${greetingMessage}\n\n${options}`, ticket);
            }
            else {
                buttonsData = {
                    type: 'button',
                    body: {
                        text: (0, Mustache_1.default)(greetingMessage, ticket)
                    },
                    action: {
                        buttons: queues.map((queue, index) => ({
                            type: 'reply',
                            reply: {
                                id: `${index + 1}`,
                                title: queue.name
                            }
                        }))
                    }
                };
            }
            let bodyToSave = '';
            if (queues.length <= 3) {
                const buttonTitles = buttonsData.action.buttons
                    .map(button => `* ${button.reply.title}`)
                    .join('\n');
                bodyToSave = `${(0, Mustache_1.default)(greetingMessage, ticket)}\n\n${buttonTitles}`;
            }
            await (0, CreateLogTicketService_1.default)({
                ticketId: ticket.id,
                type: "chatBot",
                userId: ticket.userId
            });
            if (ticket.whatsapp.greetingMediaAttachment !== null && queues.length > 3) {
                const filePath = path_1.default.resolve("public", `company${companyId}`, ticket.whatsapp.greetingMediaAttachment);
                const fileExists = fs_1.default.existsSync(filePath);
                // console.log(fileExists);
                if (fileExists) {
                    const messagePath = ticket.whatsapp.greetingMediaAttachment;
                    const mediaSrc = await (0, SendWhatsAppMedia_1.getMessageOptions)(messagePath, filePath, String(companyId), body);
                    console.log('body12', body);
                    await (0, SendWhatsAppOficialMessage_1.default)({
                        media: mediaSrc, body, ticket, type: null
                    });
                }
                else {
                    console.log('body13', body);
                    await (0, SendWhatsAppOficialMessage_1.default)({
                        body, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                    });
                }
                await (0, UpdateTicketService_1.default)({
                    ticketData: { amountUsedBotQueues: ticket.amountUsedBotQueues + 1 },
                    ticketId: ticket.id,
                    companyId
                });
                return;
            }
            else {
                console.log('body14', body);
                await (0, SendWhatsAppOficialMessage_1.default)({
                    body: queues.length > 3 ? body : bodyToSave, ticket, quotedMsg: null, type: queues.length <= 3 ? 'interactive' : 'text', media: null, vCard: null, interative: buttonsData
                });
                await (0, UpdateTicketService_1.default)({
                    ticketData: { amountUsedBotQueues: ticket.amountUsedBotQueues + 1 },
                    ticketId: ticket.id,
                    companyId
                });
            }
        }
    };
    const botButton = async () => {
    };
    if (typeBot === "button" && queues.length <= 3) {
        return botButton();
    }
    if (typeBot === "text") {
        return botText();
    }
    if (typeBot === "button" && queues.length > 3) {
        return botText();
    }
};
exports.default = verifyQueueOficial;
