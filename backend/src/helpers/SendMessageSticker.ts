import path from "path";
import fs from "fs";
import sharp from "sharp";
import { getWbot } from "../libs/wbot";
import Contact from "../models/Contact";
import { normalizeJid } from "../utils";

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
  try {
    const wbot = await getWbot(whatsappId);
    const contactNumber = await Contact.findByPk(stickerData.number);

    let jid;
    if (contactNumber?.lid && contactNumber.lid !== "") {
      jid = contactNumber.lid;
    } else if (contactNumber?.remoteJid && contactNumber.remoteJid.includes("@")) {
      jid = contactNumber.remoteJid;
    } else {
      jid = `${contactNumber?.number}@${isGroup ? 'g.us' : 's.whatsapp.net'}`;
    }
    jid = normalizeJid(jid);

    const stickerPath = await convertToSticker(stickerData.mediaPath);
    const stickerBuffer = fs.readFileSync(stickerPath);

    const message = await wbot.sendMessage(jid, {
      sticker: stickerBuffer
    });

    // Cleanup
    if (stickerPath !== stickerData.mediaPath && fs.existsSync(stickerPath)) {
      fs.unlinkSync(stickerPath);
    }

    return message;
  } catch (err: any) {
    throw new Error(err);
  }
};
