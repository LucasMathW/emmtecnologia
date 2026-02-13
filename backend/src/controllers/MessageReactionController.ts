import { Request, Response } from "express";
import AppError from "../errors/AppError";
import Message from "../models/Message";
import Whatsapp from "../models/Whatsapp";
import Ticket from "../models/Ticket";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import MessageReaction from "../models/MessageReaction";
import SendWhatsappReactionService from "../services/MessageServices/SendWhatsappReactionService";

// export const store = async (req: Request, res: Response): Promise<Response> => {
//   // 🔹 Agora é SEMPRE WID
//   const rawMessageWid = req.params.messageId;
//   const messageWid = Array.isArray(rawMessageWid)
//     ? rawMessageWid[0]
//     : rawMessageWid;

//   if (!messageWid) {
//     throw new AppError("messageWid não informado", 400);
//   }

//   const { emoji } = req.body;
//   const { id: userId, companyId } = req.user;

//   console.log("=== DEBUG VARIÁVEIS ===");
//   console.log("emoji:", emoji);
//   console.log("userId:", userId);
//   console.log("companyId:", companyId);

//   if (typeof emoji !== "string") {
//     throw new AppError("Emoji inválido", 400);
//   }

//   console.log("[REACTION] WID recebido:", messageWid);

//   // 🔹 Busca SEMPRE por WID
//   const message = await Message.findOne({
//     where: {
//       wid: messageWid,
//       companyId
//     }
//   });

//   if (!message) {
//     throw new AppError("Mensagem não encontrada", 404);
//   }

//   // 🔹 Resolve ticket
//   const ticket = await ShowTicketService(message.ticketId, companyId);

//   if (!ticket.whatsappId) {
//     throw new AppError("Este ticket não possui conexão vinculada.", 400);
//   }

//   const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);

//   if (!whatsapp) {
//     throw new AppError("Conexão WhatsApp não encontrada", 404);
//   }

//   // 🔹 Verifica reação existente
//   const existingReaction = await MessageReaction.findOne({
//     where: {
//       messageId: message.id,
//       userId
//     }
//   });

//   let emojiToSend: string | null = null;

//   // 🔁 Toggle lógico
//   if (existingReaction) {
//     if (!emoji || existingReaction.emoji === emoji) {
//       emojiToSend = ""; // remover
//     } else {
//       emojiToSend = emoji; // atualizar
//     }
//   } else if (emoji) {
//     emojiToSend = emoji; // criar
//   }

//   if (emojiToSend !== null) {
//     await SendWhatsappReactionService({
//       messageWid,
//       emoji: emojiToSend,
//       ticket
//     });
//   }

//   return res.status(200).json({
//     message: "Reação enviada com sucesso"
//   });
// };

export const store = async (req: Request, res: Response): Promise<Response> => {
  const rawMessageWid = req.params.messageId;
  const messageWid = Array.isArray(rawMessageWid)
    ? rawMessageWid[0]
    : rawMessageWid;

  if (!messageWid) {
    throw new AppError("messageWid não informado", 400);
  }

  const { emoji } = req.body;
  const { id: userId, companyId } = req.user;

  if (typeof emoji !== "string") {
    throw new AppError("Emoji inválido", 400);
  }

  const message = await Message.findOne({
    where: { wid: messageWid, companyId }
  });

  if (!message) {
    throw new AppError("Mensagem não encontrada", 404);
  }

  const ticket = await ShowTicketService(message.ticketId, companyId);

  if (!ticket.whatsappId) {
    throw new AppError("Ticket sem conexão WhatsApp", 400);
  }

  // 🔥 DECISÃO FINAL VEM DO FRONT
  await SendWhatsappReactionService({
    messageWid,
    emoji, // "" REMOVE | "❤️" APLICA
    ticket
  });

  return res.status(200).json({
    message: "Reação enviada"
  });
};
