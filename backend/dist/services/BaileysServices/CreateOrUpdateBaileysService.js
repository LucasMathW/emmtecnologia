"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Baileys_1 = __importDefault(require("../../models/Baileys"));
const createOrUpdateBaileysService = async ({ whatsappId, contacts, chats, }) => {
    try {
        const baileysExists = await Baileys_1.default.findOne({
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
                }
                else if (Array.isArray(baileysExists.chats)) {
                    getChats = baileysExists.chats;
                }
            }
            catch (parseError) {
                console.log('[RDS-BAILEYS] Erro ao fazer parse dos chats:', parseError);
                // Continua com array vazio em caso de erro
            }
            // Parse seguro para contatos
            try {
                if (baileysExists.contacts && typeof baileysExists.contacts === 'string') {
                    getContacts = JSON.parse(baileysExists.contacts);
                }
                else if (Array.isArray(baileysExists.contacts)) {
                    getContacts = baileysExists.contacts;
                }
            }
            catch (parseError) {
                console.log('[RDS-BAILEYS] Erro ao fazer parse dos contatos:', parseError);
                // Continua com array vazio em caso de erro
            }
            if (chats) {
                getChats.push(...chats);
                getChats.sort();
                const newChats = getChats.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);
                return await baileysExists.update({
                    chats: JSON.stringify(newChats),
                });
            }
            if (contacts) {
                getContacts.push(...contacts);
                getContacts.sort();
                const newContacts = getContacts.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);
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
        }
        catch (prepError) {
            console.log('[RDS-BAILEYS] Erro ao preparar dados para criar registro:', prepError);
        }
        const baileys = await Baileys_1.default.create({
            whatsappId,
            contacts: JSON.stringify(contactsToSave),
            chats: JSON.stringify(chatsToSave)
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        return baileys;
    }
    catch (error) {
        console.log(error, whatsappId, contacts);
        throw new Error(error);
    }
};
exports.default = createOrUpdateBaileysService;
