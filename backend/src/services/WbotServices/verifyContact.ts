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

const lidUpdateMutex = new Mutex();

export async function checkAndDedup(
  contact: Contact,
  lid: string
): Promise<void> {
  const lidContact = await Contact.findOne({
    where: {
      companyId: contact.companyId,
      number: {
        [Op.or]: [lid, lid.substring(0, lid.indexOf("@"))]
      }
    }
  });

  if (!lidContact) {
    return;
  }

  await Message.update(
    { contactId: contact.id },
    {
      where: {
        contactId: lidContact.id,
        companyId: contact.companyId
      }
    }
  );

  const allTickets = await Ticket.findAll({
    where: {
      contactId: lidContact.id,
      companyId: contact.companyId
    }
  });

  await Ticket.update(
    { contactId: contact.id },
    {
      where: {
        contactId: lidContact.id,
        companyId: contact.companyId
      }
    }
  );

  if (allTickets.length > 0) {
    console.log(
      `[RDS CONTATO] Transferidos ${allTickets.length} tickets do contato ${lidContact.id} para ${contact.id}`
    );
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

  const isNumberLikelyLid = !isLid && number && number.length > 15 && !isGroup;
  if (isNumberLikelyLid) {
    logger.info(
      `[RDS-LID-FIX] Número extraído parece ser um LID (muito longo): ${number}`
    );
  }

  logger.info(
    `[RDS-LID-FIX] Processando contato - ID original: ${
      msgContact.id
    }, número extraído: ${number}, LID detectado: ${originalLid || "não"}`
  );

  // ✅ CORREÇÃO PRINCIPAL: buscar profilePicUrl AQUI, antes de montar contactData
  // Só busca para contatos individuais (não grupos, não @lid)
  let profilePicUrl: string | undefined;
  if (!isGroup && !isLid && wbot) {
    try {
      const fetched = await wbot.profilePictureUrl(msgContact.id, "image");
      if (fetched && !fetched.includes("nopicture")) {
        profilePicUrl = fetched;
        logger.info(
          `[PIC-VERIFY] Foto obtida para ${msgContact.id}: ${profilePicUrl}`
        );
      } else {
        logger.info(`[PIC-VERIFY] Sem foto válida para ${msgContact.id}`);
      }
    } catch (e) {
      logger.info(
        `[PIC-VERIFY] Erro ao buscar foto para ${msgContact.id}: ${e.message}`
      );
    }
  }

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

  return lidUpdateMutex.runExclusive(async () => {
    let foundContact: Contact | null = null;
    if (isLid) {
      foundContact = await Contact.findOne({
        where: {
          companyId,
          [Op.or]: [
            { lid: originalLid ? originalLid : msgContact.id },
            { number: number },
            { remoteJid: originalLid ? originalLid : msgContact.id }
          ]
        },
        include: ["tags", "extraInfo", "whatsappLidMap"]
      });
    } else {
      foundContact = await Contact.findOne({
        where: {
          companyId,
          number: number
        }
      });
    }

    if (isLid) {
      if (foundContact) {
        return updateContact(foundContact, {
          profilePicUrl: contactData.profilePicUrl
        });
      }

      const foundMappedContact = await WhatsappLidMap.findOne({
        where: {
          companyId,
          lid: number
        },
        include: [
          {
            model: Contact,
            as: "contact",
            include: ["tags", "extraInfo"]
          }
        ]
      });

      if (foundMappedContact) {
        return updateContact(foundMappedContact.contact, {
          profilePicUrl: contactData.profilePicUrl
        });
      }

      const partialLidContact = await Contact.findOne({
        where: {
          companyId,
          number: number.substring(0, number.indexOf("@"))
        },
        include: ["tags", "extraInfo"]
      });

      if (partialLidContact) {
        return updateContact(partialLidContact, {
          number: contactData.number,
          profilePicUrl: contactData.profilePicUrl
        });
      }
    } else if (foundContact) {
      if (!foundContact.whatsappLidMap) {
        try {
          const ow = await wbot.onWhatsApp(msgContact.id);
          const owItem = ow?.[0] as any;

          if (owItem?.exists) {
            const lid = owItem?.lid as string;

            if (lid) {
              await checkAndDedup(foundContact, lid);

              const lidMap = await WhatsappLidMap.findOne({
                where: {
                  companyId,
                  lid,
                  contactId: foundContact.id
                }
              });
              if (!lidMap) {
                await WhatsappLidMap.create({
                  companyId,
                  lid,
                  contactId: foundContact.id
                });
              }
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
              {
                delay: 60 * 1000,
                attempts: 1,
                removeOnComplete: true
              }
            );
            logger.info(
              `[RDS CONTATO] Agendada retentativa de obtenção de LID para contato ${foundContact.id} (${msgContact.id})`
            );
          } catch (queueError) {
            logger.error(
              `[RDS CONTATO] Erro ao adicionar contato ${foundContact.id} à fila de retentativa: ${queueError.message}`
            );
          }
        }
      }
      // ✅ Passa profilePicUrl atualizado para contato existente
      return updateContact(foundContact, {
        profilePicUrl: contactData.profilePicUrl
      });
    } else if (!isGroup && !foundContact) {
      let newContact: Contact | null = null;

      try {
        const ow = await wbot.onWhatsApp(msgContact.id);

        if (!ow?.[0]?.exists) {
          if (originalLid && !contactData.lid) {
            contactData.lid = originalLid;
          }

          return CreateOrUpdateContactService(contactData);
        }

        const owItem = ow?.[0] as any;
        let lid = owItem?.lid as string;

        if (!lid && originalLid) {
          lid = originalLid;
        }

        try {
          const firstItem = ow && ow.length > 0 ? ow[0] : null;
          if (firstItem) {
            const firstItemAny = firstItem as any;
            if (firstItemAny.jid) {
              const parts = String(firstItemAny.jid).split("@");
              if (parts.length > 0) {
                const owNumber = parts[0];
                if (owNumber && owNumber !== number) {
                }
              }
            }
          }
        } catch (e) {
          logger.error(
            `[RDS-LID-FIX] Erro ao extrair número da resposta onWhatsApp: ${e.message}`
          );
        }

        if (lid) {
          const lidContact = await Contact.findOne({
            where: {
              companyId,
              number: {
                [Op.or]: [lid, lid.substring(0, lid.indexOf("@"))]
              }
            },
            include: ["tags", "extraInfo"]
          });

          if (lidContact) {
            await lidContact.update({
              lid: lid
            });

            await WhatsappLidMap.create({
              companyId,
              lid,
              contactId: lidContact.id
            });

            return updateContact(lidContact, {
              number: contactData.number,
              profilePicUrl: contactData.profilePicUrl
            });
          } else {
            const contactDataWithLid = {
              ...contactData,
              lid: lid
            };
            newContact = await CreateOrUpdateContactService(contactDataWithLid);

            if (newContact.lid !== lid) {
              await newContact.update({ lid: lid });
            }

            await WhatsappLidMap.create({
              companyId,
              lid,
              contactId: newContact.id
            });

            return newContact;
          }
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
              lid: originalLid ? originalLid : msgContact.id,
              retryCount: 1,
              maxRetries: 5
            },
            {
              delay: 60 * 1000,
              attempts: 1,
              removeOnComplete: true
            }
          );
          logger.info(
            `[RDS CONTATO] Agendada retentativa de obtenção de LID para novo contato ${newContact.id} (${msgContact.id})`
          );
        } catch (queueError) {
          logger.error(
            `[RDS CONTATO] Erro ao adicionar contato ${newContact.id} à fila de retentativa: ${queueError.message}`
          );
        }

        return newContact;
      }
    }

    return CreateOrUpdateContactService(contactData);
  });
}
