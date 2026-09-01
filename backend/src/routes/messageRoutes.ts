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
  // [PERF] instrumentação temporária: mede o tempo do multer (recebimento do
  // upload + escrita em disco), separado do processamento no controller.
  (req, _res, next) => {
    (req as any).__t_upload_start = Date.now();
    next();
  },
  upload.array("medias"),
  (req, _res, next) => {
    const files = (req.files as Express.Multer.File[]) || [];
    console.log(
      `[PERF][messageRoutes] upload.array (multer, recebimento + escrita em disco): ${
        Date.now() - (req as any).__t_upload_start
      }ms (${files.length} arquivo(s), ${files
        .map(f => `${f.originalname}=${f.size}b`)
        .join(", ")})`
    );
    next();
  },
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

//PRESENCE....
messageRoutes.post(
  "/messages/:ticketId/presence",
  isAuth,
  MessageController.sendPresence
);

export default messageRoutes;
