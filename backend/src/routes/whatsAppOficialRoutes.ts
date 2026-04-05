import { Router } from "express";
import * as WhatsAppOficialWebhookController from "../controllers/WhatsAppOficialWebhookController";

const whatsAppOficialRoutes = Router();

// Rota para a API Oficial (socket server) enviar mensagens recebidas via HTTP
whatsAppOficialRoutes.post(
  "/whatsapp-oficial/receive",
  WhatsAppOficialWebhookController.handleMessageReceived
);

// Rota para marcar mensagens como lidas via HTTP
whatsAppOficialRoutes.post(
  "/whatsapp-oficial/read",
  WhatsAppOficialWebhookController.handleReadMessage
);

// Rota para atualizar status de entrega (sent, delivered, read, failed)
whatsAppOficialRoutes.post(
  "/whatsapp-oficial/status",
  WhatsAppOficialWebhookController.handleStatusUpdate
);

export default whatsAppOficialRoutes;
