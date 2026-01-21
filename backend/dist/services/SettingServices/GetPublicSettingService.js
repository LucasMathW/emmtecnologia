"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = __importDefault(require("../../models/Setting"));
const publicSettingsKeys = [
    "userCreation",
    "primaryColorLight",
    "primaryColorDark",
    "appLogoLight",
    "appLogoDark",
    "appLogoFavicon",
    "appName",
    "enabledLanguages",
    "appLogoBackgroundLight",
    "appLogoBackgroundDark"
];
const GetPublicSettingService = async ({ key, companyId }) => {
    if (!publicSettingsKeys.includes(key)) {
        return null;
    }
    const targetCompanyId = companyId || 1;
    const setting = await Setting_1.default.findOne({
        where: {
            companyId: targetCompanyId,
            key
        }
    });
    return setting?.value;
};
exports.default = GetPublicSettingService;
