import { WAMessage, AnyMessageContent } from "baileys";
import * as Sentry from "@sentry/node";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import mime from "mime-types";
import Contact from "../../models/Contact";
import { getWbot } from "../../libs/wbot";
import CreateMessageService from "../MessageServices/CreateMessageService";
import formatBody from "../../helpers/Mustache";
import logger from "../../utils/logger";
import { ENABLE_LID_DEBUG } from "../../config/debug";
import { getJidOf } from "./getJidOf";
import Message from "../../models/Message";

// Configuração do ffmpeg (mantida apenas a IIFE segura)
(() => {
  try {
    const resolvedPath: string | undefined =
      typeof ffmpegStatic === "string"
        ? (ffmpegStatic as unknown as string)
        : undefined;
    if (resolvedPath) {
      ffmpeg.setFfmpegPath(resolvedPath);
    } else {
      logger.warn(
        "ffmpeg não encontrado via ffmpeg-static; usando PATH do sistema."
      );
    }
  } catch (e) {
    logger.warn({ e }, "Falha ao configurar ffmpeg; tentando PATH do SO");
  }
})();

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

// ✅ Função unificada de conversão de áudio para OGG Opus (com verificação de extensão e bitrate melhorado)
const convertAudioToOggOpus = async (
  inputFile: string,
  companyId: number
): Promise<string> => {
  // Se já for .ogg, retorna o próprio arquivo (evita reconversão e perda de qualidade)
  if (inputFile.toLowerCase().endsWith(".ogg")) {
    return inputFile;
  }

  const parsed = path.parse(inputFile);
  const outputFile = path.join(
    publicFolder,
    `company${companyId}`,
    `${parsed.name}-${Date.now()}.ogg`
  );

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputFile)
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec("libopus")
      .audioBitrate("64k") // Bitrate melhorado para melhor qualidade de voz
      .addOption(["-vbr", "off"])
      .addOption(["-avoid_negative_ts", "make_zero"])
      .format("ogg")
      .on("end", () => resolve())
      .on("error", err => reject(err))
      .save(outputFile);
  });

  return outputFile;
};

// ✅ Função para converter PNG/WebP para JPG usando ffmpeg
const convertPngToJpg = async (
  inputPath: string,
  companyId: number
): Promise<Buffer> => {
  try {
    const outputPath = path.join(
      publicFolder,
      `company${companyId}`,
      `temp_${new Date().getTime()}.jpg`
    );

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputFormat("mjpeg")
        .outputOptions("-q:v", "2")
        .on("end", () => resolve())
        .on("error", err => reject(err))
        .save(outputPath);
    });

    const imageBuffer = fs.readFileSync(outputPath);

    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    return imageBuffer;
  } catch (error) {
    logger.error(`❌ Erro na conversão para JPG: ${error.message}`);
    throw error;
  }
};

const getMediaTypeFromMimeType = (mimetype: string): string => {
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

  if (mimetype === "audio/webm") return "audio";
  if (documentMimeTypes.includes(mimetype)) return "document";
  if (archiveMimeTypes.includes(mimetype)) return "document";

  return mimetype.split("/")[0];
};

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  quotedMsg?: Message;
  companyId?: number;
  body?: string;
  isPrivate?: boolean;
  isForwarded?: boolean;
  mentionedJids?: string[];
}

export const getMessageOptions = async (
  fileName: string,
  pathMedia: string,
  companyId: number,
  body: string = " "
): Promise<AnyMessageContent | null> => {
  const mimeType = mime.lookup(pathMedia);
  const typeMessage = mimeType ? mimeType.split("/")[0] : "application";

  try {
    if (!mimeType) throw new Error("Invalid mimetype");

    let options: AnyMessageContent;

    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: body || null,
        fileName
      };
    } else if (typeMessage === "audio") {
      const audioPath = await convertAudioToOggOpus(pathMedia, companyId);
      options = {
        audio: fs.readFileSync(audioPath),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true
      };
      if (audioPath !== pathMedia && fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    } else if (typeMessage === "document" || typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body || null,
        fileName,
        mimetype: mimeType
      };
    } else {
      options = {
        image: fs.readFileSync(pathMedia),
        caption: body || null
      };
    }

    return options;
  } catch (e) {
    Sentry.captureException(e);
    logger.error(`❌ Erro ao processar mídia: ${e.message}`);
    return null;
  }
};

