import { Request, Response } from "express";

import {
  CreateOrUpdateReactionService,
  ListMessageReactionsService,
  RemoveReactionService
} from "../services/MessageServices/MessageReactionService";

export const store = async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const { id: userId, companyId } = req.user;

  const reaction = await CreateOrUpdateReactionService({
    messageId: Number(messageId),
    emoji,
    userId,
    companyId
  });

  return res.json(reaction);
};

export const index = async (req: Request, res: Response) => {
  const { messageId } = req.params;

  const reactions = await ListMessageReactionsService(Number(messageId));

  return res.json(reactions);
};

export const remove = async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { id: userId, companyId } = req.user;

  await RemoveReactionService({
    messageId: Number(messageId),
    userId,
    companyId
  });

  return res.send();
};
