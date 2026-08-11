import { GroupMetadata, GroupParticipant } from "baileys";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import WhatsappLidMap from "../../models/WhatsapplidMap";
import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";

interface GroupParticipantResponse {
  id: string;
  name: string;
  number: string;
  profilePicUrl: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

interface GetGroupParticipantsRequest {
  contactId: number;
  companyId: number;
}

const GetGroupParticipantsService = async ({
  contactId,
  companyId
}: GetGroupParticipantsRequest): Promise<GroupParticipantResponse[]> => {

  // Buscar o contato do grupo incluindo o whatsapp
  const contact = await Contact.findOne({
    where: {
      id: contactId,
      companyId,
      isGroup: true
    },
    include: [
      {
        model: Whatsapp,
        as: "whatsapp"
      }
    ]
  });

  if (!contact) {
    console.error(`[GetGroupParticipantsService] ERROR: Group contact not found for contactId: ${contactId}`);
    throw new AppError("Grupo não encontrado", 404);
  }

  if (!contact.isGroup) {
    console.error(`[GetGroupParticipantsService] ERROR: Contact is not a group. contactId: ${contactId}, isGroup: ${contact.isGroup}`);
    throw new AppError("Este contato não é um grupo", 400);
  }
 let remoteJid = contact.remoteJid;
  if (!remoteJid && contact.number) {
    remoteJid = contact.number.includes('@g.us') ? contact.number : `${contact.number}@g.us`;
  }

  if (!remoteJid) {
    console.error(`[GetGroupParticipantsService] ERROR: No remoteJid or valid number found for group contact`);
    throw new AppError("Identificador do grupo não encontrado", 400);
  }

  // ─── Resolve wbot + metadados do grupo, com fallback automático ──────────
  // Mesma classe de bug corrigida nas seções 4/5 do RELATORIO-CORRECOES.md
  // (campo de identidade desatualizado em Contact) — aqui é
  // contact.whatsappId, que pode apontar para um chip que não é mais o que
  // realmente movimenta este grupo. Sintomas: getWbot() lança
  // ERR_WAPP_NOT_INITIALIZED (chip desconectado) ou wbot.groupMetadata()
  // lança "forbidden" (chip conectado, mas não é membro deste grupo no
  // WhatsApp — porque o grupo real só tem o OUTRO chip como membro).
  const isRetryableWbotOrMetadataError = (error: any): boolean =>
    !!error?.message &&
    (error.message.includes("ERR_WAPP_NOT_INITIALIZED") ||
      error.message.includes("forbidden"));

  const attemptGroupMetadata = async (
    attemptWhatsappId: number
  ): Promise<{ wbot: any; groupMetadata: GroupMetadata }> => {
    const attemptWbot = await getWbot(attemptWhatsappId); // pode lançar ERR_WAPP_NOT_INITIALIZED
    const attemptMetadata = await attemptWbot.groupMetadata(remoteJid); // pode lançar "forbidden" etc.
    return { wbot: attemptWbot, groupMetadata: attemptMetadata };
  };

  const throwMappedError = (error: any): never => {
    console.error(`[GetGroupParticipantsService] ERROR: ${error?.message}`, error?.stack);

    if (error?.message?.includes("not_found") || error?.message?.includes("item-not-found")) {
      console.error(`[GetGroupParticipantsService] Group not found on WhatsApp: ${remoteJid}`);
      throw new AppError("Grupo não encontrado no WhatsApp", 404);
    }

    if (error?.message?.includes("Connection Closed") || error?.message?.includes("not_connected")) {
      console.error(`[GetGroupParticipantsService] WhatsApp connection error: ${error.message}`);
      throw new AppError("WhatsApp desconectado", 503);
    }

    if (error?.message?.includes("ERR_WAPP_NOT_INITIALIZED")) {
      throw new AppError("WhatsApp não encontrado ou desconectado", 500);
    }

    console.error(`[GetGroupParticipantsService] Unexpected error: ${error?.message}`);
    throw new AppError(`Erro ao buscar participantes do grupo: ${error?.message}`, 500);
  };

  // 1) Tenta normalmente com contact.whatsappId (ou o whatsapp padrão da
  //    empresa, se o contato não tiver um whatsappId gravado) — comportamento
  //    atual, inalterado para os casos que já funcionam.
  const primaryWhatsappId =
    contact.whatsappId ?? (await GetDefaultWhatsApp(companyId)).id;

  let wbot: any;
  let groupMetadata: GroupMetadata;

  try {
    ({ wbot, groupMetadata } = await attemptGroupMetadata(primaryWhatsappId));
  } catch (primaryError: any) {
    console.error(
      `[GetGroupParticipantsService] ERROR getting wbot/metadata (whatsappId=${primaryWhatsappId}): ${primaryError.message}`,
      primaryError.stack
    );

    // 2) Se o erro for do tipo esperado quando o whatsappId do Contact está
    //    desatualizado, tenta de novo com o whatsappId do TICKET mais
    //    recente desse grupo (fonte de verdade mais confiável, pois reflete
    //    por qual chip o grupo está realmente sendo usado agora).
    if (!isRetryableWbotOrMetadataError(primaryError)) {
      throwMappedError(primaryError);
    }

    const latestTicket = await Ticket.findOne({
      where: { contactId, companyId },
      order: [["updatedAt", "DESC"]]
    });

    const fallbackWhatsappId = latestTicket?.whatsappId;

    if (!fallbackWhatsappId || fallbackWhatsappId === primaryWhatsappId) {
      // Não há um whatsappId diferente para tentar — mantém o erro original.
      throwMappedError(primaryError);
    }

    console.warn(
      `[GetGroupParticipantsService] Tentando fallback com whatsappId do ticket mais recente do grupo: ${fallbackWhatsappId} (ticket ${latestTicket.id}, contactId=${contactId})`
    );

    try {
      ({ wbot, groupMetadata } = await attemptGroupMetadata(fallbackWhatsappId));
    } catch (fallbackError: any) {
      console.error(
        `[GetGroupParticipantsService] Fallback com whatsappId=${fallbackWhatsappId} também falhou: ${fallbackError.message}`,
        fallbackError.stack
      );
      // 4) Fallback também falhou — mantém o erro (não força sucesso onde não há).
      throwMappedError(fallbackError);
    }

    // 3) Fallback funcionou: auto-corrige Contact.whatsappId para que
    //    consultas futuras não precisem mais passar pelo fallback (mesmo
    //    padrão de auto-correção de identidade das seções 4/5).
    try {
      await contact.update({ whatsappId: fallbackWhatsappId });
      console.log(
        `[GetGroupParticipantsService] ✅ Fallback funcionou — Contact.whatsappId corrigido de ${primaryWhatsappId} para ${fallbackWhatsappId} (grupo ${contact.id}, "${contact.name}")`
      );
    } catch (updateError: any) {
      // Não deixa uma falha ao persistir a correção derrubar a resposta —
      // os participantes já foram obtidos com sucesso pelo fallback.
      console.error(
        `[GetGroupParticipantsService] Falha ao auto-corrigir Contact.whatsappId (participantes ainda serão retornados normalmente): ${updateError.message}`
      );
    }
  }

  try {
    if (!groupMetadata) {
      console.error(`[GetGroupParticipantsService] ERROR: GroupMetadata not found for remoteJid: ${contact.remoteJid}`);
      return [];
    }

    if (!groupMetadata.participants || groupMetadata.participants.length === 0) {
      return [];
    }

    // ─── Nível 3: fallback de nome via pushName do histórico de mensagens ───
    // wbot.groupMetadata() nunca traz nome de participante (confirmado lendo
    // o código-fonte do Baileys — node_modules/baileys/lib/Socket/groups.js,
    // função extractGroupMetadata: a resposta do WhatsApp só contém
    // jid/lid/phone_number/username/admin, nunca name/notify). Quando não há
    // nenhum Contact vinculado a esse LID, este é o último recurso antes de
    // cair para o número/LID cru: busca a última mensagem que esse
    // participante mandou (Message.participant guarda o mesmo JID usado em
    // groupMetadata) e extrai o pushName (nome que a própria pessoa define no
    // perfil do WhatsApp) do dataJson bruto salvo por wbotMessageListener.ts.
    const resolvePushNameFromHistory = async (
      participantJid: string
    ): Promise<string | null> => {
      try {
        const lastMessage = await Message.findOne({
          where: { companyId, participant: participantJid },
          order: [["createdAt", "DESC"]],
          attributes: ["dataJson"]
        });

        if (!lastMessage?.dataJson) return null;

        const rawMessage = JSON.parse(lastMessage.dataJson);
        const pushName = rawMessage?.pushName;

        return typeof pushName === "string" && pushName.trim() !== ""
          ? pushName.trim()
          : null;
      } catch (error: any) {
        console.error(
          `[GetGroupParticipantsService] Erro ao buscar pushName no histórico para ${participantJid}: ${error.message}`
        );
        return null;
      }
    };

    // Processar cada participante
    const participantsPromises = groupMetadata.participants.map(async (participant: GroupParticipant) => {
      
      // Declarar variáveis
      let participantName = participant.id;
      let profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
      let number = "";
      let actualNumber = "";
      
      try {
        // Buscar foto de perfil do participante (comentado para debug)
        // profilePicUrl = await wbot.profilePictureUrl(participant.id, "image");
      } catch (error) {
        // Usar imagem padrão se não conseguir obter a foto
        profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
      }

      // Extrair número do participante do ID (formato: 5521999999999@s.whatsapp.net ou 5521999999999@lid)
      // Primeiro, remover o sufixo @s.whatsapp.net ou @c.us
      let rawNumber = participant.id;
      
      // Verificar se é um LID (Linked Device ID)
      const isLid = participant.id.endsWith('@lid');
      
      if (isLid) {
        // Se é um LID, extrair apenas o número do LID (sem @lid)
        rawNumber = participant.id.replace('@lid', '');
        number = rawNumber.replace(/\D/g, "");
        
        try {
          // Buscar mapeamento LID na tabela WhatsappLidMap.
          // CORREÇÃO: WhatsappLidMap.lid é sempre gravado com o JID completo
          // ("<dígitos>@lid" — confirmado em verifyContact.ts, queues.ts e
          // scripts/populateContactLids.ts, todos usando o valor retornado
          // por wbot.onWhatsApp().lid direto, sem stripar o sufixo). A busca
          // aqui comparava contra "number" (só dígitos, sem "@lid"), então
          // NUNCA batia com nenhuma linha real — sempre caía no fallback de
          // full-scan abaixo, mesmo quando existia um mapeamento válido.
          const lidMap = await WhatsappLidMap.findOne({
            where: {
              lid: participant.id,
              companyId
            }
          });


          if (lidMap && lidMap.contactId) {
            // Buscar o contato associado ao LID
            const contact = await Contact.findOne({
              where: {
                id: lidMap.contactId,
                companyId
              }
            });

            if (contact) {
              // Usar o número real do contato associado ao LID
              actualNumber = contact.number;
              participantName = contact.name;
            } else {
              const pushName = await resolvePushNameFromHistory(participant.id);
              actualNumber = number;
              participantName = pushName || number;
            }
          } else {
            // CORREÇÃO: removida a busca "const contactByLid = Contact.findOne(...)"
            // que existia aqui — não filtrava por nada específico (nem lid,
            // nem number), então trazia um contato praticamente aleatório da
            // empresa, e o resultado nunca era usado em lugar nenhum abaixo
            // (variável morta, só custo de mais uma query por participante).

            // CORREÇÃO: removido o "limit: 1000" — empresas com mais de 1000
            // contatos individuais (ex: 3049 na company testada) faziam esse
            // full-scan nunca alcançar contatos reais com "lid" corretamente
            // preenchido, já que a consulta não tem "ORDER BY" (ordem
            // arbitrária do Postgres) e o "limit" cortava a busca antes de
            // chegar neles. O branch irmão (não-LID, mais abaixo) já faz essa
            // mesma busca sem limite — aqui só ficou consistente com ele.
            const allContacts = await Contact.findAll({
              where: {
                companyId,
                isGroup: false
              }
            });

            // Tentar encontrar contato pelo LID no campo lid ou por correspondência parcial
            const matchingContact = allContacts.find(c => {
              const contactLid = c.lid?.replace('@lid', '').replace(/\D/g, '') || '';
              return contactLid === number;
            }) || allContacts.find(c => {
              const contactNumber = c.number.replace(/\D/g, '');
              const last10Digits = number.slice(-10);
              const last11Digits = number.slice(-11);
              return contactNumber.endsWith(last10Digits) || contactNumber.endsWith(last11Digits);
            });

            if (matchingContact) {
              actualNumber = matchingContact.number;
              participantName = matchingContact.name;
            } else {
              // Nível 3: nenhum Contact vinculado a esse LID — tenta o
              // pushName da última mensagem desse participante antes de
              // cair para o número/LID cru.
              const pushName = await resolvePushNameFromHistory(participant.id);
              actualNumber = number;
              participantName = pushName || number;
            }
          }
        } catch (error) {
          console.error(`[GetGroupParticipantsService] Error checking LID mapping: ${error.message}`);
          actualNumber = number;
          participantName = number;
        }
      } else {
        // Remover sufixos conhecidos do WhatsApp
        const whatsappSuffixes = ['@s.whatsapp.net', '@c.us', '@g.us'];
        for (const suffix of whatsappSuffixes) {
          if (rawNumber.endsWith(suffix)) {
            rawNumber = rawNumber.replace(suffix, '');
            break;
          }
        }
        
        // Extrair apenas os dígitos do número
        number = rawNumber.replace(/\D/g, "");
        actualNumber = number;

        try {
          
          // Primeiro, buscar contato com número exato
          let existingContact = await Contact.findOne({
            where: {
              number,
              companyId
            }
          });

          // Se não encontrou com número exato, tentar buscar por correspondência parcial
          // Removendo os primeiros dígitos do país/área (últimos 10-11 dígitos)
          if (!existingContact) {
            const last10Digits = number.slice(-10);
            const last11Digits = number.slice(-11);
            
            
            // Buscar contatos que terminem com os últimos 10 ou 11 dígitos
            const contacts = await Contact.findAll({
              where: {
                companyId,
                isGroup: false
              }
            });

            // Filtrar contatos que correspondem parcialmente
            existingContact = contacts.find(contact => {
              const contactNumber = contact.number.replace(/\D/g, "");
              return contactNumber.endsWith(last10Digits) || contactNumber.endsWith(last11Digits);
            }) || null;

            if (existingContact) {
            }
          }

          // Usar nome e número formatado do contato existente
          if (existingContact && existingContact.name && existingContact.name !== number) {
            participantName = existingContact.name;
            actualNumber = existingContact.number;
          } else {
            // Tentar buscar perfil do WhatsApp para obter o nome
            try {
              const profileName = await wbot.getBusinessProfile(participant.id);
              if (profileName && profileName.business) {
                participantName = profileName.business.description || participantName;
              }
            } catch (profileError) {
            }
            
            if (participantName === participant.id || !participantName) {
              participantName = number;
            }
            
          }
        } catch (error) {
          console.error(`[GetGroupParticipantsService] Error checking existing contact for ${number}: ${error.message}`);
          participantName = number;
        }
      }

      // Usar o número real se encontrado, senão usar o número extraído
      const displayNumber = actualNumber || number;
      
      const participantData = {
        id: participant.id,
        name: participantName,
        number: displayNumber,  // Retorna o número real do contato (ou LID se não encontrado)
        profilePicUrl,
        isAdmin: participant.admin === "admin",
        isSuperAdmin: participant.admin === "superadmin"
      };

      return participantData;
    });

    const participants = await Promise.all(participantsPromises);

    // Ordenar participantes: super admins primeiro, depois admins, depois membros normais
    participants.sort((a, b) => {
      if (a.isSuperAdmin && !b.isSuperAdmin) return -1;
      if (!a.isSuperAdmin && b.isSuperAdmin) return 1;
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return a.name.localeCompare(b.name);
    });

    return participants;

  } catch (error) {
    // Erro durante o PROCESSAMENTO dos participantes (não durante a busca do
    // wbot/metadata, que já tem seu próprio tratamento + fallback acima) —
    // reaproveita o mesmo mapeamento de erro para manter as mensagens
    // consistentes.
    console.error(`[GetGroupParticipantsService] ERROR in main try-catch: ${error.message}`, error.stack);
    throwMappedError(error);
  }
};

export default GetGroupParticipantsService;
