// import Contact from "../../models/Contact";
// import AppError from "../../errors/AppError";

// const DeleteContactService = async (id: string): Promise<void> => {
//   const contact = await Contact.findOne({
//     where: { id }
//   });

//   if (!contact) {
//     throw new AppError("ERR_NO_CONTACT_FOUND", 404);
//   }

//   await contact.destroy();
// };

// export default DeleteContactService;

import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import cacheLayer from "../../libs/cache";
import { memoryCache } from "../../services/WbotServices/verifyContact";

const DeleteContactService = async (id: string): Promise<void> => {
  const contact = await Contact.findOne({
    where: { id }
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  // ─── INÍCIO DA LIMPEZA DE CACHE ─────────────────────────────────────────

  // 1. Limpa Cache L2 (Redis) do contato
  if (contact.number) {
    const contactCacheKey = `contact:known:${contact.companyId}:${contact.number}`;
    await cacheLayer.del(contactCacheKey);
  }

  // 2. Limpa Cache L1 (Memória) do contato
  if (contact.number) {
    const contactCacheKey = `contact:known:${contact.companyId}:${contact.number}`;
    memoryCache.delete(contactCacheKey);
  }

  // 3. Limpa Cache de Foto (Redis) para evitar fotos antigas ou 'none'
  if (contact.remoteJid) {
    const picCacheKey = `pic:${contact.companyId}:${contact.remoteJid}`;
    await cacheLayer.del(picCacheKey);
  }
  if (contact.number) {
    const picCacheKey2 = `pic:${contact.companyId}:${contact.number}@s.whatsapp.net`;
    await cacheLayer.del(picCacheKey2);
  }

  // ─── FIM DA LIMPEZA DE CACHE ───────────────────────────────────────────

  await contact.destroy();
};

export default DeleteContactService;
