import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import cacheLayer from "../../libs/cache";
import { memoryCache } from "../../services/WbotServices/verifyContact";

const DeleteContactService = async (id: string): Promise<void> => {
  console.log(`[DELETE-CONTACT] 🚨 Iniciando exclusão do contato ID: ${id}`);

  const contact = await Contact.findOne({
    where: { id }
  });

  if (!contact) {
    console.log(
      `[DELETE-CONTACT] ❌ Contato ID ${id} não encontrado no banco.`
    );
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  console.log(
    `[DELETE-CONTACT] 📋 Dados do contato a ser apagado: ID=${contact.id} | Number=${contact.number} | CompanyID=${contact.companyId} | RemoteJID=${contact.remoteJid}`
  );

  // ─── INÍCIO DA LIMPEZA DE CACHE ─────────────────────────────────────────

  // 1. Limpa Cache L2 (Redis) do contato
  if (contact.number) {
    const contactCacheKey = `contact:known:${contact.companyId}:${contact.number}`;
    console.log(
      `[DELETE-CONTACT] 🧹 Limpando Cache L2 (Redis) principal. Chave: ${contactCacheKey}`
    );
    await cacheLayer.del(contactCacheKey);
    console.log(`[DELETE-CONTACT] ✅ Cache L2 deletado com sucesso.`);
  } else {
    console.log(
      `[DELETE-CONTACT] ⚠️ Contato não possui 'number', pulando limpeza de Cache L2 principal.`
    );
  }

  // 2. Limpa Cache L1 (Memória) do contato
  if (contact.number) {
    const contactCacheKey = `contact:known:${contact.companyId}:${contact.number}`;
    console.log(
      `[DELETE-CONTACT] 🧹 Limpando Cache L1 (Memória). Chave: ${contactCacheKey}`
    );
    memoryCache.delete(contactCacheKey);
    console.log(`[DELETE-CONTACT] ✅ Cache L1 deletado com sucesso.`);
  }

  // 3. Limpa Cache de Foto (Redis) para evitar fotos antigas ou 'none'
  if (contact.remoteJid) {
    const picCacheKey = `pic:${contact.companyId}:${contact.remoteJid}`;
    console.log(
      `[DELETE-CONTACT] 🧹 Limpando Cache de Foto (por remoteJid). Chave: ${picCacheKey}`
    );
    await cacheLayer.del(picCacheKey);
  }

  if (contact.number) {
    const picCacheKey2 = `pic:${contact.companyId}:${contact.number}@s.whatsapp.net`;
    console.log(
      `[DELETE-CONTACT] 🧹 Limpando Cache de Foto (por número). Chave: ${picCacheKey2}`
    );
    await cacheLayer.del(picCacheKey2);
  }

  console.log(`[DELETE-CONTACT] 🏁 Fim da limpeza de caches.`);
  // ─── FIM DA LIMPEZA DE CACHE ───────────────────────────────────────────

  console.log(
    `[DELETE-CONTACT] 💥 Executando contact.destroy() no banco de dados para o ID: ${contact.id}`
  );
  await contact.destroy();
  console.log(
    `[DELETE-CONTACT] ✅ Contato ID ${contact.id} destruído com sucesso no banco de dados.`
  );
};

export default DeleteContactService;
