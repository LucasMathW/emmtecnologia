import path from "path";
import fs from "fs";
import sharp from "sharp";
import { getWbot } from "../libs/wbot";
import Contact from "../models/Contact";
import { getJidOf } from "../services/WbotServices/getJidOf";

export type StickerData = {
  number?: number | string;
  mediaPath: string;
  mediaName?: string;
};

const convertToSticker = async (inputFile: string): Promise<string> => {
  const parsed = path.parse(inputFile);
  const outputFile = path.join(parsed.dir, `${parsed.name}-${Date.now()}.webp`);

  await sharp(inputFile)
    .resize(512, 512, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({
      lossless: false,
      quality: 80,
      effort: 4
    })
    .toFile(outputFile);

  return outputFile;
};

export const SendMessageSticker = async (
  whatsappId: number,
  stickerData: StickerData,
  isGroup: boolean = false
): Promise<any> => {
  // [PERF] instrumentação temporária para diagnosticar lentidão no envio de mídia
  const __perfStart = Date.now();

  try {
    const __t_getWbot = Date.now();
    const wbot = await getWbot(whatsappId);
    console.log(
      `[PERF][SendMessageSticker] getWbot: ${Date.now() - __t_getWbot}ms`
    );

    const __t_contact = Date.now();
    const contactNumber = await Contact.findByPk(stickerData.number);
    console.log(
      `[PERF][SendMessageSticker] Contact.findByPk: ${
        Date.now() - __t_contact
      }ms`
    );

    if (!contactNumber) {
      throw new Error("Contato não encontrado para envio de figurinha");
    }

    // [FIX-LID] Antes, o jid priorizava contactNumber.lid (identificador
    // numérico interno do WhatsApp, ex: 101756516184214) e o passava direto
    // para normalizeJid, que — por não conter "@" — o tratava como um
    // telefone real e gerava "101756516184214@s.whatsapp.net" (JID inválido).
    // getJidOf é o mesmo helper já usado em SendWhatsAppMedia.ts: prioriza
    // contactNumber.remoteJid (quando já é um JID válido) e, na ausência
    // dele, usa contactNumber.number (o telefone real do contato).
    const jid = getJidOf(contactNumber);

    const __t_convert = Date.now();
    const stickerPath = await convertToSticker(stickerData.mediaPath);
    console.log(
      `[PERF][SendMessageSticker] convertToSticker (sharp): ${
        Date.now() - __t_convert
      }ms`
    );
    const stickerBuffer = fs.readFileSync(stickerPath);

    const __t_sendMessage = Date.now();
    const message = await wbot.sendMessage(jid, {
      sticker: stickerBuffer
    });
    console.log(
      `[PERF][SendMessageSticker] wbot.sendMessage (rede/Baileys): ${
        Date.now() - __t_sendMessage
      }ms`
    );

    // Cleanup
    if (stickerPath !== stickerData.mediaPath && fs.existsSync(stickerPath)) {
      fs.unlinkSync(stickerPath);
    }

    console.log(
      `[PERF][SendMessageSticker] TOTAL: ${Date.now() - __perfStart}ms`
    );

    return message;
  } catch (err: any) {
    throw new Error(err);
  }
};
