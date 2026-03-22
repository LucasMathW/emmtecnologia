// types/WAMessageSafe.ts
import { proto, WAMessage } from "baileys";

export type KeyWithAlt = proto.MessageKey & {
  remoteJidAlt?: string | null;
};

export type ReactionType =
  | proto.IReaction
  | proto.RecentEmojiWeight
  | proto.Reaction
  | { key?: proto.MessageKey; text?: string; [key: string]: any };

export type WAMessageSafe =
  | WAMessage
  | (proto.IWebMessageInfo & { key: KeyWithAlt });
