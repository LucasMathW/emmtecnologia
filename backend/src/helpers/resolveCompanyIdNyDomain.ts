// services/CompanyServices/ResolveCompanyByDomain.ts
import Company from "../models/Company";

interface Params {
  host?: string;
}

const ResolveCompanyByDomain = async (
  host?: string
): Promise<number | null> => {
  if (!host) return null;

  // remove porta (ex: localhost:3000)
  const cleanHost = host.split(":")[0];

  const company = await Company.findOne({
    where: { domain: cleanHost }
  });

  return company?.id ?? null;
};

export default ResolveCompanyByDomain;
