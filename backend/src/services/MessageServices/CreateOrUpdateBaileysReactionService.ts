import { getIO } from "../../libs/socket";
import Message from "../../models/Message";
import MessageReaction from "../../models/MessageReaction";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import { normalizeJid } from "../../utils/";
import { WAMessageSafe } from "../../@types/WAMessageSafe";
import { WbotSession } from "../../@types/WbotSession";
import cacheLayer from "../../libs/cache";

interface Request {
  message: WAMessageSafe;
  wbot: WbotSession;
  companyId: number;
}

interface ParsedReactionPayload {
  reactedMsgWid: string;
  emoji: string;
  rawJid: string;
  normalizedJid: string;
  number: string;
  isFromMe: boolean;
}

interface ReactionActor {
  userId: number;
  fromJid: string;
}

interface TargetMessageData {
  msg: any;
  originalMessage: any;
}

const parseReactionPayload = (
  message: WAMessageSafe
): ParsedReactionPayload | null => {
  const reaction = message.message?.reactionMessage;
  if (!reaction) return null;

  const reactedMsgWid = reaction.key?.id;
  if (!reactedMsgWid) return null;

  const emoji = reaction.text || "";

  const rawJid =
    message.key.remoteJidAlt ||
    (reaction.key as any).remoteJidAlt ||
    reaction.key.participant ||
    message.key.participant ||
    reaction.key.remoteJid ||
    message.key.remoteJid;

  if (!rawJid) return null;

  const normalizedJid = normalizeJid(rawJid);
  const number = normalizedJid.replace(/\D/g, "");

  return {
    reactedMsgWid,
    emoji,
    rawJid,
    normalizedJid,
    number,
    isFromMe: message.key.fromMe
  };
};

const findTargetMessage = async (
  reactedMsgWid: string,
  companyId: number
): Promise<TargetMessageData | null> => {
  const msg = await Message.findOne({
    where: {
      wid: reactedMsgWid,
      companyId
    },
    attributes: ["id", "ticketId", "fromMe"]
  });

  if (!msg) return null;

  const originalMessage = await Message.findByPk(msg.id, {
    attributes: ["body", "fromMe"]
  });

  return {
    msg,
    originalMessage
  };
};

const loadTicketWithRelations = async (ticketId: number) => {
  return Ticket.findByPk(ticketId, {
    include: [
      { model: Contact, as: "contact" },
      { model: Queue, as: "queue" },
      { model: User, as: "user" },
      { model: Whatsapp, as: "whatsapp" }
    ]
  });
};

// const resolveReactionActor = async ({
//   isFromMe,
//   ticketId,
//   normalizedJid,
//   number,
//   companyId
// }: {
//   isFromMe: boolean;
//   ticketId: number;
//   normalizedJid: string;
//   number: string;
//   companyId: number;
// }): Promise<ReactionActor | null> => {
//   if (isFromMe) {
//     const ticket = await Ticket.findByPk(ticketId, {
//       include: [{ model: Whatsapp, as: "whatsapp" }]
//     });

//     if (!ticket) return null;

//     const agentUser = await User.findOne({
//       where: {
//         id: ticket.userId,
//         companyId
//       }
//     });

//     if (!agentUser) return null;

//     const fromJid = ticket.whatsapp?.number
//       ? `${ticket.whatsapp.number}@s.whatsapp.net`
//       : normalizedJid;

//     return {
//       userId: agentUser.id,
//       fromJid
//     };
//   }

//   const contact = await Contact.findOne({
//     where: { number, companyId }
//   });

//   if (!contact) return null;

//   return {
//     userId: contact.id,
//     fromJid: normalizedJid
//   };
// };

const resolveReactionActor = async ({
  isFromMe,
  ticketId,
  normalizedJid,
  number,
  companyId,
  reactedMsgWid,
  emoji
}: {
  isFromMe: boolean;
  ticketId: number;
  normalizedJid: string;
  number: string;
  companyId: number;
  reactedMsgWid: string;
  emoji: string;
}): Promise<ReactionActor | null> => {
  if (isFromMe) {
    const ticket = await Ticket.findByPk(ticketId, {
      include: [{ model: Whatsapp, as: "whatsapp" }]
    });

    if (!ticket) return null;

    const cacheKeyByEmoji = `reaction:user:${companyId}:${reactedMsgWid}:${
      emoji || "__remove__"
    }`;
    const cacheKeyDefault = `reaction:user:${companyId}:${reactedMsgWid}`;

    const cachedUserId =
      (await cacheLayer.get(cacheKeyByEmoji)) ||
      (await cacheLayer.get(cacheKeyDefault));

    let resolvedUserId: number | null = null;

    if (cachedUserId) {
      resolvedUserId = Number(cachedUserId);
    } else if (ticket.userId) {
      // fallback: mantém o comportamento antigo
      resolvedUserId = ticket.userId;
    }

    if (!resolvedUserId) return null;

    const agentUser = await User.findOne({
      where: {
        id: resolvedUserId,
        companyId
      }
    });

    if (!agentUser) return null;

    const fromJid = ticket.whatsapp?.number
      ? `${ticket.whatsapp.number}@s.whatsapp.net`
      : normalizedJid;

    console.log(
      `[DEBUG][resolveReactionActor] userId:${agentUser.id} fromJid:${fromJid}`
    );

    return {
      userId: agentUser.id,
      fromJid
    };
  }

  const contact = await Contact.findOne({
    where: { number, companyId }
  });

  if (!contact) return null;

  return {
    userId: contact.id,
    fromJid: normalizedJid
  };
};

