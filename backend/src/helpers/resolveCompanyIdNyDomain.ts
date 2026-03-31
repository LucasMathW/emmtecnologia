import Company from "../models/Company";
import Cache from "../libs/cache"; // ← seu CacheSingleton

const CACHE_TTL = 60 * 60; // 1 hora

const ResolveCompanyByDomain = async (
  host?: string
): Promise<number | null> => {
  if (!host) return null;

  const cleanHost = host.split(":")[0].toLowerCase().trim();
  if (!cleanHost) return null;

  const cacheKey = `company:domain:${cleanHost}`;

  // 1. Tenta cache Redis
  const cached = await Cache.get(cacheKey);
  if (cached) {
    return parseInt(cached, 10);
  }

  // 2. Busca no banco
  const company = await Company.findOne({
    where: { domain: cleanHost },
    attributes: ["id"]
  });

  if (!company) return null;

  // 3. Salva no Redis com TTL de 1h
  await Cache.set(cacheKey, String(company.id), "EX", CACHE_TTL);

  return company.id;
};

export default ResolveCompanyByDomain;

// services/CompanyServices/ResolveCompanyByDomain.ts
// import Company from "../models/Company";

// interface Params {
//   host?: string;
// }

// const ResolveCompanyByDomain = async (
//   host?: string
// ): Promise<number | null> => {
//   if (!host) return null;

//   // remove porta (ex: localhost:3000)
//   const cleanHost = host.split(":")[0];

//   const company = await Company.findOne({
//     where: { domain: cleanHost }
//   });

//   return company?.id ?? null;
// };

// export default ResolveCompanyByDomain;
