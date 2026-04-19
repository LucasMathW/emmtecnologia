import { getIO } from "../../libs/socket";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";

interface PresencePayload {
  remoteJid: string;
  companyId: number;
  whatsappId: number;
  status: "typing" | "recording" | "paused" | "online" | "offline";
}

// Cache isolado por companyId:whatsappId:contactId
const presenceCache = new Map<string, string | null>();
const presenceTimeouts = new Map<string, NodeJS.Timeout>();

export const handlePresenceUpdate = async ({
  remoteJid,
  companyId,
  whatsappId,
  status
}: PresencePayload) => {
  const io = getIO();

  // Normaliza variações de número com/sem dígito 9
  const rawNumber = remoteJid.split("@")[0];
  const numberVariants = [rawNumber];
  if (rawNumber.length === 13)
    numberVariants.push(rawNumber.slice(0, 4) + rawNumber.slice(5));
  if (rawNumber.length === 12)
    numberVariants.push(rawNumber.slice(0, 4) + "9" + rawNumber.slice(4));

  // Mesma busca de contato que verifyContact usa
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
    console.log(`[PRESENCE] contato não encontrado: ${remoteJid}`);
    return;
  }

  // Mesma busca de ticket que FindOrCreateTicketService usa:
  // contactId + companyId + whatsappId + status ativo
  // order por updatedAt DESC = o ticket mais recentemente ativo nesse chip
  const ticket = await Ticket.findOne({
    where: {
      contactId: contact.id,
      companyId,
      whatsappId,
      status: ["open", "pending", "group", "chatbot"]
    },
    order: [["updatedAt", "DESC"]],
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: [
          "id",
          "name",
          "number",
          "email",
          "profilePicUrl",
          "acceptAudioMessage",
          "active",
          "urlPicture",
          "companyId"
        ]
      },
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name", "groupAsTicket", "color"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      }
    ]
  });

  if (!ticket) {
    console.log(
      `[PRESENCE] nenhum ticket ativo no chip ${whatsappId} para contactId: ${contact.id}`
    );
    return;
  }

  const newPresence =
    status === "typing" || status === "recording" ? status : null;

  // Cache isolado por chip — evita cross-chip e emissões duplicadas
  const cacheKey = `${companyId}:${whatsappId}:${contact.id}`;
  if (presenceCache.get(cacheKey) === newPresence) return;
  presenceCache.set(cacheKey, newPresence);

  console.log(
    `[PRESENCE] ✅ chip ${whatsappId} | contact: ${contact.id} (${contact.name}) | ticket: ${ticket.id} | queue: ${ticket.queueId} | user: ${ticket.userId} → ${newPresence}`
  );

  // Emite com o mesmo shape que CreateMessageService usa
  // Frontend já sabe filtrar por ticket.id, ticket.uuid, contactId
  io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
    action: "presence:update",
    ticket: {
      id: ticket.id,
      uuid: ticket.uuid,
      status: ticket.status,
      queueId: ticket.queueId,
      userId: ticket.userId,
      whatsappId: ticket.whatsappId,
      contactId: ticket.contactId,
      contact: ticket.contact,
      queue: ticket.queue,
      whatsapp: ticket.whatsapp,
      user: ticket.user
    },
    contact: ticket.contact,
    contactId: contact.id,
    status: newPresence
  });

  // Timeout de segurança — limpa se o "paused" não chegar
  if (newPresence !== null) {
    const existing = presenceTimeouts.get(cacheKey);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      if (presenceCache.get(cacheKey) === newPresence) {
        presenceCache.set(cacheKey, null);
        io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
          action: "presence:update",
          ticket: {
            id: ticket.id,
            uuid: ticket.uuid,
            status: ticket.status,
            queueId: ticket.queueId,
            userId: ticket.userId,
            whatsappId: ticket.whatsappId,
            contactId: ticket.contactId
          },
          contact: ticket.contact,
          contactId: contact.id,
          status: null
        });
        console.log(
          `[PRESENCE] ⏱️ timeout — limpando presence chip ${whatsappId} contato ${contact.id}`
        );
      }
      presenceTimeouts.delete(cacheKey);
    }, 10_000);

    presenceTimeouts.set(cacheKey, timeout);
  } else {
    const existing = presenceTimeouts.get(cacheKey);
    if (existing) {
      clearTimeout(existing);
      presenceTimeouts.delete(cacheKey);
    }
  }
};
