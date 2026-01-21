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
exports.handleOpenAiFlow = void 0;
const wbotMessageListener_1 = require("../WbotServices/wbotMessageListener");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const openai_1 = __importDefault(require("openai"));
const generative_ai_1 = require("@google/generative-ai");
const Message_1 = __importDefault(require("../../models/Message"));
const FlowBuilder_1 = require("../../models/FlowBuilder");
const logger_1 = __importDefault(require("../../utils/logger"));
const wbot_1 = require("../../libs/wbot");
const getJidOf_1 = require("../WbotServices/getJidOf");
const sessionsOpenAi = [];
const sessionsGemini = [];
const deleteFileSync = (path) => {
    try {
        fs_1.default.unlinkSync(path);
    }
    catch (error) {
        console.error("Erro ao deletar o arquivo:", error);
    }
};
const sanitizeName = (name) => {
    let sanitized = name.split(" ")[0];
    sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, "");
    return sanitized.substring(0, 60);
};
// Função para detectar solicitação de transferência para atendente
const detectTransferRequest = (message) => {
    const transferKeywords = [
        'falar com atendente',
        'quero um atendente',
        'atendente humano',
        'pessoa real',
        'sair do bot',
        'parar bot',
        'atendimento humano',
        'falar com alguém',
        'não estou conseguindo',
        'isso não funciona',
        'não entendi',
        'preciso de ajuda real',
        'quero falar com uma pessoa',
        'me transfere',
        'atendente por favor'
    ];
    const lowerMessage = message.toLowerCase();
    return transferKeywords.some(keyword => lowerMessage.includes(keyword));
};
// Função para detectar solicitação de continuação do fluxo
const detectFlowContinuation = (message, continueKeywords) => {
    if (!continueKeywords || continueKeywords.length === 0) {
        return false;
    }
    const lowerMessage = message.toLowerCase().trim();
    return continueKeywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
};
// Função para detectar se o objetivo foi completado (usando IA)
const checkObjectiveCompletion = async (objective, conversation, openai) => {
    if (!objective || !openai)
        return false;
    try {
        // Preparar histórico da conversa para análise
        const conversationText = conversation
            .slice(-5) // Últimas 5 mensagens
            .map(msg => `${msg.fromMe ? 'Bot' : 'User'}: ${msg.body}`)
            .join('\n');
        const analysisPrompt = `
Objetivo: ${objective}

Conversa:
${conversationText}

Pergunta: O objetivo foi completado com sucesso? Responda apenas "SIM" ou "NÃO".
`;
        const response = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [{ role: "user", content: analysisPrompt }],
            max_tokens: 10,
            temperature: 0
        });
        const result = response.choices[0]?.message?.content?.trim().toUpperCase();
        return result === "SIM";
    }
    catch (error) {
        logger_1.default.error("[AI SERVICE] Erro ao verificar completude do objetivo:", error);
        return false;
    }
};
// Função para retornar ao fluxo
const returnToFlow = async (ticket, reason) => {
    try {
        const flowContinuation = (ticket.dataWebhook && typeof ticket.dataWebhook === "object" && "flowContinuation" in ticket.dataWebhook)
            ? ticket.dataWebhook.flowContinuation
            : undefined;
        if (!flowContinuation || !flowContinuation.nextNodeId) {
            logger_1.default.warn(`[FLOW CONTINUATION] Informações de continuação não encontradas - ticket ${ticket.id}`);
            await ticket.update({
                useIntegration: false,
                isBot: false,
                dataWebhook: null
            });
            return;
        }
        logger_1.default.info(`[FLOW CONTINUATION] Retornando ao fluxo - ticket ${ticket.id}, razão: ${reason}`);
        // Enviar mensagem de transição
        const transitionMessages = {
            user_requested: "Perfeito! Vou prosseguir com o atendimento.",
            max_interactions: "Obrigado pelas informações! Vou continuar com o próximo passo.",
            timeout: "Vou prosseguir com o atendimento.",
            objective_completed: "Ótimo! Completamos essa etapa. Vamos continuar!"
        };
        const transitionMessage = transitionMessages[reason] || "Continuando...";
        // Enviar mensagem de transição
        const wbot = await (0, wbot_1.getWbot)(ticket.whatsappId);
        const sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket.contact), {
            text: transitionMessage
        });
        await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, ticket.contact);
        // Restaurar estado do fluxo
        await ticket.update({
            useIntegration: false,
            isBot: false,
            dataWebhook: flowContinuation.originalDataWebhook
        });
        // Continuar fluxo no próximo nó
        if (flowContinuation.nextNodeId) {
            logger_1.default.info(`[FLOW CONTINUATION] Continuando fluxo no nó ${flowContinuation.nextNodeId} - ticket ${ticket.id}`);
            const { ActionsWebhookService } = await Promise.resolve().then(() => __importStar(require("../WebhookService/ActionsWebhookService")));
            const flow = await FlowBuilder_1.FlowBuilderModel.findOne({
                where: { id: ticket.flowStopped }
            });
            if (flow) {
                const nodes = flow.flow["nodes"];
                const connections = flow.flow["connections"];
                await ActionsWebhookService(ticket.whatsappId, parseInt(ticket.flowStopped), ticket.companyId, nodes, connections, flowContinuation.nextNodeId, flowContinuation.originalDataWebhook, "", ticket.hashFlowId || "", null, ticket.id, {
                    number: ticket.contact.number,
                    name: ticket.contact.name,
                    email: ticket.contact.email || ""
                });
            }
        }
    }
    catch (error) {
        logger_1.default.error(`[FLOW CONTINUATION] Erro ao retornar ao fluxo:`, error);
        await ticket.update({
            useIntegration: false,
            isBot: false,
            dataWebhook: null
        });
    }
};
// Prepara as mensagens de IA a partir das mensagens passadas
const prepareMessagesAI = (pastMessages, isGeminiModel, promptSystem) => {
    const messagesAI = [];
    // Para OpenAI, incluir o prompt do sistema como 'system' role
    // Para Gemini, passamos o prompt do sistema separadamente
    if (!isGeminiModel) {
        messagesAI.push({ role: "system", content: promptSystem });
    }
    // Mapear mensagens passadas para formato da IA
    for (const message of pastMessages) {
        if (message.mediaType === "conversation" || message.mediaType === "extendedTextMessage") {
            if (message.fromMe) {
                messagesAI.push({ role: "assistant", content: message.body });
            }
            else {
                messagesAI.push({ role: "user", content: message.body });
            }
        }
    }
    return messagesAI;
};
// Processa a resposta da IA (texto ou áudio)
const processResponse = async (responseText, wbot, msg, ticket, contact, aiSettings, ticketTraking) => {
    let response = responseText;
    // Verificar se o usuário pediu para falar com atendente
    const userMessage = (0, wbotMessageListener_1.getBodyMessage)(msg) || "";
    const userRequestedTransfer = detectTransferRequest(userMessage);
    if (userRequestedTransfer) {
        logger_1.default.info(`[AI SERVICE] Usuário solicitou transferência para atendente - ticket ${ticket.id}`);
        // Desabilitar modo IA
        await ticket.update({
            useIntegration: false,
            isBot: false,
            dataWebhook: null,
            status: "pending"
        });
        const transferMessage = "Entendi que você gostaria de falar com um atendente humano. Estou transferindo você agora. Aguarde um momento!";
        const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
            text: `\u200e ${transferMessage}`,
        });
        await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, contact);
        if (aiSettings.queueId && aiSettings.queueId > 0) {
            await (0, wbotMessageListener_1.transferQueue)(aiSettings.queueId, ticket, contact);
        }
        logger_1.default.info(`[AI SERVICE] Ticket ${ticket.id} transferido para atendimento humano`);
        return;
    }
    // Verificar ação de transferência da IA
    if (response?.toLowerCase().includes("ação: transferir para o setor de atendimento")) {
        logger_1.default.info(`[AI SERVICE] IA solicitou transferência para atendente - ticket ${ticket.id}`);
        await ticket.update({
            useIntegration: false,
            isBot: false,
            dataWebhook: null,
            status: "pending"
        });
        if (aiSettings.queueId && aiSettings.queueId > 0) {
            await (0, wbotMessageListener_1.transferQueue)(aiSettings.queueId, ticket, contact);
        }
        response = response.replace(/ação: transferir para o setor de atendimento/i, "").trim();
        logger_1.default.info(`[AI SERVICE] Ticket ${ticket.id} transferido por solicitação da IA`);
    }
    if (!response && !userRequestedTransfer) {
        return;
    }
    const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public", `company${ticket.companyId}`);
    // Enviar resposta baseada no formato preferido (texto ou voz)
    // IMPORTANTE: Gemini sempre responde em texto, OpenAI pode usar voz
    const useVoice = aiSettings.provider === "openai" && aiSettings.voice !== "texto";
    if (!useVoice) {
        const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
            text: `\u200e ${response}`,
        });
        await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, contact);
    }
    else {
        // Apenas OpenAI pode usar voz
        const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
        try {
            await (0, wbotMessageListener_1.convertTextToSpeechAndSaveToFile)((0, wbotMessageListener_1.keepOnlySpecifiedChars)(response), `${publicFolder}/${fileNameWithOutExtension}`, aiSettings.voiceKey, aiSettings.voiceRegion, aiSettings.voice, "mp3");
            const sendMessage = await wbot.sendMessage(msg.key.remoteJid, {
                audio: { url: `${publicFolder}/${fileNameWithOutExtension}.mp3` },
                mimetype: "audio/mpeg",
                ptt: true,
            });
            await (0, wbotMessageListener_1.verifyMediaMessage)(sendMessage, ticket, contact, ticketTraking, false, false, wbot);
            deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
            deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
        }
        catch (error) {
            console.error(`Erro para responder com audio: ${error}`);
            // Fallback para texto
            const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
                text: `\u200e ${response}`,
            });
            await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, contact);
        }
    }
};
// Manipula requisição OpenAI
const handleOpenAIRequest = async (openai, messagesAI, aiSettings) => {
    try {
        const chat = await openai.chat.completions.create({
            model: aiSettings.model,
            messages: messagesAI,
            max_tokens: aiSettings.maxTokens,
            temperature: aiSettings.temperature,
        });
        return chat.choices[0].message?.content || "";
    }
    catch (error) {
        console.error("OpenAI request error:", error);
        throw error;
    }
};
// Manipula requisição Gemini
const handleGeminiRequest = async (gemini, messagesAI, aiSettings, newMessage, promptSystem) => {
    try {
        const model = gemini.getGenerativeModel({
            model: aiSettings.model,
            systemInstruction: promptSystem,
        });
        // Converte o histórico para o formato do Gemini
        const geminiHistory = messagesAI.map(msg => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
        }));
        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(newMessage);
        return result.response.text();
    }
    catch (error) {
        console.error("Gemini request error:", error);
        throw error;
    }
};
// Função principal para manipular interações de IA
const handleOpenAiFlow = async (aiSettings, msg, wbot, ticket, contact, mediaSent, ticketTraking) => {
    try {
        if (!aiSettings) {
            logger_1.default.error("[AI SERVICE] Configurações da IA não fornecidas");
            return;
        }
        if (contact.disableBot) {
            logger_1.default.info("[AI SERVICE] Bot desabilitado para este contato");
            return;
        }
        // Verificar modo temporário e continuação de fluxo
        const isTemporaryMode = aiSettings.flowMode === "temporary";
        const flowContinuation = (ticket.dataWebhook && typeof ticket.dataWebhook === "object" && "flowContinuation" in ticket.dataWebhook)
            ? ticket.dataWebhook.flowContinuation
            : undefined;
        // Verificações para voltar ao fluxo (apenas no modo temporário)
        if (isTemporaryMode && flowContinuation) {
            const bodyMessage = (0, wbotMessageListener_1.getBodyMessage)(msg) || "";
            // 1. Verificar palavras-chave de continuação
            if (detectFlowContinuation(bodyMessage, aiSettings.continueKeywords || [])) {
                logger_1.default.info(`[AI SERVICE] Usuário solicitou continuação do fluxo - ticket ${ticket.id}`);
                return await returnToFlow(ticket, "user_requested");
            }
            // 2. Verificar limite de interações
            if (aiSettings.maxInteractions && flowContinuation.interactionCount >= aiSettings.maxInteractions) {
                logger_1.default.info(`[AI SERVICE] Limite de interações atingido - ticket ${ticket.id}`);
                return await returnToFlow(ticket, "max_interactions");
            }
            // 3. Verificar timeout
            if (aiSettings.completionTimeout) {
                const startTime = new Date(flowContinuation.startTime);
                const now = new Date();
                const minutesElapsed = (now.getTime() - startTime.getTime()) / (1000 * 60);
                if (minutesElapsed >= aiSettings.completionTimeout) {
                    logger_1.default.info(`[AI SERVICE] Timeout atingido - ticket ${ticket.id}`);
                    return await returnToFlow(ticket, "timeout");
                }
            }
            // Incrementar contador de interações
            await ticket.update({
                dataWebhook: {
                    ...ticket.dataWebhook,
                    flowContinuation: {
                        ...flowContinuation,
                        interactionCount: flowContinuation.interactionCount + 1
                    }
                }
            });
        }
        // Validação da estrutura da mensagem
        let bodyMessage = "";
        try {
            if (msg && msg.message) {
                bodyMessage = (0, wbotMessageListener_1.getBodyMessage)(msg) || "";
            }
            else if (msg && msg.key) {
                const messageFromDB = await Message_1.default.findOne({
                    where: { wid: msg.key.id },
                    order: [['createdAt', 'DESC']]
                });
                if (messageFromDB) {
                    bodyMessage = messageFromDB.body || "";
                    logger_1.default.info(`[AI SERVICE] Usando mensagem do banco: "${bodyMessage}"`);
                }
            }
        }
        catch (error) {
            logger_1.default.warn("[AI SERVICE] Erro ao extrair bodyMessage, tentando buscar última mensagem:", error);
            const lastMessage = await Message_1.default.findOne({
                where: {
                    ticketId: ticket.id,
                    fromMe: false
                },
                order: [['createdAt', 'DESC']]
            });
            if (lastMessage) {
                bodyMessage = lastMessage.body || "";
                logger_1.default.info(`[AI SERVICE] Usando última mensagem como fallback: "${bodyMessage}"`);
            }
        }
        // Se não tem bodyMessage e não é áudio, não processar
        if (!bodyMessage && !msg.message?.audioMessage) {
            logger_1.default.warn("[AI SERVICE] Nenhum conteúdo de texto ou áudio encontrado");
            return;
        }
        if (!aiSettings.model) {
            logger_1.default.error("[AI SERVICE] Modelo não definido nas configurações");
            return;
        }
        if (msg.messageStubType) {
            logger_1.default.info("[AI SERVICE] Ignorando evento de grupo (messageStubType)");
            return;
        }
        const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public", `company${ticket.companyId}`);
        // Definir se é OpenAI ou Gemini baseado no provider
        const provider = aiSettings.provider || (aiSettings.model.startsWith('gpt-') ? 'openai' : 'gemini');
        const isOpenAIModel = provider === 'openai';
        const isGeminiModel = provider === 'gemini';
        if (!isOpenAIModel && !isGeminiModel) {
            logger_1.default.error(`[AI SERVICE] Provider não suportado: ${provider}`);
            await wbot.sendMessage(msg.key.remoteJid, {
                text: "Desculpe, o modelo de IA configurado não é suportado."
            });
            return;
        }
        let openai = null;
        let gemini = null;
        // Inicializar provedor de IA
        if (isOpenAIModel) {
            const openAiIndex = sessionsOpenAi.findIndex(s => s.id === ticket.id);
            if (openAiIndex === -1) {
                openai = new openai_1.default({ apiKey: aiSettings.apiKey });
                openai.id = ticket.id;
                sessionsOpenAi.push(openai);
            }
            else {
                openai = sessionsOpenAi[openAiIndex];
            }
        }
        else if (isGeminiModel) {
            const geminiIndex = sessionsGemini.findIndex(s => s.id === ticket.id);
            if (geminiIndex === -1) {
                gemini = new generative_ai_1.GoogleGenerativeAI(aiSettings.apiKey);
                gemini.id = ticket.id;
                sessionsGemini.push(gemini);
            }
            else {
                gemini = sessionsGemini[geminiIndex];
            }
        }
        // Buscar mensagens passadas para contexto
        const messages = await Message_1.default.findAll({
            where: { ticketId: ticket.id },
            order: [["createdAt", "ASC"]],
            limit: aiSettings.maxMessages > 0 ? aiSettings.maxMessages : undefined
        });
        // Formatar prompt do sistema
        const clientName = sanitizeName(contact.name || "Amigo(a)");
        const promptSystem = `Instruções do Sistema:
    - Use o nome ${clientName} nas respostas para que o cliente se sinta mais próximo e acolhido.
    - Certifique-se de que a resposta tenha até ${aiSettings.maxTokens} tokens e termine de forma completa, sem cortes.
    - Sempre que possível, inclua o nome do cliente para tornar o atendimento mais pessoal e gentil.
    - Se for preciso transferir para outro setor, comece a resposta com 'Ação: Transferir para o setor de atendimento'.

    Prompt Específico:
    ${aiSettings.prompt}

    Siga essas instruções com cuidado para garantir um atendimento claro e amigável em todas as respostas.`;
        // Processar mensagem de texto
        if (bodyMessage) {
            const messagesAI = prepareMessagesAI(messages, isGeminiModel, promptSystem);
            try {
                let responseText = null;
                if (isOpenAIModel && openai) {
                    messagesAI.push({ role: "user", content: bodyMessage });
                    responseText = await handleOpenAIRequest(openai, messagesAI, aiSettings);
                }
                else if (isGeminiModel && gemini) {
                    responseText = await handleGeminiRequest(gemini, messagesAI, aiSettings, bodyMessage, promptSystem);
                }
                if (!responseText) {
                    logger_1.default.error("[AI SERVICE] Nenhuma resposta do provedor de IA");
                    return;
                }
                await processResponse(responseText, wbot, msg, ticket, contact, aiSettings, ticketTraking);
                logger_1.default.info(`[AI SERVICE] Resposta processada com sucesso para ticket ${ticket.id}`);
                // APÓS RESPOSTA: Verificar se deve continuar fluxo por objetivo completado
                if (isTemporaryMode && aiSettings.autoCompleteOnObjective && aiSettings.objective && openai) {
                    const recentMessages = await Message_1.default.findAll({
                        where: { ticketId: ticket.id },
                        order: [["createdAt", "DESC"]],
                        limit: 10
                    });
                    const objectiveCompleted = await checkObjectiveCompletion(aiSettings.objective, recentMessages, openai);
                    if (objectiveCompleted) {
                        logger_1.default.info(`[AI SERVICE] Objetivo completado automaticamente - ticket ${ticket.id}`);
                        return await returnToFlow(ticket, "objective_completed");
                    }
                }
            }
            catch (error) {
                logger_1.default.error("[AI SERVICE] Falha na requisição para IA:", error);
                const errorMessage = "Desculpe, estou com dificuldades técnicas para processar sua solicitação no momento. Por favor, tente novamente mais tarde.";
                const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
                    text: errorMessage
                });
                await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, contact);
            }
        }
        // Processar áudio (apenas para OpenAI)
        else if (msg.message?.audioMessage && mediaSent && isOpenAIModel) {
            if (!openai) {
                logger_1.default.error("[AI SERVICE] Sessão OpenAI necessária para transcrição mas não inicializada");
                await wbot.sendMessage(msg.key.remoteJid, {
                    text: "Desculpe, a transcrição de áudio não está configurada corretamente."
                });
                return;
            }
            try {
                const mediaUrl = mediaSent.mediaUrl.split("/").pop();
                const audioFilePath = `${publicFolder}/${mediaUrl}`;
                if (!fs_1.default.existsSync(audioFilePath)) {
                    logger_1.default.error(`[AI SERVICE] Arquivo de áudio não encontrado: ${audioFilePath}`);
                    await wbot.sendMessage(msg.key.remoteJid, {
                        text: "Desculpe, não foi possível processar seu áudio. Por favor, tente novamente."
                    });
                    return;
                }
                const file = fs_1.default.createReadStream(audioFilePath);
                const transcriptionResult = await openai.audio.transcriptions.create({
                    model: "whisper-1",
                    file: file,
                });
                const transcription = transcriptionResult.text;
                if (!transcription) {
                    logger_1.default.warn("[AI SERVICE] Transcrição vazia recebida");
                    await wbot.sendMessage(msg.key.remoteJid, {
                        text: "Desculpe, não consegui entender o áudio. Tente novamente ou envie uma mensagem de texto."
                    });
                    return;
                }
                // Enviar transcrição para o usuário
                const sentTranscriptMessage = await wbot.sendMessage(msg.key.remoteJid, {
                    text: `🎤 *Sua mensagem de voz:* ${transcription}`,
                });
                await (0, wbotMessageListener_1.verifyMessage)(sentTranscriptMessage, ticket, contact);
                // Obter resposta da IA para a transcrição
                const messagesAI = prepareMessagesAI(messages, isGeminiModel, promptSystem);
                let responseText = null;
                if (isOpenAIModel) {
                    messagesAI.push({ role: "user", content: transcription });
                    responseText = await handleOpenAIRequest(openai, messagesAI, aiSettings);
                }
                else if (isGeminiModel && gemini) {
                    responseText = await handleGeminiRequest(gemini, messagesAI, aiSettings, transcription, promptSystem);
                }
                if (responseText) {
                    await processResponse(responseText, wbot, msg, ticket, contact, aiSettings, ticketTraking);
                }
            }
            catch (error) {
                logger_1.default.error("[AI SERVICE] Erro no processamento de áudio:", error);
                const errorMessage = error?.response?.error?.message || error.message || "Erro desconhecido";
                const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
                    text: `Desculpe, houve um erro ao processar seu áudio: ${errorMessage}`,
                });
                await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, contact);
            }
        }
        else if (msg.message?.audioMessage && isGeminiModel) {
            // Gemini não suporta áudio, apenas texto
            const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
                text: "Desculpe, no momento só posso processar mensagens de texto. Por favor, envie sua pergunta por escrito.",
            });
            await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, contact);
        }
    }
    catch (error) {
        logger_1.default.error("[AI SERVICE] Erro geral no serviço:", error);
        try {
            const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
                text: "Desculpe, ocorreu um erro interno. Por favor, tente novamente mais tarde.",
            });
            await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, contact);
        }
        catch (sendError) {
            logger_1.default.error("[AI SERVICE] Erro ao enviar mensagem de erro:", sendError);
        }
    }
};
exports.handleOpenAiFlow = handleOpenAiFlow;
exports.default = exports.handleOpenAiFlow;
