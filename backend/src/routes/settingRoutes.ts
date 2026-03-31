import { Router } from "express";
import isAuth from "../middleware/isAuth";
import envTokenAuth from "../middleware/envTokenAuth";
import multer from "multer";

import * as SettingController from "../controllers/SettingController";
import isSuper from "../middleware/isSuper";
import uploadConfig from "../config/upload";
import uploadPrivateConfig from "../config/privateFiles";
import resolveCompany from "../middleware/resolveCompany";

const upload = multer(uploadConfig);
const uploadPrivate = multer(uploadPrivateConfig);

const settingRoutes = Router();

settingRoutes.get("/settings", isAuth, SettingController.index as any);

settingRoutes.get(
  "/settings/:settingKey",
  isAuth,
  SettingController.showOne as any
);

// change setting key to key in future
settingRoutes.put(
  "/settings/:settingKey",
  isAuth,
  SettingController.update as any
);

settingRoutes.get(
  "/setting/:settingKey",
  isAuth,
  SettingController.getSetting as any
);

settingRoutes.put(
  "/setting/:settingKey",
  isAuth,
  SettingController.updateOne as any
);

settingRoutes.get(
  "/public-settings/:settingKey",
  envTokenAuth,
  resolveCompany,
  SettingController.publicShow as any
);

settingRoutes.post(
  "/settings-whitelabel/logo",
  isAuth,
  upload.single("file"),
  SettingController.storeLogo as any
);

settingRoutes.post(
  "/settings/privateFile",
  isAuth,
  uploadPrivate.single("file"),
  SettingController.storePrivateFile as any
);

settingRoutes.get(
  "/resolve-company",
  resolveCompany,
  SettingController.resolveCompany
);

export default settingRoutes;
