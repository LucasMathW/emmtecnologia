import NodeCache from "node-cache";
import Contact from "../models/Contact";

// TTL de 5 minutos — suficiente para uma conversa ativa
const contactCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export const getCachedContact = (companyId: number, number: string) =>
  contactCache.get<Contact>(`${companyId}:${number}`);

export const setCachedContact = (
  companyId: number,
  number: string,
  contact: Contact
) => contactCache.set(`${companyId}:${number}`, contact.toJSON());

export const deleteCachedContact = (companyId: number, number: string) =>
  contactCache.del(`${companyId}:${number}`);
