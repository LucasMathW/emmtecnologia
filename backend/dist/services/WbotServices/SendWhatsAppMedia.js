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
exports.getMessageOptions = exports.convertPngToJpg = exports.convertAudioToOgg = void 0;
const Sentry = __importStar(require("@sentry/node"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const mime_types_1 = __importDefault(require("mime-types"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const wbot_1 = require("../../libs/wbot");
const CreateMessageService_1 = __importDefault(require("../MessageServices/CreateMessageService"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const logger_1 = __importDefault(require("../../utils/logger"));
const debug_1 = require("../../config/debug");
const utils_1 = require("../../utils");
const getJidOf_1 = require("./getJidOf");
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_static_1.default);
(() => {
    try {
        const resolvedPath = typeof ffmpeg_static_1.default === "string"
            ? ffmpeg_static_1.default
            : undefined;
        if (resolvedPath) {
            fluent_ffmpeg_1.default.setFfmpegPath(resolvedPath);
        }
        else {
            logger_1.default.warn("ffmpeg não encontrado via ffmpeg-static; usando PATH do sistema.");
        }
    }
    catch (e) {
        logger_1.default.warn({ e }, "Falha ao configurar ffmpeg; tentando PATH do SO");
    }
})();
const convertToOggOpus = async (inputFile) => {
    const parsed = path_1.default.parse(inputFile);
    const outputFile = path_1.default.join(parsed.dir, `${parsed.name}-${Date.now()}.ogg`);
    await new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(inputFile)
            .audioChannels(1)
            .audioFrequency(16000)
            .audioCodec("libopus")
            .audioBitrate("18k")
            .addOption(["-vbr", "off"])
            .addOption(["-avoid_negative_ts", "make_zero"])
            .format("ogg")
            .on("end", () => resolve())
            .on("error", err => reject(err))
            .save(outputFile);
    });
    return outputFile;
};
const getMediaTypeFromMimeType = (mimetype) => {
    const documentMimeTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.oasis.opendocument.text",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.oasis.opendocument.presentation",
        "application/vnd.oasis.opendocument.graphics",
        "application/rtf",
        "text/plain",
        "text/csv",
        "text/html",
        "text/xml",
        "application/xml",
        "application/json",
        "application/ofx",
        "application/vnd.ms-outlook",
        "application/vnd.apple.keynote",
        "application/vnd.apple.numbers",
        "application/vnd.apple.pages",
        "application/x-msdownload",
        "application/x-executable",
        "application/x-msdownload",
        "application/acad",
        "application/x-pkcs12",
        "application/x-ret"
    ];
    const archiveMimeTypes = [
        "application/zip",
        "application/x-rar-compressed",
        "application/x-7z-compressed",
        "application/x-tar",
        "application/gzip",
        "application/x-bzip2"
    ];
    if (mimetype === "audio/webm") {
        return "audio";
    }
    if (documentMimeTypes.includes(mimetype)) {
        return "document";
    }
    if (archiveMimeTypes.includes(mimetype)) {
        return "document";
    }
    return mimetype.split("/")[0];
};
const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public");
// ✅ CORREÇÃO: Função de conversão de áudio otimizada
const convertAudioToOgg = async (inputPath, companyId) => {
    return new Promise((resolve, reject) => {
        try {
            const newMediaFileName = `${new Date().getTime()}.ogg`;
            const outputFile = path_1.default.join(publicFolder, `company${companyId}`, newMediaFileName);
            console.log("🔄 Convertendo áudio:", {
                input: inputPath,
                output: outputFile
            });
            const converter = (0, fluent_ffmpeg_1.default)(inputPath);
            converter
                .outputFormat("ogg")
                .noVideo()
                .audioCodec("libopus")
                .audioChannels(1)
                .audioFrequency(16000)
                .audioBitrate("64k")
                .addOutputOptions("-avoid_negative_ts make_zero")
                .on("end", () => {
                console.log("✅ Conversão de áudio concluída:", outputFile);
                resolve(outputFile);
            })
                .on("error", (err) => {
                console.error("❌ Erro na conversão de áudio:", err);
                reject(err);
            })
                .save(outputFile);
        }
        catch (error) {
            console.error("❌ Erro ao configurar conversão:", error);
            reject(error);
        }
    });
};
exports.convertAudioToOgg = convertAudioToOgg;
// ✅ Função para converter PNG/WebP para JPG usando ffmpeg
const convertPngToJpg = async (inputPath, companyId) => {
    try {
        console.log("🔄 Convertendo imagem para JPG:", inputPath);
        const outputPath = path_1.default.join(publicFolder, `company${companyId}`, `temp_${new Date().getTime()}.jpg`);
        // Usar ffmpeg para converter qualquer formato de imagem para JPG
        await new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(inputPath)
                .outputFormat('mjpeg')
                .outputOptions('-q:v', '2') // Qualidade alta
                .on('end', () => {
                console.log("✅ Conversão para JPG concluída");
                resolve();
            })
                .on('error', (err) => {
                console.error("❌ Erro na conversão para JPG:", err);
                reject(err);
            })
                .save(outputPath);
        });
        // Ler o arquivo JPG convertido
        const imageBuffer = fs_1.default.readFileSync(outputPath);
        // Limpar arquivo temporário
        if (fs_1.default.existsSync(outputPath)) {
            fs_1.default.unlinkSync(outputPath);
        }
        console.log("✅ Conversão concluída e buffer retornado");
        return imageBuffer;
    }
    catch (error) {
        console.error("❌ Erro na conversão para JPG:", error);
        throw error;
    }
};
exports.convertPngToJpg = convertPngToJpg;
const getMessageOptions = async (fileName, pathMedia, companyId, body = " ") => {
    const mimeType = mime_types_1.default.lookup(pathMedia);
    const typeMessage = mimeType ? mimeType.split("/")[0] : "application";
    console.log("🔍 Processando mídia:", {
        fileName,
        pathMedia,
        mimeType,
        typeMessage
    });
    try {
        if (!mimeType) {
            throw new Error("Invalid mimetype");
        }
        let options;
        if (typeMessage === "video") {
            options = {
                video: fs_1.default.readFileSync(pathMedia),
                caption: body ? body : null,
                fileName: fileName
            };
        }
        else if (typeMessage === "audio") {
            // ✅ CORREÇÃO: Verificar se o arquivo já está em formato adequado
            const isAlreadyOgg = pathMedia.toLowerCase().endsWith(".ogg");
            let audioPath = pathMedia;
            if (!isAlreadyOgg) {
                console.log("🔄 Arquivo não é OGG, convertendo...");
                audioPath = await (0, exports.convertAudioToOgg)(pathMedia, +companyId);
            }
            else {
                console.log("✅ Arquivo já é OGG, usando diretamente");
            }
            options = {
                audio: fs_1.default.readFileSync(audioPath),
                mimetype: "audio/ogg; codecs=opus",
                ptt: true
            };
            // Limpar arquivo temporário se foi convertido
            if (audioPath !== pathMedia && fs_1.default.existsSync(audioPath)) {
                fs_1.default.unlinkSync(audioPath);
            }
        }
        else if (typeMessage === "document" || typeMessage === "application") {
            options = {
                document: fs_1.default.readFileSync(pathMedia),
                caption: body ? body : null,
                fileName: fileName,
                mimetype: mimeType
            };
        }
        else {
            options = {
                image: fs_1.default.readFileSync(pathMedia),
                caption: body ? body : null
            };
        }
        return options;
    }
    catch (e) {
        Sentry.captureException(e);
        console.error("❌ Erro ao processar mídia:", e);
        return null;
    }
};
exports.getMessageOptions = getMessageOptions;
const SendWhatsAppMedia = async ({ media, ticket, body = "", isPrivate = false, isForwarded = false }) => {
    try {
        const wbot = await (0, wbot_1.getWbot)(ticket.whatsappId);
        const companyId = ticket.companyId.toString();
        // Construir o caminho absoluto baseado no companyId
        let pathMedia;
        // Verificar se media.path já é um caminho absoluto ou relativo
        if (media.path.startsWith('/') && !media.path.includes('public')) {
            // Caminho relativo como /company1/fileList/4/arquivo.pdf
            pathMedia = path_1.default.join(publicFolder, media.path);
        }
        else if (media.path.includes('public')) {
            // Caminho já absoluto, usar diretamente
            pathMedia = media.path;
        }
        else if (media.path.startsWith('company')) {
            // Caminho que começa com company (ex: company1/fileList/4/arquivo.pdf)
            pathMedia = path_1.default.join(publicFolder, media.path);
        }
        else {
            // Caminho relativo sem barra inicial
            pathMedia = path_1.default.join(publicFolder, media.path);
        }
        // Debug: verificar se o arquivo existe
        console.log("🔍 Verificando arquivo de mídia:", {
            originalPath: media.path,
            publicFolder,
            fullPath: pathMedia,
            exists: fs_1.default.existsSync(pathMedia)
        });
        if (!fs_1.default.existsSync(pathMedia)) {
            throw new Error(`Arquivo de mídia não encontrado: ${pathMedia}`);
        }
        const typeMessage = media.mimetype.split("/")[0];
        let options;
        let bodyTicket = "";
        const bodyMedia = ticket ? (0, Mustache_1.default)(body, ticket) : body;
        console.log("📤 Enviando mídia:", {
            originalname: media.originalname,
            mimetype: media.mimetype,
            typeMessage,
            pathMedia
        });
        if (typeMessage === "video") {
            options = {
                video: fs_1.default.readFileSync(pathMedia),
                caption: bodyMedia,
                fileName: media.originalname.replace("/", "-"),
                contextInfo: {
                    forwardingScore: isForwarded ? 2 : 0,
                    isForwarded: isForwarded
                }
            };
            bodyTicket = "🎥 Arquivo de vídeo";
        }
        else if (typeMessage === "audio" || media.mimetype.includes("audio")) {
            // ✅ CORREÇÃO: Tratamento específico para arquivos de áudio
            let audioPath = pathMedia;
            console.log("🔄 Convertendo áudio para OGG...");
            audioPath = await convertToOggOpus(pathMedia);
            options = {
                audio: fs_1.default.readFileSync(audioPath),
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
                contextInfo: {
                    forwardingScore: isForwarded ? 2 : 0,
                    isForwarded: isForwarded
                }
            };
            // Limpar arquivo convertido se necessário
            if (audioPath !== pathMedia && fs_1.default.existsSync(audioPath)) {
                fs_1.default.unlinkSync(audioPath);
            }
            bodyTicket = bodyMedia || "🎵 Mensagem de voz";
        }
        else if (typeMessage === "document" || typeMessage === "text") {
            options = {
                document: fs_1.default.readFileSync(pathMedia),
                caption: bodyMedia,
                fileName: media.originalname.replace("/", "-"),
                mimetype: media.mimetype,
                contextInfo: {
                    forwardingScore: isForwarded ? 2 : 0,
                    isForwarded: isForwarded
                }
            };
            bodyTicket = "📂 Documento";
        }
        else if (typeMessage === "application") {
            options = {
                document: fs_1.default.readFileSync(pathMedia),
                caption: bodyMedia,
                fileName: media.originalname.replace("/", "-"),
                mimetype: media.mimetype,
                contextInfo: {
                    forwardingScore: isForwarded ? 2 : 0,
                    isForwarded: isForwarded
                }
            };
            bodyTicket = "📎 Outros anexos";
        }
        else {
            if (media.mimetype.includes("gif")) {
                options = {
                    image: fs_1.default.readFileSync(pathMedia),
                    caption: bodyMedia,
                    mimetype: "image/gif",
                    contextInfo: {
                        forwardingScore: isForwarded ? 2 : 0,
                        isForwarded: isForwarded
                    },
                    gifPlayback: true
                };
            }
            else {
                if (media.mimetype.includes("png") || media.mimetype.includes("webp")) {
                    // ✅ Converter PNG/WebP para JPG antes de enviar
                    console.log("🔄 Detectado arquivo PNG/WebP, convertendo para JPG...");
                    const imageBuffer = await (0, exports.convertPngToJpg)(pathMedia, ticket.companyId);
                    options = {
                        image: imageBuffer,
                        caption: bodyMedia,
                        contextInfo: {
                            forwardingScore: isForwarded ? 2 : 0,
                            isForwarded: isForwarded
                        }
                    };
                }
                else {
                    options = {
                        image: fs_1.default.readFileSync(pathMedia),
                        caption: bodyMedia,
                        contextInfo: {
                            forwardingScore: isForwarded ? 2 : 0,
                            isForwarded: isForwarded
                        }
                    };
                }
            }
            bodyTicket = "🖼️ Imagem";
        }
        if (isPrivate === true) {
            const messageData = {
                wid: `PVT${companyId}${ticket.id}${body.substring(0, 6)}`,
                ticketId: ticket.id,
                contactId: undefined,
                body: bodyMedia,
                fromMe: true,
                mediaUrl: media.filename,
                mediaType: getMediaTypeFromMimeType(media.mimetype),
                read: true,
                quotedMsgId: null,
                ack: 2,
                remoteJid: null,
                participant: null,
                dataJson: null,
                ticketTrakingId: null,
                isPrivate
            };
            await (0, CreateMessageService_1.default)({ messageData, companyId: ticket.companyId });
            return;
        }
        const contactNumber = await Contact_1.default.findByPk(ticket.contactId);
        let jid;
        if (contactNumber.lid && contactNumber.lid !== "") {
            jid = contactNumber.lid;
        }
        else if (contactNumber.remoteJid &&
            contactNumber.remoteJid !== "" &&
            contactNumber.remoteJid.includes("@")) {
            jid = contactNumber.remoteJid;
        }
        else {
            jid = `${contactNumber.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
        }
        jid = (0, utils_1.normalizeJid)(jid);
        let sentMessage;
        if (ticket.isGroup) {
            if (debug_1.ENABLE_LID_DEBUG) {
                logger_1.default.info(`[LID-DEBUG] Media - Enviando mídia para grupo: ${jid}`);
            }
            try {
                // sentMessage = await wbot.sendMessage(jid, options);
                sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), options);
            }
            catch (err1) {
                if (err1.message && err1.message.includes("senderMessageKeys")) {
                    // const simpleOptions = { ...options } as any;
                    // if (simpleOptions.contextInfo) {
                    //   delete simpleOptions.contextInfo;
                    // }
                    // sentMessage = await wbot.sendMessage(jid, simpleOptions);
                    sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), options);
                }
                else {
                    // const otherOptions = { ...options } as any;
                    // if (otherOptions.contextInfo) {
                    //   delete otherOptions.contextInfo;
                    // }
                    // sentMessage = await wbot.sendMessage(jid, otherOptions);
                    sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), options);
                }
            }
        }
        else {
            // sentMessage = await wbot.sendMessage(jid, options);
            sentMessage = await wbot.sendMessage((0, getJidOf_1.getJidOf)(ticket), options);
        }
        wbot.store(sentMessage);
        await ticket.update({
            lastMessage: body !== media.filename ? body : bodyMedia,
            imported: null
        });
        return sentMessage;
    }
    catch (err) {
        console.error(`❌ ERRO AO ENVIAR MÍDIA ${ticket.id} media ${media.originalname}:`, err);
        Sentry.captureException(err);
        throw new AppError_1.default("ERR_SENDING_WAPP_MSG");
    }
};
exports.default = SendWhatsAppMedia;
