import { Request, Response, NextFunction } from "express";
import ResolveCompanyByDomain from "../helpers/resolveCompanyIdNyDomain";
import logger from "../utils/logger";

const resolveCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // console.log(`req =>`, req.headers);

  const raw =
    (req.headers["x-app-domain"] as string) ||
    (req.headers["x-forwarded-host"] as string) ||
    req.headers.host ||
    req.headers.origin ||
    req.headers.referer ||
    "";

  let cleanHost = raw;


  try {
    cleanHost = raw.startsWith("http")
      ? new URL(raw).hostname
      : raw.split(":")[0].toLowerCase().trim();
  } catch {
    cleanHost = raw.split(":")[0].toLowerCase().trim();
  }


  const companyId = await ResolveCompanyByDomain(cleanHost);


  if (!companyId) {
    res.status(404).json({
      error: "Empresa não encontrada para este domínio",
      domain: cleanHost
    });
    return;
  }

  // ✅ Injeta no req — disponível em todos os controllers
  req.companyId = companyId;
  next();
};

export default resolveCompany;
