// Simple structured logger for frontend
const isDev = process.env.NODE_ENV === "development";

export const logInfo = (msg, data = {}) => {
  if (!isDev) return;
  try {
    // eslint-disable-next-line no-console
    console.info(`[INFO] ${msg}`, data);
  } catch {}
};

export const logWarn = (msg, data = {}) => {
  try {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${msg}`, data);
  } catch {}
};

export const logError = (msg, err = {}) => {
  try {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${msg}`, err);
  } catch {}
};

export default { logInfo, logWarn, logError };
