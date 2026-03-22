// services/SendWhatsappReactionService.ts
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Contact from "../../models/Contact";
import { normalizeJid } from "../../utils";
import Whatsapp from "../../models/Whatsapp";
import { getWbot } from "../../libs/wbot";
import logger from "../../utils/logger";

interface Request {
  messageWid: string;
  emoji: string;
  ticket: Ticket;
}

//   messageWid,
//   emoji,
//   ticket
// }: Request): Promise<void> => {
//   try {
//     const wbot = await GetTicketWbot(ticket);
//     const contactNumber = await Contact.findByPk(ticket.contactId);

//     if (!contactNumber) {
//       throw new AppError("Contato do ticket não encontrado");
//     }

//     // Sempre envie para o JID tradicional
//     let jid = `${contactNumber.number}@${
//       ticket.isGroup ? "g.us" : "s.whatsapp.net"
//     }`;
//     jid = normalizeJid(jid);

//     logger.info(
//       `[REACTION] Enviando reação ${emoji} para mensagem ${messageWid}`
//     );

//     // ✅ MESMO PADRÃO DO ENVIO DE MENSAGEM!
//     const sentMessage = await wbot.sendMessage(jid, {
//       react: {
//         text: emoji,
//         key: {
//           remoteJid: jid,
//           fromMe: true,
//           id: String(messageWid) // WID da mensagem original
//         }
//       }
//     });
//     logger.info(
//       `[REACTION] Reação enviada com sucesso para mensagem ${messageWid}`
//     );
//   } catch (err) {
//     logger.error(`[REACTION] Erro ao enviar reação: ${err.message}`);
//     throw new AppError("ERR_SENDING_REACTION");
//   }
// };

const SendWhatsAppReactionService = async ({
  messageWid,
  emoji,
  ticket
}: Request): Promise<void> => {
  try {
    const wbot = await GetTicketWbot(ticket);
    const contact = await Contact.findByPk(ticket.contactId);

    if (!contact) {
      throw new AppError("Contato não encontrado");
    }

    const originalMessage = await Message.findOne({
      where: {
        wid: messageWid,
        companyId: ticket.companyId
      }
    });

    if (!originalMessage) {
      throw new AppError("Mensagem original não encontrada");
    }

    const reactionKey: any = {
      id: originalMessage.wid,
      remoteJid: originalMessage.remoteJid,
      fromMe: originalMessage.fromMe
    };

    console.log(`reactionKey:${JSON.stringify(reactionKey)}`);

    if (originalMessage.participant) {
      reactionKey.participant = originalMessage.participant;
    }

    await wbot.sendMessage(originalMessage.remoteJid, {
      react: {
        text: emoji || "", // 🔥 "" REMOVE | emoji aplica
        key: reactionKey
      }
    });
  } catch (err) {
    throw new AppError("ERR_SENDING_REACTION");
  }
};

export default SendWhatsAppReactionService;
