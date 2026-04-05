import { Chat, Contact } from "baileys";
import Baileys from "../../models/Baileys";

interface Request {
  whatsappId: number;
  contacts?: Contact[];
  chats?: Chat[];
}

const createOrUpdateBaileysService = async ({
  whatsappId,
  contacts,
  chats,
}: Request): Promise<Baileys> => {

  try {
    const baileysExists = await Baileys.findOne({
      where: { whatsappId }
    });

    if (baileysExists) {
      // Adicionado tratamento seguro para parse JSON
      let getChats = [];
      let getContacts = [];
      
      // Parse seguro para chats
      try {
        if (baileysExists.chats && typeof baileysExists.chats === 'string') {
          getChats = JSON.parse(baileysExists.chats);
        } else if (Array.isArray(baileysExists.chats)) {
          getChats = baileysExists.chats;
        }
      } catch (parseError) {
        // Continua com array vazio em caso de erro
      }
      
      // Parse seguro para contatos
      try {
        if (baileysExists.contacts && typeof baileysExists.contacts === 'string') {
          getContacts = JSON.parse(baileysExists.contacts);
        } else if (Array.isArray(baileysExists.contacts)) {
          getContacts = baileysExists.contacts;
        }
      } catch (parseError) {
        // Continua com array vazio em caso de erro
      }

      if (chats) {
        getChats.push(...chats);
        getChats.sort();
        const newChats = getChats.filter((v: Chat, i: number, a: Chat[]) => a.findIndex(v2 => (v2.id === v.id)) === i)

        return await baileysExists.update({
          chats: JSON.stringify(newChats),
        });
      }

      if (contacts) {
        getContacts.push(...contacts);
        getContacts.sort();
        const newContacts = getContacts.filter((v: Contact, i: number, a: Contact[]) => a.findIndex(v2 => (v2.id === v.id)) === i)

        return await baileysExists.update({
          contacts: JSON.stringify(newContacts),
        });
      }

    }

    // Verificar e preparar contatos e chats antes de salvar
    let contactsToSave = [];
    let chatsToSave = [];
    
    try {
      if (contacts) {
        // Garantir que contacts é serializável
        contactsToSave = Array.isArray(contacts) ? contacts : [];
      }
      
      if (chats) {
        // Garantir que chats é serializável
        chatsToSave = Array.isArray(chats) ? chats : [];
      }
    } catch (prepError) {
    }
    
    const baileys = await Baileys.create({
      whatsappId,
      contacts: JSON.stringify(contactsToSave),
      chats: JSON.stringify(chatsToSave)
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    return baileys;
  } catch (error) {
    throw new Error(error);
  }
};

export default createOrUpdateBaileysService;
