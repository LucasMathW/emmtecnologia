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

// ─── Mutex por contato (aumentado para 60s) ──────────────────────────────────
const mutexMap = new Map<string, Mutex>();
const getMutex = (key: string): Mutex => {
  if (!mutexMap.has(key)) {
    mutexMap.set(key, new Mutex());
    setTimeout(() => mutexMap.delete(key), 60_000); // ⬆️ 30s → 60s
  }
  return mutexMap.get(key)!;
};

// ─── Helper: remove domínio do JID ───────────────────────────────────────────
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

// ─── NOVO: Smart Update - só faz UPDATE se algo realmente mudou ──────────────
const smartUpdateContact = async (
  contact: Contact,
  updates: Record<string, any>,
  context: string = ""
): Promise<Contact> => {
  // Filtra apenas campos que realmente mudaram
  const changedFields: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null) continue;

    const currentValue = (contact as any)[key];
    if (currentValue !== value) {
      changedFields[key] = value;
    }
  }

  // Se nada mudou, retorna sem fazer UPDATE no banco
  if (Object.keys(changedFields).length === 0) {
    return contact;
  }

  logger.info(
    `[SMART-UPDATE] ${context} - Atualizando ${contact.number}: [${Object.keys(
      changedFields
    ).join(", ")}]`
  );
  return updateContact(contact, changedFields);
};

// ─── NOVO: Cache em memória L1 (ultra-rápido, 30s) ───────────────────────────
interface CacheEntry {
  data: any;
  expires: number;
}
const memoryCache = new Map<string, CacheEntry>();

const getMemoryCache = (key: string): any | null => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
};

const setMemoryCache = (
  key: string,
  data: any,
  ttlMs: number = 30_000
): void => {
  memoryCache.set(key, { data, expires: Date.now() + ttlMs });
};

// Limpeza periódica do cache em memória (evita memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expires < now) memoryCache.delete(key);
  }
}, 60_000);

