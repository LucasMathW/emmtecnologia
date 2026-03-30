import { Request, Response } from "express";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import ListSettingsServiceOne from "../services/SettingServices/ListSettingsServiceOne";
import GetSettingService from "../services/SettingServices/GetSettingService";
import UpdateOneSettingService from "../services/SettingServices/UpdateOneSettingService";
import GetPublicSettingService from "../services/SettingServices/GetPublicSettingService";
import ResolveCompanyByDomain from "../helpers/resolveCompanyIdNyDomain";
import { getRequestParam } from "../helpers/getRequestParam";

type LogoRequest = {
  mode: string;
};

type PrivateFileRequest = {
  settingKey: string;
};

interface Params {
  settingKey: string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  // if (req.user.profile !== "admin") {
  //   throw new AppError("ERR_NO_PERMISSION", 403);
  // }

  const settings = await ListSettingsService({ companyId });

  return res.status(200).json(settings);
};

export const showOne = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const settingKey = getRequestParam(req.params.settingKey, "settingKey");
  const key = Array.isArray(settingKey) ? settingKey[0] : settingKey;

  const settingsTransfTicket = await ListSettingsServiceOne({
    companyId: companyId,
    key: key
  });

  return res.status(200).json(settingsTransfTicket);
};

export const update = async (
  req: Request<Params>,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const key = getRequestParam(req.params.settingKey, "settingKey");
  const { value } = req.body;
  const { companyId } = req.user;

  const setting = await UpdateSettingService({
    key,
    value,
    companyId
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-settings`, {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};

export const getSetting = async (
  req: Request<Params>,
  res: Response
): Promise<Response> => {
  const key = getRequestParam(req.params.settingKey, "settingKey");

  const setting = await GetSettingService({ key });

  return res.status(200).json(setting);
};

export const updateOne = async (
  req: Request<Params>,
  res: Response
): Promise<Response> => {
  const key = getRequestParam(req.params.settingKey, "settingKey");
  const { value } = req.body;

  const setting = await UpdateOneSettingService({
    key,
    value
  });

  return res.status(200).json(setting);
};

export const publicShow = async (
  req: Request<Params>,
  res: Response
): Promise<Response> => {
  const key = getRequestParam(req.params.settingKey, "settingKey");
  const { companyId } = req.query;

  let targetCompanyId = companyId
    ? parseInt(companyId as string, 10)
    : undefined;

  if (!targetCompanyId) {
    const origin =
      req.headers.origin || req.headers.referer || req.headers.host;
    let host: string | undefined;

    if (typeof origin === "string") {
      try {
        host = origin.startsWith("http") ? new URL(origin).host : origin;
      } catch {
        host = origin;
      }
    }

    targetCompanyId = await ResolveCompanyByDomain(host);
  }

  const settingValue = await GetPublicSettingService({
    key,
    companyId: targetCompanyId
  });

  return res.status(200).json(settingValue);
};

export const storeLogo = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const file = req.file as Express.Multer.File;
  const { mode }: LogoRequest = req.body;
  const { companyId } = req.user;
  const validModes = [
    "Light",
    "Dark",
    "Favicon",
    "BackgroundLight",
    "BackgroundDark"
  ];

  if (validModes.indexOf(mode) === -1) {
    return res.status(406);
  }

  if (file && file.mimetype.startsWith("image/")) {
    const setting = await UpdateSettingService({
      key: `appLogo${mode}`,
      value: file.filename,
      companyId
    });

    return res.status(200).json(setting.value);
  }

  return res.status(406);
};

export const storePrivateFile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const file = req.file as Express.Multer.File;
  const { settingKey }: PrivateFileRequest = req.body;
  const { companyId } = req.user;

  const setting = await UpdateSettingService({
    key: `_${settingKey}`,
    value: file.filename,
    companyId
  });

  return res.status(200).json(setting.value);
};

export const resolveCompany = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const forwardedHost = req.headers["x-forwarded-host"];
  const origin = forwardedHost || req.headers.host || req.headers.origin;

  console.log("Headers:", {
    forwardedHost,
    host: req.headers.host,
    origin: req.headers.origin
  });

  let host: string | undefined;
  if (typeof origin === "string") {
    try {
      host = origin.startsWith("http") ? new URL(origin).host : origin;
    } catch {
      host = origin;
    }
  }

  const companyId = await ResolveCompanyByDomain(host);

  if (!companyId) {
    return res.status(404).json({ error: "Company not found" });
  }

  console.log(`ComapnyID:${companyId}`);

  return res.status(200).json({ companyId });
};
