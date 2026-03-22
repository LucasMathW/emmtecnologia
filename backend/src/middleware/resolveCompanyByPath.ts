import { Request, Response, NextFunction } from "express";
import Company from "../models/Company";

export const resolveCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const rawSlug = req.headers["x-company-slug"];

  if (!rawSlug || typeof rawSlug !== "string") {
    return next();
  }

  const slug = rawSlug.toLowerCase().trim();

  // 🔥 ignora rotas reservadas
  const reserved = ["login", "register", "forgot", "reset"];
  if (reserved.includes(slug)) {
    return next();
  }

  const company = await Company.findOne({ where: { slug } });

  if (!company) {
    return next(); // NÃO bloqueia
  }

  req.companyId = company.id;
  next();
};