// ─── checkAndDedup com transação ─────────────────────────────────────────────
export async function checkAndDedup(
  contact: Contact,
  lid: string
): Promise<void> {
  const sequelize = Contact.sequelize!;

  // Usa transação para garantir atomicidade
  await sequelize.transaction(async t => {
    const lidContact = await Contact.findOne({
      where: {
        companyId: contact.companyId,
        number: { [Op.or]: [lid, stripDomain(lid)] }
      },
      transaction: t
    });

    if (!lidContact) return;

    // Bulk updates em uma única operação SQL cada
    await Message.update(
      { contactId: contact.id },
      {
        where: { contactId: lidContact.id, companyId: contact.companyId },
        transaction: t
      }
    );

    const allTickets = await Ticket.findAll({
      where: { contactId: lidContact.id, companyId: contact.companyId },
      transaction: t
    });

    await Ticket.update(
      { contactId: contact.id },
      {
        where: { contactId: lidContact.id, companyId: contact.companyId },
        transaction: t
      }
    );

    if (allTickets.length > 0) {
      logger.info(
        `[RDS CONTATO] Transferidos ${allTickets.length} tickets do contato ${lidContact.id} para ${contact.id}`
      );

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

    await lidContact.destroy({ transaction: t });

    // Invalida cache do contato deduplicado
    const cacheKey = `contact:known:${contact.companyId}:${lidContact.number}`;
    await cacheLayer.del(cacheKey);
    memoryCache.delete(cacheKey);
  });
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

  // ❌ REMOVIDO: Teste de Redis (pic:test) - gerava 2 I/Os por mensagem!

  if (isWhatsappNet && extractedId.includes(":")) {
    logger.info(
      `[RDS-LID-FIX] ID contém separador ':' - extraindo apenas o telefone: ${extractedPhone}`
    );
  }

  logger.info(
    `[RDS-LID-FIX] Processando contato - ID: ${
      msgContact.id
    }, número: ${number}, LID: ${originalLid || "não"}`
  );

  // ─── Foto de perfil com cache (mantido, mas otimizado) ─────────────────────
  let profilePicUrl: string | undefined;
  if (!isGroup && !isLid && wbot) {
    const picCacheKey = `pic:${companyId}:${msgContact.id}`;
    try {
      const cachedPic = await cacheLayer.get(picCacheKey);

      if (cachedPic === "none") {
        // Já sabemos que não tem foto, não busca
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
        } else {
          await cacheLayer.set(picCacheKey, "none", "EX", 300);
        }
      }
    } catch (e) {
      logger.error(`[PIC-VERIFY] Erro inesperado: ${e?.message}`);
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

  // ─── CACHE L1 (Memória) + L2 (Redis) - Sem I/O no banco! ───────────────────
  const contactCacheKey = `contact:known:${companyId}:${number}`;

  if (!isLid && !isGroup) {
    // L1: Cache em memória (0ms)
    const memoryCached = getMemoryCache(contactCacheKey);
    if (memoryCached) {
      try {
        // Contact.build com isNewRecord: false = instância sem SELECT no banco!
        const contact = Contact.build(memoryCached, { isNewRecord: false });
        return contact as Contact;
      } catch (e) {
        // Cache corrompido, segue fluxo normal
      }
    }

    // L2: Cache Redis (~1ms)
    try {
      const cached = await cacheLayer.get(contactCacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        const contact = Contact.build(cachedData, { isNewRecord: false });

        // Promove para L1
        setMemoryCache(contactCacheKey, cachedData);

        return contact as Contact;
      }
    } catch (e) {
      // cache miss ou erro — segue fluxo normal
    }
  }

  // ─── Fluxo com Mutex (só entra se não estiver em cache) ────────────────────
  return getMutex(`${companyId}:${number}`).runExclusive(async () => {
    // Double-check: pode ter sido cacheado enquanto esperava o mutex
    const doubleCheckMemory = getMemoryCache(contactCacheKey);
    if (doubleCheckMemory && !isLid) {
      return Contact.build(doubleCheckMemory, {
        isNewRecord: false
      }) as Contact;
    }

    let foundContact: Contact | null = null;

    if (isLid) {
      // Query única com include para evitar múltiplas consultas
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

    // ─── Helper para popular cache ───────────────────────────────────────────
    const populateCache = (contact: Contact) => {
      const cacheData = contact.toJSON();
      setMemoryCache(contactCacheKey, cacheData, 30_000); // L1: 30s
      cacheLayer.set(contactCacheKey, JSON.stringify(cacheData), "EX", 300); // L2: 5min
    };

    // ─── Contato LID ─────────────────────────────────────────────────────────
    if (isLid) {
      if (foundContact) {
        populateCache(foundContact);
        // ✅ Smart update: só atualiza se nome/foto mudaram
        return smartUpdateContact(
          foundContact,
          {
            name: msgContact.name || undefined,
            ...picUpdate
          },
          "LID-existente"
        );
      }

      // Busca mapeamento LID
      const foundMappedContact = await WhatsappLidMap.findOne({
        where: { companyId, lid: number },
        include: [
          { model: Contact, as: "contact", include: ["tags", "extraInfo"] }
        ]
      });

      if (foundMappedContact) {
        populateCache(foundMappedContact.contact);
        return smartUpdateContact(
          foundMappedContact.contact,
          {
            name: msgContact.name || undefined,
            ...picUpdate
          },
          "LID-mapeado"
        );
      }

      // Busca parcial
      const partialLidContact = await Contact.findOne({
        where: { companyId, number: stripDomain(number) },
        include: ["tags", "extraInfo"]
      });

      if (partialLidContact) {
        populateCache(partialLidContact);
        return smartUpdateContact(
          partialLidContact,
          {
            number: contactData.number,
            name: msgContact.name || undefined,
            ...picUpdate
          },
          "LID-parcial"
        );
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
                `[RDS CONTATO] LID obtido para contato ${foundContact.id}: ${lid}`
              );
            }
          }
        } catch (error) {
          logger.error(
            `[RDS CONTATO] Erro ao verificar ${msgContact.id}: ${error.message}`
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
            logger.error(`[RDS CONTATO] Erro na fila: ${queueError.message}`);
          }
        }
      }

      populateCache(foundContact);

      // ✅ Smart update: só atualiza se nome/foto mudaram
      return smartUpdateContact(
        foundContact,
        {
          name: msgContact.name || undefined,
          ...picUpdate
        },
        "existente"
      );
    }

    // ─── Contato novo ────────────────────────────────────────────────────────
    else if (!isGroup && !foundContact) {
      let newContact: Contact | null = null;
      try {
        const owResult = await onWhatsAppCached(wbot, msgContact.id, companyId);

        if (!owResult?.[0]?.exists) {
          if (originalLid && !contactData.lid) contactData.lid = originalLid;
          newContact = await CreateOrUpdateContactService(contactData);
          populateCache(newContact);
          return newContact;
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
            populateCache(lidContact);
            return smartUpdateContact(
              lidContact,
              {
                number: contactData.number,
                name: msgContact.name || undefined,
                ...picUpdate
              },
              "novo-com-lid-existente"
            );
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
          populateCache(newContact);
          return newContact;
        }
      } catch (error) {
        logger.error(
          `[RDS CONTATO] Erro ao verificar ${msgContact.id}: ${error.message}`
        );
        newContact = await CreateOrUpdateContactService(contactData);
        populateCache(newContact);
        logger.info(`[RDS CONTATO] Contato criado sem LID: ${newContact.id}`);

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
          logger.error(`[RDS CONTATO] Erro na fila: ${queueError.message}`);
        }
        return newContact;
      }
    }

    const fallback = await CreateOrUpdateContactService(contactData);
    populateCache(fallback);
    return fallback;
  });
}
