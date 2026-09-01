import { Request, Response } from "express";
import AppError from "../errors/AppError";
import UserSticker from "../models/UserSticker";
import { getRequestParam } from "../helpers/getRequestParam";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { id: userId, companyId } = req.user;

  const userStickers = await UserSticker.findAll({
    where: { userId, companyId },
    order: [["createdAt", "DESC"]]
  });

  const stickers = userStickers.map(sticker => ({
    id: sticker.id,
    mediaUrl: sticker.publicUrl,
    name: sticker.name,
    createdAt: sticker.createdAt
  }));

  return res.json(stickers);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { id: userId, companyId } = req.user;
  const { mediaUrl, name } = req.body;

  if (!mediaUrl) {
    throw new AppError("ERR_MEDIA_URL_REQUIRED", 400);
  }

  const relativePath = mediaUrl.includes("/public/")
    ? mediaUrl.split("/public/")[1]
    : mediaUrl;

  const userSticker = await UserSticker.create({
    userId,
    companyId,
    mediaUrl: relativePath,
    name
  });

  return res.status(201).json({
    id: userSticker.id,
    mediaUrl: userSticker.publicUrl,
    name: userSticker.name,
    createdAt: userSticker.createdAt
  });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id: userId, companyId } = req.user;
  const id = getRequestParam(req.params.id, "id");

  const userSticker = await UserSticker.findOne({
    where: { id, userId, companyId }
  });

  if (!userSticker) {
    throw new AppError("ERR_USER_STICKER_NOT_FOUND", 404);
  }

  await userSticker.destroy();

  return res.status(200).json({ message: "Sticker removido" });
};
