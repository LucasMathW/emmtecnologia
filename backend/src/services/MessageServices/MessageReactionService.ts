// @ts-nocheck
import AppError from "../../errors/AppError";
import MessageReaction from "../../models/MessageReaction";
import Message from "../../models/Message";
import { getIO } from "../../libs/socket";

interface RequestDTO {
  messageId: number;
  emoji: string;
  userId: number | string;
  companyId: number | string;
}

interface RemoveDTO {
  messageId: number;
  userId: number | string;
  companyId: number | string;
}

export const CreateOrUpdateReactionService = async ({
  messageId,
  emoji,
  userId,
  companyId
}: RequestDTO) => {
  if (!emoji) {
    throw new AppError("Emoji é obrigatório", 400);
  }

  const message = await Message.findByPk(messageId);

  if (!message) {
    throw new AppError("Mensagem não encontrada", 404);
  }

  let reaction = await MessageReaction.findOne({
    where: {
      messageId,
      userId
    }
  });

  if (reaction) {
    reaction.emoji = emoji;
    await reaction.save();
  } else {
    reaction = await MessageReaction.create({
      messageId,
      userId,
      emoji
    });
  }

  const io = getIO();

  io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
    action: "reaction",
    messageId,
    reaction
  });

  return reaction;
};

export const ListMessageReactionsService = async (messageId: number) => {
  const reactions = await MessageReaction.findAll({
    where: { messageId },
    order: [["createdAt", "ASC"]]
  });

  return reactions;
};

export const RemoveReactionService = async ({
  messageId,
  userId,
  companyId
}: RemoveDTO) => {
  const existingReaction = await MessageReaction.findOne({
    where: {
      messageId,
      userId
    }
  });

  if (existingReaction) {
    await MessageReaction.destroy({
      where: {
        messageId,
        userId
      }
    });
  }

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
    action: "reaction:remove", // Ação diferente para remoção!
    messageId,
    userId
  });

  //   await MessageReaction.destroy({
  //     where: {
  //       messageId,
  //       userId
  //     }
  //   });

  //   const io = getIO();

  //   io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
  //     action: "reaction:remove",
  //     messageId,
  //     userId
  //   });
};
