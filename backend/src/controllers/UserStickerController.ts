import path from "path";
import fs from "fs";
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import UserSticker from "../models/UserSticker";
import { getRequestParam } from "../helpers/getRequestParam";
import uploadConfig from "../config/upload";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { id: userId, companyId } = req.user;

  const userStickers = await UserSticker.findAll({
    where: { userId, companyId },
    order: [["createdAt", "DESC"]]
  });

  const seen = new Set<string>();
  const stickers = [];
  for (const sticker of userStickers) {
    if (!seen.has(sticker.mediaUrl)) {
      seen.add(sticker.mediaUrl);
      stickers.push({
        id: sticker.id,
        mediaUrl: sticker.publicUrl,
        name: sticker.name,
        createdAt: sticker.createdAt
      });
    }
  }

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

  const existing = await UserSticker.findOne({
    where: { userId, companyId, mediaUrl: relativePath }
  });

  if (existing) {
    return res.status(200).json({
      id: existing.id,
      mediaUrl: existing.publicUrl,
      name: existing.name,
      createdAt: existing.createdAt
    });
  }

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

export const mediaProxy = async (req: Request, res: Response): Promise<void> => {
  const filePath = req.query.path as string;

  if (!filePath) {
    res.status(400).json({ error: "Path required" });
    return;
  }

  const fullPath = path.resolve(uploadConfig.directory, filePath);

  // Previne path traversal
  if (!fullPath.startsWith(uploadConfig.directory + path.sep) && fullPath !== uploadConfig.directory) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.sendFile(fullPath);
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