const SendWhatsAppMedia = async ({
  media,
  ticket,
  quotedMsg,
  body = "",
  isPrivate = false,
  isForwarded = false,
  mentionedJids
}: Request): Promise<WAMessage> => {
  try {
    const wbot = await getWbot(ticket.whatsappId);
    const companyId = ticket.companyId.toString();

    // ✅ CORREÇÃO: Resolução de caminho robusta usando path.isAbsolute e path.normalize
    let pathMedia = path.isAbsolute(media.path)
      ? media.path
      : path.join(publicFolder, media.path);
    pathMedia = path.normalize(pathMedia);

    // ✅ CORREÇÃO: contextInfo centralizado com suporte a menções e encaminhamento
    const contextInfo: any = {
      forwardingScore: isForwarded ? 2 : 0,
      isForwarded
    };

    if (mentionedJids && mentionedJids.length > 0) {
      contextInfo.mentions = mentionedJids;
    }

    // Configuração de mensagem citada (quotedMsg)
    let sendOptions: any = {};
    if (quotedMsg) {
      const quotedId: any = (quotedMsg as any)?.id ?? quotedMsg;

      if (quotedId && String(quotedId).trim() !== "") {
        const chatMessages = await Message.findOne({ where: { id: quotedId } });

        if (chatMessages) {
          const msgFound = JSON.parse(chatMessages.dataJson);
          sendOptions = {
            quoted: {
              key: msgFound.key,
              message:
                msgFound.message.extendedTextMessage !== undefined
                  ? {
                      extendedTextMessage: msgFound.message.extendedTextMessage
                    }
                  : { conversation: msgFound.message.conversation }
            }
          };

          if (ENABLE_LID_DEBUG) {
            logger.info(
              `[RDS-LID] SendWhatsAppMedia - ContextInfo configurado para resposta`
            );
          }
        }
      }
    }

    if (!fs.existsSync(pathMedia)) {
      throw new Error(`Arquivo de mídia não encontrado: ${pathMedia}`);
    }

    const typeMessage = media.mimetype.split("/")[0];
    let options: AnyMessageContent;
    const bodyMedia = ticket ? formatBody(body, ticket) : body;

    // ✅ CORREÇÃO: Aplicação do contextInfo centralizado em TODOS os tipos de mídia
    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: bodyMedia,
        fileName: media.originalname.replace("/", "-"),
        contextInfo
      };
    } else if (typeMessage === "audio" || media.mimetype.includes("audio")) {
      // ✅ CORREÇÃO: Usa a função unificada que verifica se já é .ogg
      const audioPath = await convertAudioToOggOpus(
        pathMedia,
        ticket.companyId
      );

      options = {
        audio: fs.readFileSync(audioPath),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
        contextInfo
      };

      if (audioPath !== pathMedia && fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    } else if (
      typeMessage === "document" ||
      typeMessage === "text" ||
      typeMessage === "application"
    ) {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: bodyMedia,
        fileName: media.originalname.replace("/", "-"),
        mimetype: media.mimetype,
        contextInfo
      };
    } else {
      if (media.mimetype.includes("gif")) {
        options = {
          image: fs.readFileSync(pathMedia),
          caption: bodyMedia,
          mimetype: "image/gif",
          gifPlayback: true,
          contextInfo
        };
      } else if (
        media.mimetype.includes("png") ||
        media.mimetype.includes("webp")
      ) {
        const imageBuffer = await convertPngToJpg(pathMedia, ticket.companyId);
        options = {
          image: imageBuffer,
          caption: bodyMedia,
          contextInfo
        };
      } else {
        options = {
          image: fs.readFileSync(pathMedia),
          caption: bodyMedia,
          contextInfo
        };
      }
    }

    // Tratamento de mensagem privada
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
        quotedMsgId: (quotedMsg as any)?.id ?? null,
        ack: 2,
        remoteJid: null,
        participant: null,
        dataJson: null,
        ticketTrakingId: null,
        isPrivate
      };

      await CreateMessageService({ messageData, companyId: ticket.companyId });
      return;
    }

    // ✅ CORREÇÃO: Removido cálculo de JID inútil, usando apenas getJidOf(ticket)
    const targetJid = getJidOf(ticket);
    let sentMessage: WAMessage;

    // ✅ CORREÇÃO: Try/Catch com fallback REAL para grupos (tenta sem quotedMsg se falhar)
    if (ticket.isGroup) {
      if (ENABLE_LID_DEBUG) {
        logger.info(
          `[LID-DEBUG] Media - Enviando mídia para grupo: ${targetJid}`
        );
      }

      try {
        sentMessage = await wbot.sendMessage(targetJid, options, sendOptions);
      } catch (err1) {
        if (err1.message && err1.message.includes("senderMessageKeys")) {
          logger.warn(
            `[RDS-LID] Falha ao enviar mídia com contexto para grupo ${targetJid}, tentando sem contexto...`
          );
          sentMessage = await wbot.sendMessage(targetJid, options); // Fallback: envia sem sendOptions (quotedMsg)
        } else {
          throw err1;
        }
      }
    } else {
      sentMessage = await wbot.sendMessage(targetJid, options, sendOptions);
    }

    wbot.store(sentMessage);

    await ticket.update({
      lastMessage: body !== media.filename ? body : bodyMedia,
      imported: null
    });

    return sentMessage;
  } catch (err) {
    logger.error(
      `❌ ERRO AO ENVIAR MÍDIA ${ticket.id} media ${media.originalname}: ${err.message}`
    );
    Sentry.captureException(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
