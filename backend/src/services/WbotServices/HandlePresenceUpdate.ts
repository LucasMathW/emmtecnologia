import { getIO } from "../../libs/socket";

interface PresencePayload {
  remoteJid: string;
  companyId: number;
  status: "typing" | "paused" | "online" | "offline";
}

export const handlePresenceUpdate = ({
  remoteJid,
  companyId,
  status
}: PresencePayload) => {
  const io = getIO();

  io.of(String(companyId)).emit(`company-${companyId}-presence`, {
    chatId: remoteJid,
    status
  });
};
