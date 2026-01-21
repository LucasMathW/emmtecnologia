"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webHook = exports.index = void 0;
const cryptoMod = (() => {
    try {
        // carrega crypto de forma dinâmica, evitando erro de tipagem em ambientes sem @types/node
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require("crypto");
    }
    catch {
        return null;
    }
})();
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const facebookMessageListener_1 = require("../services/FacebookServices/facebookMessageListener");
// import { handleMessage } from "../services/FacebookServices/facebookMessageListener";
const index = async (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "whaticket";
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        }
    }
    return res.status(403).json({
        message: "Forbidden"
    });
};
exports.index = index;
const webHook = async (req, res) => {
    try {
        // Verificação opcional de assinatura do webhook (X-Hub-Signature-256)
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        const signatureHeader = (req.headers["x-hub-signature-256"] || "");
        if (cryptoMod && appSecret && signatureHeader && typeof req.rawBody === "string") {
            const expected = "sha256=" + cryptoMod.createHmac("sha256", appSecret).update(req.rawBody).digest("hex");
            if (expected !== signatureHeader) {
                return res.status(403).json({ message: "Invalid signature" });
            }
        }
        const { body } = req;
        if (body.object === "page" || body.object === "instagram") {
            let channel;
            if (body.object === "page") {
                channel = "facebook";
            }
            else {
                channel = "instagram";
            }
            body.entry?.forEach(async (entry) => {
                const getTokenPage = await Whatsapp_1.default.findOne({
                    where: {
                        facebookPageUserId: entry.id,
                        channel
                    }
                });
                if (!getTokenPage)
                    return;
                if (Array.isArray(entry.messaging)) {
                    entry.messaging.forEach((data) => {
                        (0, facebookMessageListener_1.handleMessage)(getTokenPage, data, channel, getTokenPage.companyId);
                    });
                }
                // Suporte a Instagram: eventos vêm em entry.changes[].value
                if (channel === "instagram" && Array.isArray(entry.changes)) {
                    entry.changes.forEach((chg) => {
                        if (chg?.field === "messages" && chg?.value) {
                            const v = chg.value;
                            // Normaliza para o formato esperado por handleMessage
                            const normalized = {
                                sender: { id: v.sender?.id },
                                recipient: { id: v.recipient?.id },
                                timestamp: v.timestamp,
                                message: v.message
                            };
                            (0, facebookMessageListener_1.handleMessage)(getTokenPage, normalized, channel, getTokenPage.companyId);
                        }
                    });
                }
            });
            return res.status(200).json({
                message: "EVENT_RECEIVED"
            });
        }
        return res.status(404).json({
            message: body
        });
    }
    catch (error) {
        return res.status(500).json({
            message: error
        });
    }
};
exports.webHook = webHook;
