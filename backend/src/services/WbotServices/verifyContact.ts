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

  // ─── Verifica se tem URL de foto mas o arquivo ainda não existe em disco ───
  // Isso acontece quando a URL foi salva mas o download nunca foi concluído
  const picUrl = updates.profilePicUrl || contact.profilePicUrl;
  if (picUrl && !picUrl.includes("nopicture") && picUrl.startsWith("http")) {
    const urlPic = contact.getDataValue("urlPicture") as string | null;
    const isUrlDirect = urlPic?.startsWith("http");

    if (!isUrlDirect) {
      // Verifica se o arquivo local existe
      const path = require("path");
      const fs = require("fs");
      const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
      const folder = path.resolve(
        publicFolder,
        `company${contact.companyId}`,
        "contacts"
      );
      const expectedFile = path.join(folder, `${contact.id}.jpeg`);

      if (!fs.existsSync(expectedFile)) {
        // Arquivo não existe em disco — força download mesmo sem mudança de URL
        changedFields["profilePicUrl"] = picUrl;
        logger.info(
          `[SMART-UPDATE] ${context} - Arquivo de foto ausente em disco para ${contact.number}, forçando download`
        );
      }
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
  if (!isGroup && wbot) {
    // Para @lid, usa o LID original pois o Baileys usa o tctoken armazenado pelo LID
    // Usar o número de telefone (@s.whatsapp.net) falha pois getLIDForPN não mapeia corretamente
    const jidParaFoto = isLid
      ? msgContact.id // usa o @lid diretamente (ex: 101756516184214@lid)
      : msgContact.id;

    const picCacheKey = `pic:${companyId}:${jidParaFoto}`;
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
            wbot.profilePictureUrl(jidParaFoto, "image"),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 5000))
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
            `[PIC-VERIFY] Erro ao buscar foto para ${jidParaFoto}: ${msg}`
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
    if (wbot) {
      const groupJid = msgContact.id;
      const picCacheKey = `pic:${companyId}:${groupJid}`;

      try {
        const cached = await cacheLayer.get(picCacheKey);
        if (cached) {
          contactData.profilePicUrl = cached;
        } else {
          const pic = await Promise.race([
            wbot.profilePictureUrl(groupJid, "image"),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 5000))
          ]);
          if (pic && !pic.includes("nopicture")) {
            await cacheLayer.set(picCacheKey, pic, "EX", 3600);
            contactData.profilePicUrl = pic;
          }
        }
      } catch (e) {}
    }
    return CreateOrUpdateContactService(contactData);
  }

  // ─── CACHE L1 (Memória) + L2 (Redis) - Sem I/O no banco! ───────────────────
  const contactCacheKey = `contact:known:${companyId}:${number}`;

  if (!isLid && !isGroup) {
    // L1: Cache em memória (0ms)
    const memoryCached = getMemoryCache(contactCacheKey);
    if (memoryCached) {
      try {
        // Verifica se o contato ainda existe no banco antes de retornar do cache
        const stillExists = await Contact.count({
          where: { id: memoryCached.id, companyId }
        });
        if (stillExists > 0) {
          const contact = Contact.build(memoryCached, { isNewRecord: false });
          return contact as Contact;
        } else {
          // Contato foi deletado — invalida cache L1 e L2
          memoryCache.delete(contactCacheKey);
          await cacheLayer.del(contactCacheKey);
          logger.warn(
            `[VERIFY-CONTACT] Contato ${memoryCached.id} no cache L1 não existe mais no banco. Cache invalidado.`
          );
        }
      } catch (e) {
        // Cache corrompido, segue fluxo normal
      }
    }

    // L2: Cache Redis (~1ms)
    try {
      const cached = await cacheLayer.get(contactCacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);

        // Verifica se o contato ainda existe no banco
        const stillExists = await Contact.count({
          where: { id: cachedData.id, companyId }
        });
        if (stillExists > 0) {
          const contact = Contact.build(cachedData, { isNewRecord: false });
          // Promove para L1
          setMemoryCache(contactCacheKey, cachedData);
          return contact as Contact;
        } else {
          // Contato foi deletado — invalida cache
          memoryCache.delete(contactCacheKey);
          await cacheLayer.del(contactCacheKey);
          logger.warn(
            `[VERIFY-CONTACT] Contato ${cachedData.id} no cache L2 não existe mais no banco. Cache invalidado.`
          );
        }
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
    // else if (!isGroup && !foundContact) {
    //   let newContact: Contact | null = null;
    //   try {
    //     const owResult = await onWhatsAppCached(wbot, msgContact.id, companyId);

    //     if (!owResult?.[0]?.exists) {
    //       if (originalLid && !contactData.lid) contactData.lid = originalLid;
    //       newContact = await CreateOrUpdateContactService(contactData);
    //       populateCache(newContact);
    //       return newContact;
    //     }

    //     const owItem = owResult[0] as any;
    //     const lid: string = owItem?.lid || originalLid || "";

    //     if (lid) {
    //       const lidContact = await Contact.findOne({
    //         where: {
    //           companyId,
    //           number: { [Op.or]: [lid, stripDomain(lid)] }
    //         },
    //         include: ["tags", "extraInfo"]
    //       });

    //       if (lidContact) {
    //         await lidContact.update({ lid });
    //         await WhatsappLidMap.findOrCreate({
    //           where: { companyId, lid },
    //           defaults: { companyId, lid, contactId: lidContact.id }
    //         });
    //         populateCache(lidContact);
    //         return smartUpdateContact(
    //           lidContact,
    //           {
    //             number: contactData.number,
    //             name: msgContact.name || undefined,
    //             ...picUpdate
    //           },
    //           "novo-com-lid-existente"
    //         );
    //       }

    //       newContact = await CreateOrUpdateContactService({
    //         ...contactData,
    //         lid
    //       });
    //       if (newContact.lid !== lid) await newContact.update({ lid });
    //       await WhatsappLidMap.findOrCreate({
    //         where: { companyId, lid },
    //         defaults: { companyId, lid, contactId: newContact.id }
    //       });
    //       populateCache(newContact);
    //       return newContact;
    //     }
    //   } catch (error) {
    //     logger.error(
    //       `[RDS CONTATO] Erro ao verificar ${msgContact.id}: ${error.message}`
    //     );
    //     newContact = await CreateOrUpdateContactService(contactData);
    //     populateCache(newContact);
    //     logger.info(`[RDS CONTATO] Contato criado sem LID: ${newContact.id}`);

    //     try {
    //       await queues["lidRetryQueue"].add(
    //         "RetryLidLookup",
    //         {
    //           contactId: newContact.id,
    //           whatsappId: wbot.id || null,
    //           companyId,
    //           number: msgContact.id,
    //           lid: originalLid ?? msgContact.id,
    //           retryCount: 1,
    //           maxRetries: 5
    //         },
    //         { delay: 60_000, attempts: 1, removeOnComplete: true }
    //       );
    //     } catch (queueError) {
    //       logger.error(`[RDS CONTATO] Erro na fila: ${queueError.message}`);
    //     }
    //     return newContact;
    //   }
    // }

    // ─── Contato novo (MODO TURBO: Cria na hora, busca LID no background) ────────────────────────────────────────────────────────
    else if (!isGroup && !foundContact) {
      console.log(
        `[VERIFY-CONTACT] 🚀 MODO TURBO ATIVADO: Criando contato imediatamente para ${number} (sem esperar onWhatsApp)`
      );

      // ─── Busca foto antes de criar o contato ─────────────────────────────
      if (!contactData.profilePicUrl && wbot) {
        // Usa o LID quando disponível pois o Baileys armazena tctoken pelo LID
        const jidFoto = originalLid ? originalLid : `${number}@s.whatsapp.net`;
        const picCacheKey = `pic:${companyId}:${jidFoto}`;
        try {
          const cachedPic = await cacheLayer.get(picCacheKey);
          if (cachedPic && cachedPic !== "none") {
            contactData.profilePicUrl = cachedPic;
          } else if (cachedPic !== "none") {
            const fetched = await Promise.race([
              wbot.profilePictureUrl(jidFoto, "image"),
              new Promise<null>(resolve =>
                setTimeout(() => resolve(null), 5000)
              )
            ]).catch(() => null);
            if (fetched && !fetched.includes("nopicture")) {
              contactData.profilePicUrl = fetched;
              await cacheLayer.set(picCacheKey, fetched, "EX", 3600);
              logger.info(
                `[VERIFY-CONTACT] 📸 Foto obtida para novo contato ${number}`
              );
            } else {
              await cacheLayer.set(picCacheKey, "none", "EX", 300);
            }
          }
        } catch (picErr: any) {
          logger.warn(
            `[VERIFY-CONTACT] Erro ao buscar foto para ${number}: ${picErr?.message}`
          );
        }
      }

      let newContact: Contact | null = null;

      try {
        // 🔥 PASSO 1: Cria o contato IMEDIATAMENTE com os dados que temos
        // Se tivermos o LID original do evento da mensagem, já salva. Se não, salva sem.
        if (originalLid && !contactData.lid) {
          contactData.lid = originalLid;
          console.log(
            `[VERIFY-CONTACT] 📌 LID original detectado no evento: ${originalLid}. Já vou salvar no contato.`
          );
        }

        newContact = await CreateOrUpdateContactService(contactData);
        console.log(
          `[VERIFY-CONTACT] ✅ Contato criado INSTANTANEAMENTE! ID: ${
            newContact.id
          } | Number: ${newContact.number} | LID: ${
            newContact.lid || "PENDENTE"
          }`
        );

        // 🔥 PASSO 2: Popula o cache imediatamente para as próximas mensagens serem ultra-rápidas
        populateCache(newContact);

        // 🔥 PASSO 2.5: Busca foto em background (pode demorar alguns segundos para estar disponível)
        if (wbot && !newContact.profilePicUrl) {
          // Usa LID diretamente pois o Baileys armazena tctoken pelo LID
          // Chamar com @s.whatsapp.net falha para contas LID (getLIDForPN não mapeia)
          const jidFoto = originalLid
            ? originalLid
            : `${number}@s.whatsapp.net`;
          const jidLid = originalLid || null;
          const contactId = newContact.id;
          const companyIdBg = companyId;

          // Fire-and-forget: não bloqueia o fluxo principal
          (async () => {
            // Aguarda 3s para o WhatsApp propagar a foto
            await new Promise(r => setTimeout(r, 3000));
            try {
              let fetched: string | null = null;

              // Tenta primeiro com o JID normal
              try {
                fetched = await Promise.race([
                  wbot.profilePictureUrl(jidFoto, "image"),
                  new Promise<null>(r => setTimeout(() => r(null), 6000))
                ]);
                logger.info(
                  `[VERIFY-CONTACT] 🔍 BG foto via JID: ${jidFoto} → ${fetched}`
                );
              } catch (e: any) {
                logger.warn(
                  `[VERIFY-CONTACT] BG foto via JID falhou: ${e?.message}`
                );
              }

              // Se não funcionou e temos LID, tenta com o LID
              if ((!fetched || fetched.includes("nopicture")) && jidLid) {
                try {
                  fetched = await Promise.race([
                    wbot.profilePictureUrl(jidLid, "image"),
                    new Promise<null>(r => setTimeout(() => r(null), 6000))
                  ]);
                  logger.info(
                    `[VERIFY-CONTACT] 🔍 BG foto via LID: ${jidLid} → ${fetched}`
                  );
                } catch (e: any) {
                  logger.warn(
                    `[VERIFY-CONTACT] BG foto via LID falhou: ${e?.message}`
                  );
                }
              }

              if (fetched && !fetched.includes("nopicture")) {
                logger.info(
                  `[VERIFY-CONTACT] 📸 Foto obtida em background para ${number}: ${fetched}`
                );
                await cacheLayer.set(
                  `pic:${companyIdBg}:${jidFoto}`,
                  fetched,
                  "EX",
                  3600
                );

                // Atualiza o contato no banco com a foto
                await CreateOrUpdateContactService({
                  name: number,
                  number,
                  companyId: companyIdBg,
                  profilePicUrl: fetched,
                  isGroup: false
                });
              } else {
                logger.warn(
                  `[VERIFY-CONTACT] ⚠️ Foto não disponível para ${number} após background fetch`
                );
              }
            } catch (bgErr: any) {
              logger.warn(
                `[VERIFY-CONTACT] Erro background foto ${number}: ${bgErr?.message}`
              );
            }
          })().catch(() => {});
        }

        // 🔥 PASSO 3: Adiciona na fila para buscar/atualizar o LID em background (não bloqueia a mensagem!)
        try {
          await queues["lidRetryQueue"].add(
            "RetryLidLookup",
            {
              contactId: newContact.id,
              whatsappId: wbot.id || null,
              companyId,
              number: msgContact.id, // JID original da mensagem
              lid: originalLid ?? msgContact.id,
              retryCount: 1,
              maxRetries: 5
            },
            { delay: 2000, attempts: 1, removeOnComplete: true } // Delay de 2s para dar tempo do WhatsApp processar
          );
          console.log(
            `[VERIFY-CONTACT] 📨 Job de sincronização de LID adicionado à fila para o contato ${newContact.id}. A mensagem já foi entregue!`
          );
        } catch (queueError) {
          console.log(
            `[VERIFY-CONTACT] ⚠️ Erro ao adicionar job na fila (não crítico): ${queueError.message}`
          );
        }

        // 🔥 PASSO 4: Retorna o contato imediatamente para o handleMessage criar o ticket
        return newContact;
      } catch (error) {
        console.log(
          `[VERIFY-CONTACT] ❌ ERRO CRÍTICO ao criar contato novo: ${error.message}`
        );
        console.log(`[VERIFY-CONTACT] Stack:`, error.stack);

        // Fallback de emergência: tenta criar do jeito mais simples possível
        try {
          newContact = await CreateOrUpdateContactService({
            name: number,
            number: number,
            companyId: companyId,
            remoteJid: msgContact.id,
            isGroup: false
          });
          console.log(
            `[VERIFY-CONTACT] 🆘 Fallback funcionou! Contato criado sem LID e sem foto. ID: ${newContact.id}`
          );
          populateCache(newContact);
          return newContact;
        } catch (fallbackError) {
          console.log(
            `[VERIFY-CONTACT] 💥 FALHA TOTAL: Nem o fallback funcionou. Erro: ${fallbackError.message}`
          );
          throw fallbackError; // Deixa o erro estourar para o handleMessage lidar
        }
      }
    }

    const fallback = await CreateOrUpdateContactService(contactData);
    populateCache(fallback);
    return fallback;
  });
}

export { memoryCache };
