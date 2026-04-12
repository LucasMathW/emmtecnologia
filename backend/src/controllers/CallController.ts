import { Request, Response } from "express";
import { Op } from "sequelize";
import createCallHistorical from "../services/CallService/CreateCallService";
import getHistorical from "../services/CallService/GetCallService";
import GetWhatsappUserId from "../services/CallService/GetWhatsappUserId";
import { emitCallHistoryUpdate } from "../libs/socket";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";

interface CallHistorical {
    user_id: number;
    token_wavoip: string;
    whatsapp_id: number;
    contact_id: number;
    company_id: number;
    phone_to: string;
    name: string;
    url: string;
}

export const createCallHistoric = async (req: Request, res: Response): Promise<Response> => {
    const body = req.body as CallHistorical;

    const callHistorical = await createCallHistorical(body);

    if (body.company_id) {
        await emitCallHistoryUpdate(body.company_id, "create", callHistorical);
    }

    return res.status(200).json({ callHistorical });
};

export const createIncomingCallHistory = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { phone_from, duration, status, type, whatsapp_id } = req.body;

        if (!req.user?.companyId) {
            return res.status(401).json({ error: "User not authenticated" });
        }

        const companyId = req.user.companyId;

        let contact = null;
        if (phone_from) {
            const cleanNumber = phone_from.replace(/\D/g, "");
            contact = await Contact.findOne({
                where: {
                    number: { [Op.like]: `%${cleanNumber.slice(-10)}%` },
                    companyId
                }
            });
        }

        const whatsapp = await Whatsapp.findByPk(whatsapp_id);

        const payload: CallHistorical = {
            user_id: null,
            token_wavoip: whatsapp?.wavoip || null,
            whatsapp_id: whatsapp_id || null,
            contact_id: contact?.id || null,
            company_id: companyId,
            phone_to: phone_from || "",
            name: contact?.name || phone_from || "Número desconhecido",
            url: ""
        };

        const callHistorical = await createCallHistorical(payload);
        await emitCallHistoryUpdate(companyId, "create", callHistorical);

        return res.status(200).json({
            callHistorical,
            contactMatched: !!contact
        });
    } catch (error) {
        return res.status(500).json({
            error: error.message || String(error),
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined
        });
    }
};

export const getHistoric = async (req: Request, res: Response) => {
    try {
        const historical = await getHistorical({
            "user_id": parseInt(req.user.id),
            "company_id": req.user.companyId
        });

        return res.status(200).json({ historical });
    } catch (error) {
        logger.error("Erro ao buscar histórico de chamadas:", error instanceof Error ? error.message : String(error));
        return res.status(200).json({
            historical: { resultFinal: [], total: 0, totalReject: 0, totalServed: 0, totalFinish: 0 },
            error: "Serviço de chamadas indisponível no momento"
        });
    }
}

export const getWhatsappUserId = async (req: Request, res: Response): Promise<Response> => {
    const whatsapps = await GetWhatsappUserId(parseInt(req.user.id));
    return res.status(200).json(whatsapps);
};
