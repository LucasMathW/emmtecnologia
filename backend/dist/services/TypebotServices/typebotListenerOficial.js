"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../../utils/logger"));
const lodash_1 = require("lodash");
const UpdateTicketService_1 = __importDefault(require("../TicketServices/UpdateTicketService"));
const moment_1 = __importDefault(require("moment"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const delay_1 = __importDefault(require("../../utils/delay"));
const SendWhatsAppOficialMessage_1 = __importDefault(require("../WhatsAppOficial/SendWhatsAppOficialMessage"));
const typebotListenerOficial = async ({ msg, ticket, typebot }) => {
    const { urlN8N: url, typebotExpires, typebotKeywordFinish, typebotKeywordRestart, typebotUnknownMessage, typebotSlug, typebotDelayMessage, typebotRestartMessage } = typebot;
    const number = ticket.contact.number;
    let body = msg.message?.conversation || msg.message?.text || "";
    async function createSession(msg, typebot, number) {
        try {
            const id = Math.floor(Math.random() * 10000000000).toString();
            const reqData = JSON.stringify({
                "isStreamEnabled": true,
                "message": "string",
                "resultId": "string",
                "isOnlyRegistering": false,
                "prefilledVariables": {
                    "number": number,
                    "pushName": ticket?.contact?.name || "",
                    "remoteJid": ticket?.contact?.remoteJid
                },
            });
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${url}/api/v1/typebots/${typebotSlug}/startChat`,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                data: reqData
            };
            const request = await axios_1.default.request(config);
            return request.data;
        }
        catch (err) {
            logger_1.default.info("Erro ao criar sessão do typebot: ", err);
            throw err;
        }
    }
    let sessionId;
    let dataStart;
    let status = false;
    try {
        let Agora = new Date();
        Agora.setMinutes(Agora.getMinutes() - Number(typebotExpires));
        if (typebotExpires > 0 && Agora > ticket.typebotSessionTime) {
            await ticket.update({
                typebotSessionId: null,
                typebotSessionTime: null,
                isBot: true
            });
            await ticket.reload();
        }
        if ((0, lodash_1.isNil)(ticket.typebotSessionId)) {
            dataStart = await createSession(msg, typebot, number);
            sessionId = dataStart.sessionId;
            status = true;
            await ticket.update({
                typebotSessionId: sessionId,
                typebotStatus: true,
                useIntegration: true,
                integrationId: typebot.id,
                typebotSessionTime: (0, moment_1.default)().toDate()
            });
            await ticket.reload();
        }
        else {
            sessionId = ticket.typebotSessionId;
            status = ticket.typebotStatus;
        }
        if (!status)
            return;
        if (body.toLocaleLowerCase().trim() !== typebotKeywordFinish.toLocaleLowerCase().trim() && body.toLocaleLowerCase().trim() !== typebotKeywordRestart.toLocaleLowerCase().trim()) {
            let requestContinue;
            let messages;
            let input;
            let clientSideActions;
            if (dataStart?.messages.length === 0 || dataStart === undefined) {
                const reqData = JSON.stringify({
                    "message": body
                });
                let config = {
                    method: 'post',
                    maxBodyLength: Infinity,
                    url: `${url}/api/v1/sessions/${sessionId}/continueChat`,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    data: reqData
                };
                requestContinue = await axios_1.default.request(config);
                messages = requestContinue.data?.messages;
                input = requestContinue.data?.input;
                clientSideActions = requestContinue.data?.clientSideActions;
            }
            else {
                messages = dataStart?.messages;
                input = dataStart?.input;
                clientSideActions = dataStart?.clientSideActions;
            }
            if (messages?.length === 0) {
                await (0, SendWhatsAppOficialMessage_1.default)({
                    body: typebotUnknownMessage,
                    ticket,
                    quotedMsg: null,
                    type: 'text',
                    media: null,
                    vCard: null
                });
            }
            else {
                for (const message of messages) {
                    if (message.type === 'text') {
                        let formattedText = '';
                        let linkPreview = false;
                        for (const richText of message.content.richText) {
                            for (const element of richText.children) {
                                let text = '';
                                if (element.text) {
                                    text = element.text;
                                }
                                if (element.type && element.children) {
                                    for (const subelement of element.children) {
                                        let text = '';
                                        if (subelement.text) {
                                            text = subelement.text;
                                        }
                                        if (subelement.type && subelement.children) {
                                            for (const subelement2 of subelement.children) {
                                                let text = '';
                                                if (subelement2.text) {
                                                    text = subelement2.text;
                                                }
                                                if (subelement2.bold) {
                                                    text = `*${text}*`;
                                                }
                                                if (subelement2.italic) {
                                                    text = `_${text}_`;
                                                }
                                                if (subelement2.underline) {
                                                    text = `~${text}~`;
                                                }
                                                if (subelement2.url) {
                                                    const linkText = subelement2.children[0].text;
                                                    text = `[${linkText}](${subelement2.url})`;
                                                    linkPreview = true;
                                                }
                                                formattedText += text;
                                            }
                                        }
                                        if (subelement.bold) {
                                            text = `*${text}*`;
                                        }
                                        if (subelement.italic) {
                                            text = `_${text}_`;
                                        }
                                        if (subelement.underline) {
                                            text = `~${text}~`;
                                        }
                                        if (subelement.url) {
                                            const linkText = subelement.children[0].text;
                                            text = `[${linkText}](${subelement.url})`;
                                            linkPreview = true;
                                        }
                                        formattedText += text;
                                    }
                                }
                                if (element.bold) {
                                    text = `*${text}*`;
                                }
                                if (element.italic) {
                                    text = `_${text}_`;
                                }
                                if (element.underline) {
                                    text = `~${text}~`;
                                }
                                if (element.url) {
                                    const linkText = element.children[0].text;
                                    text = `[${linkText}](${element.url})`;
                                    linkPreview = true;
                                }
                                formattedText += text;
                            }
                            formattedText += '\n';
                        }
                        formattedText = formattedText.replace('**', '').replace(/\n$/, '');
                        if (formattedText === "Invalid message. Please, try again.") {
                            formattedText = typebotUnknownMessage;
                        }
                        if (formattedText.startsWith("#")) {
                            let gatilho = formattedText.replace("#", "");
                            try {
                                let jsonGatilho = JSON.parse(gatilho);
                                if (jsonGatilho.stopBot && (0, lodash_1.isNil)(jsonGatilho.userId) && (0, lodash_1.isNil)(jsonGatilho.queueId)) {
                                    await ticket.update({
                                        useIntegration: false,
                                        isBot: false
                                    });
                                    return;
                                }
                                if (!(0, lodash_1.isNil)(jsonGatilho.queueId) && jsonGatilho.queueId > 0 && (0, lodash_1.isNil)(jsonGatilho.userId)) {
                                    await (0, UpdateTicketService_1.default)({
                                        ticketData: {
                                            queueId: jsonGatilho.queueId,
                                            isBot: false,
                                            useIntegration: false,
                                            integrationId: null
                                        },
                                        ticketId: ticket.id,
                                        companyId: ticket.companyId
                                    });
                                    return;
                                }
                                if (!(0, lodash_1.isNil)(jsonGatilho.queueId) && jsonGatilho.queueId > 0 && !(0, lodash_1.isNil)(jsonGatilho.userId) && jsonGatilho.userId > 0) {
                                    await (0, UpdateTicketService_1.default)({
                                        ticketData: {
                                            queueId: jsonGatilho.queueId,
                                            userId: jsonGatilho.userId,
                                            isBot: false,
                                            useIntegration: false,
                                            integrationId: null
                                        },
                                        ticketId: ticket.id,
                                        companyId: ticket.companyId
                                    });
                                    return;
                                }
                            }
                            catch (err) {
                                throw err;
                            }
                        }
                        // ✅ Enviar mensagem usando API Oficial
                        await (0, delay_1.default)(typebotDelayMessage || 1000);
                        await (0, SendWhatsAppOficialMessage_1.default)({
                            body: (0, Mustache_1.default)(formattedText, ticket),
                            ticket,
                            quotedMsg: null,
                            type: 'text',
                            media: null,
                            vCard: null
                        });
                    }
                    if (message.type === 'audio') {
                        await (0, delay_1.default)(typebotDelayMessage || 1000);
                        const mediaSrc = {
                            fieldname: 'medias',
                            originalname: message.content.originalname,
                            encoding: '7bit',
                            mimetype: message.content.mimetype,
                            filename: message.content.filename,
                            path: message.content.path
                        };
                        await (0, SendWhatsAppOficialMessage_1.default)({
                            body: "",
                            ticket,
                            quotedMsg: null,
                            type: 'audio',
                            media: mediaSrc,
                            vCard: null
                        });
                    }
                    if (message.type === 'image') {
                        await (0, delay_1.default)(typebotDelayMessage || 1000);
                        const mediaSrc = {
                            fieldname: 'medias',
                            originalname: message.content.originalname,
                            encoding: '7bit',
                            mimetype: message.content.mimetype,
                            filename: message.content.filename,
                            path: message.content.path
                        };
                        await (0, SendWhatsAppOficialMessage_1.default)({
                            body: "",
                            ticket,
                            quotedMsg: null,
                            type: 'image',
                            media: mediaSrc,
                            vCard: null
                        });
                    }
                    if (message.type === 'video') {
                        await (0, delay_1.default)(typebotDelayMessage || 1000);
                        const mediaSrc = {
                            fieldname: 'medias',
                            originalname: message.content.originalname,
                            encoding: '7bit',
                            mimetype: message.content.mimetype,
                            filename: message.content.filename,
                            path: message.content.path
                        };
                        await (0, SendWhatsAppOficialMessage_1.default)({
                            body: "",
                            ticket,
                            quotedMsg: null,
                            type: 'video',
                            media: mediaSrc,
                            vCard: null
                        });
                    }
                    if (clientSideActions) {
                        for (const action of clientSideActions) {
                            if (action?.lastBubbleBlockId === message.id) {
                                if (action.wait) {
                                    await (0, delay_1.default)(action.wait.secondsToWaitFor * 1000);
                                }
                            }
                        }
                    }
                }
                if (input) {
                    if (input.type === 'choice input') {
                        let formattedText = '';
                        const items = input.items;
                        let arrayOptions = [];
                        for (const item of items) {
                            formattedText += `▶️ ${item.content}\n`;
                            arrayOptions.push(item.content);
                        }
                        formattedText = formattedText.replace(/\n$/, '');
                        await (0, delay_1.default)(typebotDelayMessage || 1000);
                        await (0, SendWhatsAppOficialMessage_1.default)({
                            body: formattedText,
                            ticket,
                            quotedMsg: null,
                            type: 'text',
                            media: null,
                            vCard: null
                        });
                    }
                }
            }
        }
        if (body.toLocaleLowerCase().trim() === typebotKeywordRestart.toLocaleLowerCase().trim()) {
            await ticket.update({
                isBot: true,
                typebotSessionId: null
            });
            await ticket.reload();
            await (0, SendWhatsAppOficialMessage_1.default)({
                body: typebotRestartMessage,
                ticket,
                quotedMsg: null,
                type: 'text',
                media: null,
                vCard: null
            });
        }
        if (body.toLocaleLowerCase().trim() === typebotKeywordFinish.toLocaleLowerCase().trim()) {
            await (0, UpdateTicketService_1.default)({
                ticketData: {
                    status: "closed",
                    useIntegration: false,
                    integrationId: null,
                    sendFarewellMessage: true
                },
                ticketId: ticket.id,
                companyId: ticket.companyId
            });
            return;
        }
    }
    catch (error) {
        logger_1.default.info("Error on typebotListenerOficial: ", error);
        await ticket.update({
            typebotSessionId: null
        });
        throw error;
    }
};
exports.default = typebotListenerOficial;
