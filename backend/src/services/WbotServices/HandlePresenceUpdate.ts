import { getIO } from "../../libs/socket";
import { Op } from "sequelize";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import User from "../../models/User";
interface PresencePayload {
  remoteJid: string;
  companyId: number;
  status: "typing" | "recording" | "paused" | "online" | "offline";
}

export const handlePresenceUpdate = async ({
  remoteJid,
  companyId,
  status
}: PresencePayload) => {
  const io = getIO();

  const contact = await Contact.findOne({
    where: {
      companyId,
      [Op.or]: [
        { remoteJid },
        { lid: remoteJid },
        { number: remoteJid.split("@")[0] }
      ]
    }
  });

  if (!contact) return;

  const ticket = await Ticket.findOne({
    where: {
      contactId: contact.id,
      companyId,
      status: ["open", "pending"]
    }
  });

  if (!ticket) return;

  const newPresence =
    status === "typing" || status === "recording" ? status : null;

  const presenceCache = new Map<number, string | null>();

  if (presenceCache.get(ticket.id) === newPresence) {
    return;
  }

  presenceCache.set(ticket.id, newPresence);

  io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
    action: "presence:update",
    ticket: {
      id: ticket.id
    },
    status: newPresence
  });
};
