"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../../models/User"));
const UpdateUserOnlineStatusService = async ({ userId, online }) => {
    await User_1.default.update({
        online,
        lastSeen: new Date()
    }, {
        where: { id: userId }
    });
};
exports.default = UpdateUserOnlineStatusService;
