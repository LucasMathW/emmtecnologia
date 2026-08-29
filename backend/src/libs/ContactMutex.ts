import { Mutex } from "async-mutex";

const contactMutexMap = new Map<string, Mutex>();

export const getContactMutex = (companyId: number, number: string): Mutex => {
  const key = `${companyId}:${number}`;
  let mutex = contactMutexMap.get(key);
  if (!mutex) {
    mutex = new Mutex();
    contactMutexMap.set(key, mutex);
  }
  return mutex;
};

// Limpeza periódica: só remove mutex que NÃO está travado.
// O setTimeout anterior era agendado na criação e podia remover um mutex
// ainda em uso, permitindo que dois fluxos entrassem na seção crítica.
setInterval(() => {
  for (const [key, mutex] of contactMutexMap.entries()) {
    if (!mutex.isLocked()) {
      contactMutexMap.delete(key);
    }
  }
}, 60_000);
