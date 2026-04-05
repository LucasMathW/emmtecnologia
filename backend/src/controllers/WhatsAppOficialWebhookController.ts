import { Request, Response } from "express";
import Message from "../models/Message";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";
import { ReceibedWhatsAppService } from "../services/WhatsAppOficial/ReceivedWhatsApp";

export const handleStatusUpdate = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId, status, companyId } = req.body;

  if (!messageId || !status) {
    return res.status(400).json({ error: "MessageId and status are required" });
  }

  try {
    const ackMap: Record<string, number> = {
      sent: 1,
      delivered: 2,
      read: 3,
      failed: -1
    };

    const ack = ackMap[status] ?? 0;

    const message = await Message.findOne({
      where: { wid: messageId, companyId, fromMe: true }
    });

    if (message) {
      await message.update({ ack });
      logger.info(
        `[WHATSAPP_OFICIAL_STATUS] Mensagem ${messageId} atualizada para ack=${ack} (status=${status})`
      );
    } else {
      logger.warn(
        `[WHATSAPP_OFICIAL_STATUS] Mensagem ${messageId} não encontrada`
      );
    }

    return res.json({ success: true });
  } catch (error: any) {
    logger.error(`[WHATSAPP_OFICIAL_STATUS] Erro: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const handleMessageReceived = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {
    token,
    fromNumber,
    nameContact,
    companyId,
    message
  } = req.body;

  try {
    if (!token || !fromNumber || !companyId || !message) {
      return res.status(400).json({
        error: "Token, fromNumber, companyId and message are required"
      });
    }

    const service = new ReceibedWhatsAppService();
    await service.getMessage({
      token,
      fromNumber,
      nameContact: nameContact || fromNumber,
      companyId: Number(companyId),
      message
    });

    return res.json({ success: true });
  } catch (error: any) {
    logger.error(
      `[WHATSAPP_OFICIAL_WEBHOOK] Erro ao processar mensagem: ${error.message}`
    );
    return res.status(500).json({ error: error.message });
  }
};

export const handleReadMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId, companyId, token } = req.body;

  try {
    if (!messageId || !companyId || !token) {
      return res.status(400).json({
        error: "MessageId, companyId and token are required"
      });
    }

    const service = new ReceibedWhatsAppService();
    await service.readMessage({ messageId, companyId: Number(companyId), token });

    return res.json({ success: true });
  } catch (error: any) {
    logger.error(
      `[WHATSAPP_OFICIAL_WEBHOOK] Erro ao marcar leitura: ${error.message}`
    );
    return res.status(500).json({ error: error.message });
  }
};
