import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as MessageController from "../controllers/MessageController";
import * as MsgReactionController from "../controllers/MessageReactionController";

const messageRoutes = Router();

const upload = multer(uploadConfig);

messageRoutes.get("/messages/:ticketId", isAuth, MessageController.index);
messageRoutes.post(
  "/messages/:ticketId",
  isAuth,
  upload.array("medias"),
  MessageController.store
);
messageRoutes.post(
  "/messages-template/:ticketId",
  isAuth,
  upload.array("medias"),
  MessageController.storeTemplate
);
messageRoutes.post(
  "/message/transcribeAudio",
  isAuth,
  MessageController.transcribeAudioMessage
);

// messageRoutes.post("/forwardmessage",isAuth,MessageController.forwardmessage);
messageRoutes.delete("/messages/:messageId", isAuth, MessageController.remove);
messageRoutes.post("/messages/edit/:messageId", isAuth, MessageController.edit);
messageRoutes.get("/messages-allMe", isAuth, MessageController.allMe);
messageRoutes.post(
  "/message/forward",
  isAuth,
  MessageController.forwardMessage
);

// REACTION MESSAGE ROUTES
messageRoutes.post(
  "/messages/:messageId/reaction",
  isAuth,
  MsgReactionController.store
);

messageRoutes.get(
  "/messages/:messageId/reaction",
  isAuth,
  MsgReactionController.index
);

messageRoutes.delete(
  "/messages/:messageId/reaction",
  isAuth,
  MsgReactionController.remove
);

export default messageRoutes;
