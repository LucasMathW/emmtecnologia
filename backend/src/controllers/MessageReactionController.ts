import { Request, Response } from "express";
import AppError from "../errors/AppError";
import Message from "../models/Message";
import Whatsapp from "../models/Whatsapp";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import MessageReaction from "../models/MessageReaction";
import SendWhatsappReactionService from "../services/MessageServices/SendWhatsappReactionService";
import { getIO } from "../libs/socket";

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

  const existingReaction = await MessageReaction.findOne({
    where: {
      messageId: message.id,
      userId
    }
  });

  let finalEmoji = emoji;

  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);

  const fromJid = `${whatsapp.number}@s.whatsapp.net`;

  // 🔁 Toggle real
  if (existingReaction) {
    if (!emoji || existingReaction.emoji === emoji) {
      await existingReaction.destroy();
      finalEmoji = "";
    } else {
      await existingReaction.update({ emoji });
    }
  } else if (emoji) {
    await MessageReaction.create({
      messageId: message.id,
      userId,
      emoji,
      fromJid
    });
  }

  // 🔥 ENVIA PARA WHATSAPP
  await SendWhatsappReactionService({
    messageWid,
    emoji: finalEmoji,
    ticket
  });

  return res.status(200).json({
    message: "Reação processada"
  });
};