const emitAppMessageReactionUpdate = ({
  companyId,
  messageId,
  contactId,
  userId,
  emoji,
  fromMe,
  fromJid,
  messagePreview,
  ticketId,
  skipSidebar
}: {
  companyId: number;
  messageId: number;
  contactId: number;
  userId: number;
  emoji: string | null;
  fromJid: string;
  messagePreview: string;
  ticketId: number;
  fromMe: boolean;
  skipSidebar?: boolean;
}) => {
  const io = getIO();
  const nsp = io.of(`/${companyId}`);

  nsp.emit(`company-${companyId}-appMessage`, {
    action: "reaction:update",
    messageId,
    contactId,
    reaction: {
      userId,
      emoji,
      fromJid,
      fromMe,
      messagePreview
    },
    skipSidebar,
    ticketId
  });
};

const emitTicketUpdate = ({
  companyId,
  ticket
}: {
  companyId: number;
  ticket: any;
}) => {
  const io = getIO();
  const nsp = io.of(`/${companyId}`);

  nsp.emit(`company-${companyId}-ticket`, {
    action: "update",
    ticket
  });
};

const handleRemoveReaction = async ({
  companyId,
  msg,
  userId,
  fromJid,
  fromMe,
  originalMessage
}: {
  companyId: number;
  msg: any;
  userId: number;
  fromMe: boolean;
  fromJid: string;
  originalMessage: any;
}): Promise<void> => {
  const currentLastReaction = await MessageReaction.findOne({
    include: [
      {
        model: Message,
        as: "message",
        required: true,
        where: { ticketId: msg.ticketId }
      }
    ],
    order: [["updatedAt", "DESC"]]
  });

  const ticket = await loadTicketWithRelations(msg.ticketId);
  if (!ticket) return;

  const isRemovingLatest = currentLastReaction?.messageId === msg.id;

  console.log(`isRemovindLatest:${isRemovingLatest}`);

  await MessageReaction.destroy({
    where: { messageId: msg.id, userId }
  });

  emitAppMessageReactionUpdate({
    companyId,
    messageId: msg.id,
    contactId: ticket.contactId,
    userId,
    emoji: null,
    fromJid,
    messagePreview: originalMessage?.body || "",
    skipSidebar: !isRemovingLatest,
    ticketId: msg.ticketId,
    fromMe
  });

  if (!isRemovingLatest) {
    console.log(`🎃🎃🎃ITS NOT THE LAST MESSAGE REACTION FINISH`);
    return;
  }

  console.log(`ticket OK`);

  await ticket.update({
    lastMessageType: "message"
  });

  await ticket.reload();

  emitTicketUpdate({
    companyId,
    ticket
  });
};

const handleUpsertReaction = async ({
  companyId,
  msg,
  userId,
  emoji,
  fromJid,
  originalMessage,
  fromMe
}: {
  companyId: number;
  msg: any;
  userId: number;
  emoji: string;
  fromJid: string;
  originalMessage: any;
  fromMe: boolean;
}): Promise<void> => {
  const [reactionRow] = await MessageReaction.findOrCreate({
    where: { messageId: msg.id, userId },
    defaults: { emoji, fromJid }
  });

  if (reactionRow.emoji !== emoji || reactionRow.fromJid !== fromJid) {
    await reactionRow.update({ emoji, fromJid });
  }

  const ticket = await loadTicketWithRelations(msg.ticketId);
  if (!ticket) return;

  await ticket.update({
    lastMessageType: "reaction"
  });

  emitTicketUpdate({
    companyId,
    ticket
  });

  emitAppMessageReactionUpdate({
    companyId,
    messageId: msg.id,
    contactId: ticket.contactId,
    userId,
    emoji,
    fromJid,
    messagePreview: originalMessage?.body || "",
    fromMe,
    ticketId: msg.ticketId
  });
};

const CreateOrUpdateBaileysReactionService = async ({
  message,
  wbot,
  companyId
}: Request): Promise<void> => {
  const parsed = parseReactionPayload(message);
  if (!parsed) return;

  const targetMessage = await findTargetMessage(
    parsed.reactedMsgWid,
    companyId
  );
  if (!targetMessage) return;

  const { msg, originalMessage } = targetMessage;

  const actor = await resolveReactionActor({
    isFromMe: parsed.isFromMe,
    ticketId: msg.ticketId,
    normalizedJid: parsed.normalizedJid,
    number: parsed.number,
    companyId,
    reactedMsgWid: parsed.reactedMsgWid,
    emoji: parsed.emoji
  });

  if (!actor) return;

  if (!parsed.emoji) {
    await handleRemoveReaction({
      companyId,
      msg,
      userId: actor.userId,
      fromJid: actor.fromJid,
      originalMessage,
      fromMe: parsed.isFromMe || Boolean(originalMessage.getDataValue("fromMe"))
    });
    return;
  }

  const shouldShowPreview =
    parsed.isFromMe || Boolean(originalMessage.getDataValue("fromMe"));

  // console.log(`☢️☢️actor.userID:${actor.userId}☢️☢️`);
  console.log(
    `[DEBUG] originalMessage fromMe: ${originalMessage.getDataValue("fromMe")}`
  );

  await handleUpsertReaction({
    companyId,
    msg,
    userId: actor.userId,
    emoji: parsed.emoji,
    fromJid: actor.fromJid,
    originalMessage,
    fromMe: shouldShowPreview
  });
};

export default CreateOrUpdateBaileysReactionService;
