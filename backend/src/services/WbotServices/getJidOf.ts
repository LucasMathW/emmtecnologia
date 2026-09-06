import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { normalizeJid } from "../../utils";
import logger from "../../utils/logger";
import { ENABLE_LID_DEBUG } from "../../config/debug";

// Verifica se o número extraído do remoteJid corresponde ao número de telefone do contato.
// Um LID armazenado incorretamente como @s.whatsapp.net terá um número completamente
// diferente do número de telefone real do contato.
function remoteJidMatchesNumber(remoteJid: string, contactNumber: string): boolean {
  if (!contactNumber) return false;
  const jidNum = remoteJid.split('@')[0];
  return (
    jidNum === contactNumber ||
    jidNum.endsWith(contactNumber) ||
    contactNumber.endsWith(jidNum)
  );
}

export function getJidOf(reference: string | Contact | Ticket): string {
  let address = reference;
  let isGroup = false;

  // Extrair endereço e flag de grupo com base no tipo da referência
  if (reference instanceof Contact) {
    isGroup = reference.isGroup;

    if (reference.remoteJid && reference.remoteJid.includes("@") && !reference.remoteJid.includes("@lid")) {
      // Para grupos, remoteJid é sempre correto; para individuais, verificar se
      // o número no remoteJid corresponde ao número do contato (evita usar LID
      // armazenado incorretamente com domínio @s.whatsapp.net)
      const jidMatchesContact = isGroup || remoteJidMatchesNumber(reference.remoteJid, reference.number);
      if (jidMatchesContact) {
        if (ENABLE_LID_DEBUG) {
          logger.info(`[RDS-LID] getJidOf - Usando remoteJid do contato: ${reference.remoteJid}`);
        }
        return normalizeJid(reference.remoteJid);
      }
      if (ENABLE_LID_DEBUG) {
        logger.warn(`[RDS-LID] getJidOf - remoteJid ${reference.remoteJid} não corresponde ao número ${reference.number}, usando number`);
      }
    }

    address = reference.number;
  } else if (reference instanceof Ticket) {
    isGroup = reference.isGroup;

    if (reference.contact?.remoteJid && reference.contact.remoteJid.includes("@") && !reference.contact.remoteJid.includes("@lid")) {
      // Para grupos, remoteJid é sempre correto; para individuais, verificar se
      // o número no remoteJid corresponde ao número do contato (evita usar LID
      // armazenado incorretamente com domínio @s.whatsapp.net)
      const jidMatchesContact = isGroup || remoteJidMatchesNumber(reference.contact.remoteJid, reference.contact.number);
      if (jidMatchesContact) {
        if (ENABLE_LID_DEBUG) {
          logger.info(`[RDS-LID] getJidOf - Usando remoteJid do ticket.contact: ${reference.contact.remoteJid}`);
        }
        return normalizeJid(reference.contact.remoteJid);
      }
      if (ENABLE_LID_DEBUG) {
        logger.warn(`[RDS-LID] getJidOf - remoteJid ${reference.contact.remoteJid} não corresponde ao número ${reference.contact.number}, usando number`);
      }
    }

    address = reference.contact.number;
  }

  if (typeof address !== "string") {
    throw new Error("Invalid reference type");
  }

  if (address.includes("@")) {
    return normalizeJid(address);
  }

  // Construir o JID e normalizar
  const jid = `${address}@${isGroup ? "g.us" : "s.whatsapp.net"}`;
  return normalizeJid(jid);
}
