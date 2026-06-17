import GetTicketWbot from "../../helpers/GetTicketWbot";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import logger from "../../utils/logger";

const lastPresenceAt = new Map<string, number>();

interface Request {
  ticket: Ticket;
  status: "composing" | "paused" | "recording";
  skipThrottle?: boolean;
}

const SendPresenceService = async ({
  ticket,
  status,
  skipThrottle = false
}: Request): Promise<void> => {
  const wbot = await GetTicketWbot(ticket);

  const contactNumber = await Contact.findByPk(ticket.contactId);
  if (!contactNumber) throw new AppError("Contato não encontrado");

  const jid = `${contactNumber.number}@${
    ticket.isGroup ? "g.us" : "s.whatsapp.net"
  }`;

  const cacheKey = `${ticket.whatsappId}:${jid}:${status}`;

  if (!skipThrottle && status !== "paused") {
    const last = lastPresenceAt.get(cacheKey) || 0;
    const now = Date.now();
    if (now - last < 3000) return;
    lastPresenceAt.set(cacheKey, now);
  } else if (status === "paused") {
    for (const key of lastPresenceAt.keys()) {
      if (key.startsWith(`${ticket.whatsappId}:${jid}`)) {
        lastPresenceAt.delete(key);
      }
    }
  }

  await wbot.sendPresenceUpdate(status, jid);
  logger.info(`[PRESENCE-SEND] ✅ ${status} enviado para ${jid}`);
};

export default SendPresenceService;
