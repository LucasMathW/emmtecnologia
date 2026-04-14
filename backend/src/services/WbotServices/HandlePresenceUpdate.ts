import { getIO } from "../../libs/socket";
import { Op } from "sequelize";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";

interface PresencePayload {
  remoteJid: string;
  companyId: number;
  status: "typing" | "recording" | "paused" | "online" | "offline";
}

const presenceCache = new Map<number, string | null>();
const presenceTimeouts = new Map<number, NodeJS.Timeout>();

export const handlePresenceUpdate = async ({
  remoteJid,
  companyId,
  status
}: PresencePayload) => {
  const io = getIO();

  if (process.env.NODE_ENV == "development") {
    console.log(`[PRESENCE] Iniciando processamento: ${remoteJid} - ${status}`);
  }

  // Normaliza variações de número com/sem dígito 9
  const rawNumber = remoteJid.split("@")[0];
  const numberVariants = [rawNumber];
  if (rawNumber.length === 13) {
    numberVariants.push(rawNumber.slice(0, 4) + rawNumber.slice(5));
  }
  if (rawNumber.length === 12) {
    numberVariants.push(rawNumber.slice(0, 4) + "9" + rawNumber.slice(4));
  }

  if (process.env.NODE_ENV == "development") {
    console.log(`[PRESENCE] Buscando contato com variantes:`, numberVariants);
  }

  const contact = await Contact.findOne({
    where: {
      companyId,
      [Op.or]: [
        { remoteJid },
        { lid: remoteJid },
        { number: { [Op.in]: numberVariants } }
      ]
    }
  });

  if (!contact) {
    console.log(`[PRESENCE] contato não encontrado para jid: ${remoteJid}`);
    return;
  }

  if (process.env.NODE_ENV == "development") {
    console.log(
      `[PRESENCE] ✅ Contato encontrado: ${contact.id} - ${contact.name} (${contact.number})`
    );
  }

  const ticket = await Ticket.findOne({
    where: {
      contactId: contact.id,
      companyId,
      status: ["open", "pending", "group", "chatbot"] // ← inclui todos ativos
    }
  });

  if (!ticket) {
    console.log(
      `[PRESENCE] ticket ativo não encontrado para contactId: ${contact.id}`
    );
    return;
  }

  const newPresence =
    status === "typing" || status === "recording" ? status : null;

  if (presenceCache.get(ticket.id) === newPresence) return;

  presenceCache.set(ticket.id, newPresence);

  io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
    action: "presence:update",
    ticket: { id: ticket.id },
    status: newPresence
  });

  if (newPresence !== null) {
    const existing = presenceTimeouts.get(ticket.id);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      if (presenceCache.get(ticket.id) === newPresence) {
        presenceCache.set(ticket.id, null);
        io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
          action: "presence:update",
          ticket: { id: ticket.id },
          status: null
        });
      }
      presenceTimeouts.delete(ticket.id);
    }, 10_000);

    presenceTimeouts.set(ticket.id, timeout);
  } else {
    const existing = presenceTimeouts.get(ticket.id);
    if (existing) {
      clearTimeout(existing);
      presenceTimeouts.delete(ticket.id);
    }
  }
};
