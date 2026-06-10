import { Mutex } from "async-mutex";

const contactMutexMap = new Map<string, Mutex>();

export const getContactMutex = (companyId: number, number: string): Mutex => {
  const key = `${companyId}:${number}`;
  if (!contactMutexMap.has(key)) {
    contactMutexMap.set(key, new Mutex());
    setTimeout(() => contactMutexMap.delete(key), 60_000);
  }
  return contactMutexMap.get(key)!;
};
