import { getWbot } from "../libs/wbot";
import { handleMessage } from "../services/WbotServices/wbotMessageListener";

export default {
    key: `${process.env.DB_NAME}-handleMessage`,

    async handle({ data }) {
        try {
            const { message, wbot, companyId } = data;

            if (message === undefined || wbot === undefined || companyId === undefined) {
            }

            const w = await getWbot(wbot);

            if (!w) {
            }

            try {
                await handleMessage(message, w, companyId);
            } catch (error) {
            }
        } catch (error) {
        }
    },
};

