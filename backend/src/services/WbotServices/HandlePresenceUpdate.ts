import { getIO } from "../../libs/socket";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import WhatsappLidMap from "../../models/WhatsapplidMap";
import { warnLog, debugLog } from "../../utils/logger";

interface PresencePayload {
  remoteJid: string; // JID do chat (grupo ou individual)
  memberJid?: string | null; // JID do membro (só em grupos)
  companyId: number;
  whatsappId: number;
  status: "typing" | "recording" | "paused" | "online" | "offline";
  instant?: boolean;
}

const presenceCache = new Map<string, string | null>();
const presenceTimeouts = new Map<string, NodeJS.Timeout>();
const presenceClearTimeouts = new Map<string, NodeJS.Timeout>(); // ← novo

export const handlePresenceUpdate = async ({
  remoteJid,
  memberJid,
  companyId,
  whatsappId,
  status,
  instant = false
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
      warnLog(`[PRESENCE] grupo não encontrado: ${remoteJid}`);
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

    // [PRESENCE-DEBUG] log de diagnóstico (não altera comportamento) — mostra
    // exatamente o que chega para o caso individual, antes de qualquer query.
    // TEMPORÁRIO: console.log puro (em vez de debugLog) só para este
    // diagnóstico, para garantir que apareça independente de config de log.
    console.log(
      `[PRESENCE-DEBUG] fluxo individual | remoteJid: ${remoteJid} | rawNumber: ${rawNumber} | isLidJid: ${remoteJid.endsWith(
        "@lid"
      )} | numberVariants: ${JSON.stringify(numberVariants)}`
    );

    // ─── Resolve @lid → contato real via WhatsappLidMap ───────────────────
    // Mesmo padrão usado em GetGroupParticipantsService.ts e verifyContact.ts.
    // O remoteJid da presença pode chegar como "<lid>@lid" (identidade LID do
    // WhatsApp), mas o ticket ativo está associado ao contato pelo
    // número/JID tradicional. Sem essa resolução, o Contact.findOne abaixo
    // pode não achar o contato correto (ou achar um contato "sombra" sem
    // ticket), e o presence:update nunca chega ao ticket real
    // (log "[PRESENCE] nenhum ticket ativo" mesmo com ticket aberto).
    const isLidJid = remoteJid.endsWith("@lid");
    if (isLidJid) {
      const lidNumber = rawNumber.replace(/\D/g, "");
      const lidMap = await WhatsappLidMap.findOne({
        where: { companyId, lid: lidNumber },
        include: [{ model: Contact, as: "contact" }]
      });

      if (lidMap?.contact) {
        contact = lidMap.contact;
        // TEMPORÁRIO: console.log puro para este diagnóstico.
        console.log(
          `[PRESENCE] @lid resolvido via WhatsappLidMap: ${remoteJid} → contato ${contact.id} (${contact.name})`
        );
      } else {
        // [PRESENCE-DEBUG] diagnóstico: não achou mapeamento em WhatsappLidMap
        // (contato pode não ter sido sincronizado ainda) — cai no fallback.
        // TEMPORÁRIO: console.log puro para este diagnóstico.
        console.log(
          `[PRESENCE-DEBUG] WhatsappLidMap sem entrada para lid=${lidNumber} (companyId=${companyId}) — tentando fallback Contact.findOne`
        );
      }
    }

    if (!contact) {
      // ─── Fallback em duas camadas, por prioridade ────────────────────────
      // Antes, remoteJid/lid/number eram tentados num único Op.or. Quando
      // duas linhas de Contact existem para a mesma pessoa (ex: um contato
      // "fantasma" cujo number é, por engano, os dígitos do LID — ver
      // correção em verifyContact.ts), o Op.or podia casar com QUALQUER uma
      // das duas, sem preferência — e o Postgres podia devolver a errada.
      // Agora: primeiro tenta o identificador forte (remoteJid/lid, que só
      // deveria bater no contato certo); só cai para "number" (mais fraco e
      // ambíguo — pode ser dígitos de um LID gravados por engano) se a busca
      // forte não achar nada.
      contact = await Contact.findOne({
        where: {
          companyId,
          [Op.or]: [{ remoteJid }, { lid: remoteJid }]
        }
      });

      if (!contact) {
        contact = await Contact.findOne({
          where: {
            companyId,
            number: { [Op.in]: numberVariants }
          }
        });
      }

      // [PRESENCE-DEBUG] diagnóstico: mostra se o fallback achou o contato e
      // qual contactId/número, para comparar com o ticket que deveria bater.
      // TEMPORÁRIO: console.log puro para este diagnóstico.
      console.log(
        `[PRESENCE-DEBUG] fallback Contact.findOne (remoteJid/lid → number) | remoteJid: ${remoteJid} | resultado: ${
          contact
            ? `contato ${contact.id} (${contact.name}), number=${contact.number}, lid=${contact.lid}`
            : "null"
        }`
      );
    }

    if (!contact) {
      warnLog(`[PRESENCE] contato não encontrado: ${remoteJid}`);
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
    debugLog(
      `[PRESENCE] nenhum ticket ativo — chip: ${whatsappId} | jid: ${remoteJid} | grupo: ${isGroup}`
    );

    return;
  }

  // Cache isolado por chip + jid do chat (grupo ou individual)
  const cacheKey = `${companyId}:${whatsappId}:${remoteJid}`;

  if (presenceCache.get(cacheKey) === newPresence) return;
  // presenceCache.set(cacheKey, newPresence);

  debugLog(
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
    // Cancela qualquer clear pendente (paused que ainda não disparou)
    const existingClear = presenceClearTimeouts.get(cacheKey);
    if (existingClear) {
      clearTimeout(existingClear);
      presenceClearTimeouts.delete(cacheKey);
    }

    // Timeout de segurança: se ficar 10s sem atualização, limpa
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
    // Paused/offline: aguarda 4s antes de emitir null (janela para novo composing)
    const existingClear = presenceClearTimeouts.get(cacheKey);
    if (existingClear) clearTimeout(existingClear);

    if (instant) {
      // Limpa imediatamente — chamado pela nossa API (atendente parou de digitar)
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

      const existing = presenceTimeouts.get(cacheKey);
      if (existing) {
        clearTimeout(existing);
        presenceTimeouts.delete(cacheKey);
      }
      return;
    }

    const clearDelay = setTimeout(() => {
      // Só emite null se o estado ainda for null (não chegou novo typing nesse intervalo)
      if (presenceCache.get(cacheKey) !== null) {
        presenceClearTimeouts.delete(cacheKey);
        return;
      }

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

      // Cancela também o timeout de segurança de 10s
      const existing = presenceTimeouts.get(cacheKey);
      if (existing) {
        clearTimeout(existing);
        presenceTimeouts.delete(cacheKey);
      }

      presenceClearTimeouts.delete(cacheKey);
    }, 4_000);

    presenceClearTimeouts.set(cacheKey, clearDelay);
  }
};
