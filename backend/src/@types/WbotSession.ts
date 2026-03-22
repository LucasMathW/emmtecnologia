// src/types/WbotSession.ts
import { WASocket } from "baileys";

export type WbotSession = WASocket & {
  id: number; // ID do Whatsapp no banco
  myJid?: string; // opcional, helper
};
