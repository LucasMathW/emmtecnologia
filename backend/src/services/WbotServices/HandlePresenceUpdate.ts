import { getIO } from "../../libs/socket";
import { Op } from "sequelize";
import Contact from "../../models/Contact";

interface PresencePayload {
  remoteJid: string;
  companyId: number;
  status: "typing" | "recording" | "paused" | "online" | "offline";
}

// Cache e timeouts por contactId (não mais ticketId)
const presenceCache = new Map<number, string | null>();
const presenceTimeouts = new Map<number, NodeJS.Timeout>();

export const handlePresenceUpdate = async ({
  remoteJid,
  companyId,
  status
}: PresencePayload) => {
  const io = getIO();

  // Normaliza variações de número com/sem dígito 9
  const rawNumber = remoteJid.split("@")[0];
  const numberVariants = [rawNumber];
  if (rawNumber.length === 13) {
    numberVariants.push(rawNumber.slice(0, 4) + rawNumber.slice(5));
  }
  if (rawNumber.length === 12) {
    numberVariants.push(rawNumber.slice(0, 4) + "9" + rawNumber.slice(4));
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

  const newPresence =
    status === "typing" || status === "recording" ? status : null;

  // Evitar emissão duplicada
  if (presenceCache.get(contact.id) === newPresence) return;

  presenceCache.set(contact.id, newPresence);

  console.log(
    `[PRESENCE] ✅ emitindo por contactId: ${contact.id} - ${contact.name} → ${newPresence}`
  );

  // Emite por contactId — frontend filtra pelo contato, não pelo ticket
  io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
    action: "presence:update",
    contactId: contact.id, // ← chave da mudança
    status: newPresence
  });

  if (newPresence !== null) {
    const existing = presenceTimeouts.get(contact.id);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      if (presenceCache.get(contact.id) === newPresence) {
        presenceCache.set(contact.id, null);
        io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
          action: "presence:update",
          contactId: contact.id,
          status: null
        });
        console.log(
          `[PRESENCE] ⏱️ timeout — limpando presence do contato ${contact.id}`
        );
      }
      presenceTimeouts.delete(contact.id);
    }, 10_000);

    presenceTimeouts.set(contact.id, timeout);
  } else {
    const existing = presenceTimeouts.get(contact.id);
    if (existing) {
      clearTimeout(existing);
      presenceTimeouts.delete(contact.id);
    }
  }
};
