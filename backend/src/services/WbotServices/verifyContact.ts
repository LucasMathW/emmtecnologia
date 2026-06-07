import { Mutex } from "async-mutex";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import CreateOrUpdateContactService, {
  updateContact
} from "../ContactServices/CreateOrUpdateContactService";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import WhatsappLidMap from "../../models/WhatsapplidMap";
import * as queues from "../../queues";
import logger from "../../utils/logger";
import { IMe } from "./wbotMessageListener";
import { Session } from "../../libs/wbot";
import cacheLayer from "../../libs/cache";
import { getIO } from "../../libs/socket";

// ─── Mutex por contato (evita gargalo global) ───────────────────────────────
const mutexMap = new Map<string, Mutex>();
const getMutex = (key: string): Mutex => {
  if (!mutexMap.has(key)) {
    mutexMap.set(key, new Mutex());
    setTimeout(() => mutexMap.delete(key), 30_000);
  }
  return mutexMap.get(key)!;
};

// ─── Helper: remove domínio do JID com segurança ────────────────────────────
const stripDomain = (jid: string): string =>
  jid.includes("@") ? jid.substring(0, jid.indexOf("@")) : jid;

// ─── Helper: onWhatsApp com timeout e cache ──────────────────────────────────
const onWhatsAppCached = async (
  wbot: Session,
  jid: string,
  companyId: number
): Promise<any[] | null> => {
  const cacheKey = `onwa:${companyId}:${jid}`;
  const cached = await cacheLayer.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const result = await Promise.race([
    wbot.onWhatsApp(jid),
    new Promise<null>(resolve => setTimeout(() => resolve(null), 5000))
  ]);

  if (result) {
    await cacheLayer.set(cacheKey, JSON.stringify(result), "EX", 86400);
  }

  return result;
};

export async function checkAndDedup(
  contact: Contact,
  lid: string
): Promise<void> {
  const lidContact = await Contact.findOne({
    where: {
      companyId: contact.companyId,
      number: {
        [Op.or]: [lid, stripDomain(lid)]
      }
    }
  });

  if (!lidContact) return;

  await Message.update(
    { contactId: contact.id },
    { where: { contactId: lidContact.id, companyId: contact.companyId } }
  );

  const allTickets = await Ticket.findAll({
    where: { contactId: lidContact.id, companyId: contact.companyId }
  });

  await Ticket.update(
    { contactId: contact.id },
    { where: { contactId: lidContact.id, companyId: contact.companyId } }
  );

  if (allTickets.length > 0) {
    logger.info(
      `[RDS CONTATO] Transferidos ${allTickets.length} tickets do contato ${lidContact.id} para ${contact.id}`
    );

    // Notificar frontend após reassociação
    const io = getIO();
    for (const t of allTickets) {
      try {
        await t.reload({ include: [{ model: Contact, as: "contact" }] });
        io.of(String(contact.companyId)).emit(
          `company-${contact.companyId}-ticket`,
          { action: "update", ticket: t }
        );
      } catch (e) {
        logger.error(
          `[RDS CONTATO] Erro ao emitir socket para ticket ${t.id}: ${e?.message}`
        );
      }
    }
  }

  await lidContact.destroy();
}

