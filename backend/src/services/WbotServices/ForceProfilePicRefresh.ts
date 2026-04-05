import fs from "fs";
import path, { join } from "path";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";
import { isNil } from "lodash";
import axios from "axios";

const ForceProfilePicRefresh = async (
  contactId: number | string,
  companyId: number
): Promise<{ contact: Contact; updated: boolean }> => {
  const contact = await Contact.findOne({
    where: { id: contactId, companyId }
  });

  if (!contact) {
    throw new Error("Contato não encontrado");
  }

  if (contact.isGroup || !contact.remoteJid) {
    return { contact, updated: false };
  }

  const publicFolder = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "public"
  );

  const folder = path.resolve(publicFolder, `company${companyId}`, "contacts");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    fs.chmodSync(folder, 0o777);
  }

  const oldUrlPicture = contact.urlPicture;

  try {
    const defaultWhatsapp = await GetDefaultWhatsApp(companyId);
    const wbot = await getWbot(defaultWhatsapp.id);

    const profilePicUrl = await wbot.profilePictureUrl(
      contact.remoteJid,
      "image"
    );

    if (!profilePicUrl || profilePicUrl.includes("nopicture")) {
      logger.info(
        `[PIC-REFRESH] Contato ${contact.number} não possui foto de perfil válida`
      );
      return { contact, updated: false };
    }

    const filename = `${contact.id}.jpeg`;
    const filePath = join(folder, filename);

    // Baixa a nova foto do WhatsApp
    const response = await axios.get(profilePicUrl, {
      responseType: "arraybuffer"
    });
    fs.writeFileSync(filePath, response.data);

    // Remove arquivo antigo se diferente
    if (
      oldUrlPicture &&
      oldUrlPicture !== filename &&
      !oldUrlPicture.includes("nopicture")
    ) {
      const oldBaseName = oldUrlPicture.replace(/\\/g, "/").split("/").pop();
      if (oldBaseName) {
        const oldFile = path.join(folder, oldBaseName);
        if (fs.existsSync(oldFile)) {
          fs.unlinkSync(oldFile);
        }
      }
    }

    await contact.update({
      profilePicUrl,
      urlPicture: filename,
      pictureUpdated: true
    });

    await contact.reload();

    logger.info(
      `[PIC-REFRESH] Foto de perfil atualizada para contato ${contact.number}`
    );

    return { contact, updated: true };
  } catch (error) {
    logger.error(
      `[PIC-REFRESH] Erro ao atualizar foto de ${contact.number}: ${error.message}`
    );
    return { contact, updated: false };
  }
};

export default ForceProfilePicRefresh;
