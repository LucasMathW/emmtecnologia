"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CallHistory_1 = __importDefault(require("../../models/CallHistory"));
const createCallHistorical = async (body) => {
    try {
        return await CallHistory_1.default.create(body);
    }
    catch (error) {
        console.log('createCallHistorical', error);
        throw new Error(error);
    }
};
exports.default = createCallHistorical;
