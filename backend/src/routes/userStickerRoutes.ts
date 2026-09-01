import express from "express";
import isAuth from "../middleware/isAuth";

import * as UserStickerController from "../controllers/UserStickerController";

const userStickerRoutes = express.Router();

userStickerRoutes.get("/user-stickers", isAuth, UserStickerController.index);

userStickerRoutes.post("/user-stickers", isAuth, UserStickerController.store);

userStickerRoutes.delete(
  "/user-stickers/:id",
  isAuth,
  UserStickerController.remove
);

export default userStickerRoutes;
