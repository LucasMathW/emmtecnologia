import pino from "pino";
import moment from "moment-timezone";

// Função para obter o timestamp com fuso horário
const timezoned = () => {
  return moment().tz("America/Sao_Paulo").format("DD-MM-YYYY HH:mm:ss");
};

type LogArgs =
  | [obj: object, msg?: string, ...args: any[]]
  | [msg: string, ...args: any[]];

export const debugLog = (...args) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("[DEBUG]", ...args);
  }
};

export const warnLog = (...args: Parameters<typeof logger.warn>) => {
  logger.warn(...args);
};

export const infoLog = (...args: Parameters<typeof logger.info>) => {
  logger.info(...args);
};

export const errorLog = (...args: Parameters<typeof logger.error>) => {
  logger.error(...args);
};

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: "SYS:dd-mm-yyyy HH:MM:ss", // Use this para tradução de tempo
      ignore: "pid,hostname"
    }
  },
  timestamp: () => `,"time":"${timezoned()}"` // Adiciona o timestamp formatado
});

export default logger;
