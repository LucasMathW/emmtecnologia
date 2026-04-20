import { getIO } from "../../libs/socket";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";

interface PresencePayload {
  remoteJid: string; // JID do chat (grupo ou individual)
  memberJid?: string | null; // JID do membro (só em grupos)
  companyId: number;
  whatsappId: number;
  status: "typing" | "recording" | "paused" | "online" | "offline";
}

const presenceCache = new Map<string, string | null>();
const presenceTimeouts = new Map<string, NodeJS.Timeout>();

export const handlePresenceUpdate = async ({
  remoteJid,
  memberJid,
  companyId,
  whatsappId,
  status
}: PresencePayload) => {
  const io = getIO();
  const isGroup = remoteJid.endsWith("@g.us");

  const newPresence =
    status === "typing" || status === "recording" ? status : null;

  let contact: Contact | null = null;
  let ticket: Ticket | null = null;
  let memberName: string | null = null;

  if (isGroup) {
    // Busca o contato do GRUPO pelo JID do grupo
    contact = await Contact.findOne({
      where: {
        companyId,
        [Op.or]: [{ remoteJid }, { number: remoteJid.replace("@g.us", "") }]
      }
    });

    if (!contact) {
      console.log(`[PRESENCE] grupo não encontrado: ${remoteJid}`);
      return;
    }

    // Busca o ticket do grupo nesse chip
    ticket = await Ticket.findOne({
      where: {
        contactId: contact.id,
        companyId,
        whatsappId,
        status: ["open", "group", "pending", "chatbot"]
      },
      order: [["updatedAt", "DESC"]],
      include: [
        { model: Contact, as: "contact" },
        { model: Queue, as: "queue", attributes: ["id", "name", "color"] },
        {
          model: Whatsapp,
          as: "whatsapp",
          attributes: ["id", "name", "color"]
        },
        { model: User, as: "user", attributes: ["id", "name"] }
      ]
    });

    // Resolve o nome do membro que está digitando
    if (memberJid) {
      const rawMemberNumber = memberJid.split("@")[0];
      const memberVariants = [rawMemberNumber];
      if (rawMemberNumber.length === 13)
        memberVariants.push(
          rawMemberNumber.slice(0, 4) + rawMemberNumber.slice(5)
        );
      if (rawMemberNumber.length === 12)
        memberVariants.push(
          rawMemberNumber.slice(0, 4) + "9" + rawMemberNumber.slice(4)
        );

      const memberContact = await Contact.findOne({
        where: {
          companyId,
          [Op.or]: [
            { remoteJid: memberJid },
            { lid: memberJid },
            { number: { [Op.in]: memberVariants } }
          ]
        },
        attributes: ["id", "name"]
      });

      memberName = memberContact?.name ?? rawMemberNumber;
    }
  } else {
    // Fluxo individual — igual ao que já estava funcionando
    const rawNumber = remoteJid.split("@")[0];
    const numberVariants = [rawNumber];
    if (rawNumber.length === 13)
      numberVariants.push(rawNumber.slice(0, 4) + rawNumber.slice(5));
    if (rawNumber.length === 12)
      numberVariants.push(rawNumber.slice(0, 4) + "9" + rawNumber.slice(4));

    contact = await Contact.findOne({
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

    ticket = await Ticket.findOne({
      where: {
        contactId: contact.id,
        companyId,
        whatsappId,
        status: ["open", "pending", "chatbot"]
        // ↑ grupo excluído aqui — individual não deve achar ticket de grupo
      },
      order: [["updatedAt", "DESC"]],
      include: [
        { model: Contact, as: "contact" },
        { model: Queue, as: "queue", attributes: ["id", "name", "color"] },
        {
          model: Whatsapp,
          as: "whatsapp",
          attributes: ["id", "name", "color"]
        },
        { model: User, as: "user", attributes: ["id", "name"] }
      ]
    });
  }

  if (!ticket) {
    console.log(
      `[PRESENCE] nenhum ticket ativo — chip: ${whatsappId} | jid: ${remoteJid} | grupo: ${isGroup}`
    );
    return;
  }

  // Cache isolado por chip + jid do chat (grupo ou individual)
  const cacheKey = `${companyId}:${whatsappId}:${remoteJid}`;
  if (presenceCache.get(cacheKey) === newPresence) return;
  presenceCache.set(cacheKey, newPresence);

  console.log(
    `[PRESENCE] ✅ ${
      isGroup ? "grupo" : "individual"
    } | chip: ${whatsappId} | contact: ${contact.id} (${
      contact.name
    }) | ticket: ${ticket.id} → ${newPresence}` +
      (memberJid ? ` | digitando: ${memberJid} (${memberName})` : "")
  );

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
      memberName,
      contact: ticket.contact,
      queue: ticket.queue,
      whatsapp: ticket.whatsapp,
      user: ticket.user
    },
    contact: ticket.contact,
    contactId: contact.id,
    status: newPresence
  });

  // Timeout de segurança
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
            contactId: ticket.contactId
          },
          contact: ticket.contact,
          contactId: contact.id,
          status: null
        });
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
