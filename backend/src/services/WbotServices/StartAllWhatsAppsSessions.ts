import logger from "../../utils/logger";
import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import * as Sentry from "@sentry/node";

// export const StartAllWhatsAppsSessions = async (
//   companyId: number
// ): Promise<void> => {
//   try {
//     const whatsapps = await ListWhatsAppsService({ companyId });
//     if (whatsapps.length > 0) {
//       const promises = whatsapps.map(async whatsapp => {
//         if (
//           whatsapp.channel === "whatsapp" &&
//           whatsapp.status !== "DISCONNECTED"
//         ) {
//           return StartWhatsAppSession(whatsapp, companyId);
//         }
//       });
//       // Aguardar a resolução de todas as promessas
//       await Promise.all(promises);
//     }

//     // fechar os tickets automaticamente
//     // if (whatsapps.length > 0) {
//     //   whatsapps.forEach(whatsapp => {
//     //     const timeClosed = whatsapp.expiresTicket ? (((whatsapp.expiresTicket * 60) * 60) * 1000) : 500000;
//     //     setInterval(() => {
//     //       ClosedAllOpenTickets();
//     //     }, timeClosed);
//     //   });
//     // }
//   } catch (e) {
//     Sentry.captureException(e);
//   }
// };

export const StartAllWhatsAppsSessions = async (
  companyId: number
): Promise<void> => {
  try {
    logger.info(`[STARTUP] Iniciando sessões para empresa ${companyId}`);

    const whatsapps = await ListWhatsAppsService({ companyId });
    logger.info(
      `[STARTUP] Encontrados ${whatsapps.length} whatsapps para empresa ${companyId}`
    );

    if (whatsapps.length > 0) {
      const promises = whatsapps.map(async whatsapp => {
        logger.info(
          `[STARTUP] WhatsApp ID: ${whatsapp.id} | channel: ${whatsapp.channel} | status: ${whatsapp.status}`
        );

        if (
          whatsapp.channel === "whatsapp" &&
          whatsapp.status !== "DISCONNECTED"
        ) {
          logger.info(
            `[STARTUP] Iniciando sessão para WhatsApp ID: ${whatsapp.id}`
          );
          return StartWhatsAppSession(whatsapp, companyId);
        } else {
          logger.info(
            `[STARTUP] Pulando WhatsApp ID: ${whatsapp.id} - motivo: channel=${whatsapp.channel} status=${whatsapp.status}`
          );
        }
      });

      await Promise.all(promises);
      logger.info(
        `[STARTUP] Todas sessões da empresa ${companyId} finalizadas`
      );
    } else {
      logger.warn(
        `[STARTUP] Nenhum whatsapp encontrado para empresa ${companyId}`
      );
    }
  } catch (e) {
    logger.error(
      `[STARTUP] ERRO ao iniciar sessões da empresa ${companyId}: ${e.message}`
    );
    Sentry.captureException(e);
  }
};
