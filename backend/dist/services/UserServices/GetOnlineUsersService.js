"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../../models/User"));
const GetOnlineUsersService = async ({ companyId }) => {
    return User_1.default.findAll({
        where: {
            companyId,
            online: true
        },
        order: [["lastSeen", "DESC"]]
    });
};
exports.default = GetOnlineUsersService;