export async function verifyContact(
  msgContact: IMe,
  wbot: Session,
  companyId: number
): Promise<Contact> {
  const isLid = msgContact.id.includes("@lid") || false;
  const isGroup = msgContact.id.includes("@g.us");
  const isWhatsappNet = msgContact.id.includes("@s.whatsapp.net");

  const idParts = msgContact.id.split("@");
  const extractedId = idParts[0];
  const extractedPhone = extractedId.split(":")[0];

  let number = extractedPhone;
  let originalLid = msgContact.lid || null;

  if (isWhatsappNet && extractedId.includes(":")) {
    logger.info(
      `[RDS-LID-FIX] ID contém separador ':' - extraindo apenas o telefone: ${extractedPhone}`
    );
  }

  if (!isLid && number && number.length > 15 && !isGroup) {
    logger.info(
      `[RDS-LID-FIX] Número extraído parece ser um LID (muito longo): ${number}`
    );
  }

  logger.info(
    `[RDS-LID-FIX] Processando contato - ID original: ${
      msgContact.id
    }, número extraído: ${number}, LID detectado: ${originalLid || "não"}`
  );

  // ─── Foto de perfil com cache ─────────────────────────────────────────────
  let profilePicUrl: string | undefined;
  if (!isGroup && !isLid && wbot) {
    const picCacheKey = `pic:${companyId}:${msgContact.id}`;
    try {
      const cachedPic = await cacheLayer.get(picCacheKey);

      if (cachedPic === "none") {
        // sem foto — não chama WhatsApp
      } else if (cachedPic) {
        profilePicUrl = cachedPic;
      } else {
        let fetched: string | null = null;
        try {
          fetched = await Promise.race([
            wbot.profilePictureUrl(msgContact.id, "image"),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 3000))
          ]);
        } catch (e) {
          const msg = e?.message || "";
          await cacheLayer.set(
            picCacheKey,
            "none",
            "EX",
            msg.includes("item-not-found") ? 3600 : 1800
          );
          logger.warn(
            `[PIC-VERIFY] Erro ao buscar foto para ${msgContact.id}: ${msg}`
          );
        }

        if (fetched && !fetched.includes("nopicture")) {
          profilePicUrl = fetched;
          await cacheLayer.set(picCacheKey, fetched, "EX", 3600);
        } else if (fetched !== null) {
          await cacheLayer.set(picCacheKey, "none", "EX", 3600);
          logger.warn(`[PIC-VERIFY] Sem foto válida para ${msgContact.id}`);
        } else {
          await cacheLayer.set(picCacheKey, "none", "EX", 300); // timeout → retry em 5min
          logger.warn(
            `[PIC-VERIFY] Timeout (3s) para ${msgContact.id} — continuando sem foto`
          );
        }
      }
    } catch (e) {
      logger.error(
        `[PIC-VERIFY] Erro inesperado no cache para ${msgContact.id}: ${e?.message}`
      );
    }
  }

  const picUpdate = profilePicUrl !== undefined ? { profilePicUrl } : {};

  const contactData = {
    name: msgContact?.name || msgContact.id.replace(/\D/g, ""),
    number,
    profilePicUrl,
    isGroup,
    companyId,
    lid: originalLid,
    wbot,
    remoteJid: msgContact.id
  };

  if (isGroup) {
    return CreateOrUpdateContactService(contactData);
  }

  return getMutex(`${companyId}:${number}`).runExclusive(async () => {
    let foundContact: Contact | null = null;

    if (isLid) {
      foundContact = await Contact.findOne({
        where: {
          companyId,
          [Op.or]: [
            { lid: originalLid ?? msgContact.id },
            { number },
            { remoteJid: originalLid ?? msgContact.id }
          ]
        },
        include: ["tags", "extraInfo", "whatsappLidMap"]
      });
    } else {
      foundContact = await Contact.findOne({
        where: { companyId, number }
      });
    }

    // ─── Contato LID ────────────────────────────────────────────────────────
    if (isLid) {
      if (foundContact) {
        return updateContact(foundContact, picUpdate);
      }

      const foundMappedContact = await WhatsappLidMap.findOne({
        where: { companyId, lid: number },
        include: [
          { model: Contact, as: "contact", include: ["tags", "extraInfo"] }
        ]
      });
      if (foundMappedContact) {
        return updateContact(foundMappedContact.contact, picUpdate);
      }

      const partialLidContact = await Contact.findOne({
        where: { companyId, number: stripDomain(number) },
        include: ["tags", "extraInfo"]
      });
      if (partialLidContact) {
        return updateContact(partialLidContact, {
          number: contactData.number,
          ...picUpdate
        });
      }
    }

    // ─── Contato existente ───────────────────────────────────────────────────
    else if (foundContact) {
      if (!foundContact.whatsappLidMap) {
        try {
          const owResult = await onWhatsAppCached(
            wbot,
            msgContact.id,
            companyId
          );
          const owItem = owResult?.[0] as any;

          if (owItem?.exists) {
            const lid = owItem?.lid as string;
            if (lid) {
              await checkAndDedup(foundContact, lid);
              await WhatsappLidMap.findOrCreate({
                where: { companyId, lid, contactId: foundContact.id },
                defaults: { companyId, lid, contactId: foundContact.id }
              });
              logger.info(
                `[RDS CONTATO] LID obtido para contato ${foundContact.id} (${msgContact.id}): ${lid}`
              );
            }
          } else {
            logger.warn(
              `[RDS CONTATO] Contato ${msgContact.id} não encontrado no WhatsApp, mas continuando processamento`
            );
          }
        } catch (error) {
          logger.error(
            `[RDS CONTATO] Erro ao verificar contato ${msgContact.id} no WhatsApp: ${error.message}`
          );
          try {
            await queues["lidRetryQueue"].add(
              "RetryLidLookup",
              {
                contactId: foundContact.id,
                whatsappId: wbot.id || null,
                companyId,
                number: msgContact.id,
                retryCount: 1,
                maxRetries: 5
              },
              { delay: 60_000, attempts: 1, removeOnComplete: true }
            );
          } catch (queueError) {
            logger.error(
              `[RDS CONTATO] Erro ao adicionar à fila de retentativa: ${queueError.message}`
            );
          }
        }
      }
      return updateContact(foundContact, picUpdate);
    }

    // ─── Contato novo ────────────────────────────────────────────────────────
    else if (!isGroup && !foundContact) {
      let newContact: Contact | null = null;
      try {
        const owResult = await onWhatsAppCached(wbot, msgContact.id, companyId);

        if (!owResult?.[0]?.exists) {
          if (originalLid && !contactData.lid) contactData.lid = originalLid;
          return CreateOrUpdateContactService(contactData);
        }

        const owItem = owResult[0] as any;
        const lid: string = owItem?.lid || originalLid || "";

        if (lid) {
          const lidContact = await Contact.findOne({
            where: {
              companyId,
              number: { [Op.or]: [lid, stripDomain(lid)] }
            },
            include: ["tags", "extraInfo"]
          });

          if (lidContact) {
            await lidContact.update({ lid });
            await WhatsappLidMap.findOrCreate({
              where: { companyId, lid },
              defaults: { companyId, lid, contactId: lidContact.id }
            });
            return updateContact(lidContact, {
              number: contactData.number,
              ...picUpdate
            });
          }

          newContact = await CreateOrUpdateContactService({
            ...contactData,
            lid
          });
          if (newContact.lid !== lid) await newContact.update({ lid });
          await WhatsappLidMap.findOrCreate({
            where: { companyId, lid },
            defaults: { companyId, lid, contactId: newContact.id }
          });
          return newContact;
        }
      } catch (error) {
        logger.error(
          `[RDS CONTATO] Erro ao verificar contato ${msgContact.id} no WhatsApp: ${error.message}`
        );
        newContact = await CreateOrUpdateContactService(contactData);
        logger.info(
          `[RDS CONTATO] Contato criado sem LID devido a erro: ${newContact.id}`
        );
        try {
          await queues["lidRetryQueue"].add(
            "RetryLidLookup",
            {
              contactId: newContact.id,
              whatsappId: wbot.id || null,
              companyId,
              number: msgContact.id,
              lid: originalLid ?? msgContact.id,
              retryCount: 1,
              maxRetries: 5
            },
            { delay: 60_000, attempts: 1, removeOnComplete: true }
          );
        } catch (queueError) {
          logger.error(
            `[RDS CONTATO] Erro ao adicionar novo contato à fila de retentativa: ${queueError.message}`
          );
        }
        return newContact;
      }
    }

    return CreateOrUpdateContactService(contactData);
  });
}
