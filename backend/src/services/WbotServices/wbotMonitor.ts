import {
  WASocket,
  BinaryNode,
  Contact as BContact,
  isJidBroadcast,
  isJidStatusBroadcast
} from "baileys";
import * as Sentry from "@sentry/node";
import fs from "fs";
import { Op } from "sequelize";

import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import createOrUpdateBaileysService from "../BaileysServices/CreateOrUpdateBaileysService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import CompaniesSettings from "../../models/CompaniesSettings";
import path from "path";
import { verifyMessage } from "./wbotMessageListener";
import cacheLayer from "../../libs/cache";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";

type Session = WASocket & {
  id?: number;
};

interface FilteredContact {
  id: string;
  name: string;
}

const wbotMonitor = async (
  wbot: Session,
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {
  // ✅ BUG 2 CORRIGIDO: Contador agora é LOCAL a cada conexão de WhatsApp
  // Cada empresa/conexão terá seu próprio contador independente
  let callDelayCounter = 0;
  setInterval(() => {
    callDelayCounter = 0;
  }, 5000);

  try {
    wbot.ws.on("CB:call", async (node: BinaryNode) => {
      const content = node.content[0] as any;

      // ✅ BUG 2 CORRIGIDO: Usa a variável local da conexão
      await new Promise(r => setTimeout(r, callDelayCounter * 650));
      callDelayCounter++;

      if (content.tag === "terminate" && !node.attrs.from.includes("@call")) {
        const settings = await CompaniesSettings.findOne({
          where: { companyId }
        });

        // ✅ MELHORIA: Optional chaining para evitar crash se settings for null
        if (settings?.acceptCallWhatsapp === "enabled") {
          const sentMessage = await wbot.sendMessage(node.attrs.from, {
            text: `\u200e ${settings.AcceptCallWhatsappMessage}`
          });
          const number = node.attrs.from.split(":")[0].replace(/\D/g, "");

          const contact = await Contact.findOne({
            where: { companyId, number }
          });

          if (!contact) return;

          const [ticket] = await Ticket.findOrCreate({
            where: {
              contactId: contact.id,
              whatsappId: wbot.id,
              status: ["open", "pending", "nps", "lgpd"],
              companyId
            },
            defaults: {
              companyId,
              contactId: contact.id,
              whatsappId: wbot.id,
              isGroup: contact.isGroup,
              status: "pending"
            }
          });

          if (!ticket) return;

          await verifyMessage(sentMessage, ticket, contact);

          const date = new Date();
          const hours = date.getHours();
          const minutes = date.getMinutes();

          const body = `Chamada de voz/vídeo perdida às ${hours}:${minutes}`;
          const messageData = {
            wid: content.attrs["call-id"],
            ticketId: ticket.id,
            contactId: contact.id,
            body,
            fromMe: false,
            mediaType: "call_log",
            read: true,
            quotedMsgId: null,
            ack: 1
          };

          await ticket.update({ lastMessage: body });

          if (ticket.status === "closed") {
            await ticket.update({ status: "pending" });
          }

          return CreateMessageService({ messageData, companyId });
        }
      }
    });

    function cleanStringForJSON(str: string): string {
      return str.replace(/[\x00-\x1F"\\']/g, "");
    }

    wbot.ev.on("contacts.upsert", async (contacts: BContact[]) => {
      // ✅ Declaração no escopo correto para ser usada em múltiplos blocos
      let filteredContacts: FilteredContact[] = [];

      // ─── ⚡ OTIMIZAÇÃO: Captura de fotos de perfil ─────────────────────
      // Antes: N queries (1 para cada contato) - Problema N+1
      // Agora: 1 ÚNICA query buscando todos os contatos de uma vez
      try {
        const contactsWithImg: {
          id: string;
          number: string;
          imgUrl: string;
        }[] = [];

        for (const contact of contacts) {
          if (!contact?.id) continue;
          if (contact.id.includes("@g.us")) continue;

          const imgUrl = (contact as any).imgUrl;
          if (
            imgUrl &&
            imgUrl !== "changed" &&
            imgUrl !== "removed" &&
            imgUrl.startsWith("http")
          ) {
            const number = contact.id
              .replace("@s.whatsapp.net", "")
              .replace("@lid", "")
              .split(":")[0];
            contactsWithImg.push({ id: contact.id, number, imgUrl });
          }
        }

        if (contactsWithImg.length > 0) {
          const numbers = contactsWithImg.map(c => c.number);

          // ✅ UMA ÚNICA QUERY em vez de N queries
          const dbContacts = await Contact.findAll({
            where: {
              companyId,
              number: { [Op.in]: numbers },
              profilePicUrl: { [Op.or]: [null, ""] } // Só traz os que ainda não têm foto
            }
          });

          for (const dbContact of dbContacts) {
            const imgData = contactsWithImg.find(
              c => c.number === dbContact.number
            );
            if (imgData) {
              try {
                logger.info(
                  `[UPSERT-PIC] Foto recebida para ${dbContact.number}: ${imgData.imgUrl}`
                );
                await cacheLayer.set(
                  `pic:${companyId}:${imgData.id}`,
                  imgData.imgUrl,
                  "EX",
                  3600
                );
                await CreateOrUpdateContactService({
                  name: dbContact.name,
                  number: dbContact.number,
                  companyId,
                  profilePicUrl: imgData.imgUrl,
                  isGroup: false
                });
              } catch (picErr: any) {
                logger.warn(
                  `[UPSERT-PIC] Erro ao processar foto para ${dbContact.number}: ${picErr?.message}`
                );
              }
            }
          }
        }
      } catch (err) {
        logger.warn(
          `[UPSERT-PIC] Erro geral no processamento de fotos: ${
            (err as Error).message
          }`
        );
      }

      // ─── ✅ BUG 1 CORRIGIDO: Promise.all com await ─────────────────────
      // ─── ✅ BUG 3 CORRIGIDO: Uso de fs.promises ─────────────────────────
      try {
        filteredContacts = (
          await Promise.all(
            contacts.map(async contact => {
              const jid = contact?.id || "";

              if (
                !isJidBroadcast(contact.id) &&
                !isJidStatusBroadcast(contact.id) &&
                jid.endsWith(contact.id)
              ) {
                return {
                  id: contact.id,
                  name: contact.name
                    ? cleanStringForJSON(contact.name)
                    : contact.id.split("@")[0].split(":")[0]
                };
              }
              return null;
            })
          )
        ).filter((c): c is FilteredContact => c !== null);

        const publicFolder = path.resolve(
          __dirname,
          "..",
          "..",
          "..",
          "public"
        );
        const companyFolder = path.join(publicFolder, `company${companyId}`);

        // ✅ BUG 3 CORRIGIDO: Tudo assíncrono agora
        await fs.promises.mkdir(companyFolder, { recursive: true });
        await fs.promises.chmod(companyFolder, 0o777);

        const contactJsonPath = path.join(companyFolder, "contactJson.txt");

        // ✅ Remove arquivo antigo de forma assíncrona e segura
        try {
          await fs.promises.unlink(contactJsonPath);
        } catch (unlinkErr: any) {
          // ENOENT = arquivo não existe, o que é ok
          if (unlinkErr.code !== "ENOENT") {
            logger.warn(
              `Erro ao remover contactJson antigo: ${unlinkErr.message}`
            );
          }
        }

        await fs.promises.writeFile(
          contactJsonPath,
          JSON.stringify(filteredContacts, null, 2)
        );
      } catch (err) {
        Sentry.captureException(err);
        logger.error(`Erro contacts.upsert: ${JSON.stringify(err)}`);
      }

      try {
        if (Array.isArray(filteredContacts) && filteredContacts.length > 0) {
          await createOrUpdateBaileysService({
            whatsappId: whatsapp.id,
            contacts: filteredContacts
          });
        } else {
          logger.info(
            `[RDS-BAILEYS] Pulando atualização de contatos - formato inválido ou vazio para whatsapp ${whatsapp.id}`
          );
        }
      } catch (err) {
        logger.error(
          `[RDS-BAILEYS] Erro ao atualizar contatos para whatsapp ${whatsapp.id}:`,
          err
        );
        logger.info(
          `[RDS-BAILEYS] Número de contatos tentados: ${
            filteredContacts?.length || "undefined"
          }`
        );
      }
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};

export default wbotMonitor;
