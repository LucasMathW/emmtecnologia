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
  req: Request,
  res: Response
): Promise<Response> => {
  const { settingKey: key } = req.params;

  // ✅ companyId já vem resolvido pelo middleware resolveCompany
  const companyId = req.companyId;

  if (!companyId) {
    return res.status(404).json({ error: "Empresa não encontrada" });
  }

  // console.log(`companyId:${companyId}`);
  // console.log(`key:${key}`);

  const settingValue = await GetPublicSettingService({ key, companyId });
  console.log(`seetingValue:${settingValue}`);
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

// ✅ Endpoint GET /resolve-company — usado pelo frontend no boot
export const resolveCompany = async (
  req: Request,
  res: Response
): Promise<Response> => {
  // companyId já resolvido pelo middleware
  const { companyId } = req;

  if (!companyId) {
    return res
      .status(404)
      .json({ error: "Empresa não encontrada para este domínio" });
  }

  return res.status(200).json({ companyId });
};
