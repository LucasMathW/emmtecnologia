import express from "express";
import isAuth from "../middleware/isAuth";
import * as UserController from "../controllers/UserController";
import * as SessionController from "../controllers/SessionController";
import resolveCompany from "../middleware/resolveCompany";
const authRoutes = express.Router();

authRoutes.post("/signup", resolveCompany, UserController.store);
authRoutes.post("/login", resolveCompany, SessionController.store);
authRoutes.post("/refresh_token", SessionController.update);
authRoutes.delete("/logout", isAuth, SessionController.remove);
authRoutes.get("/me", isAuth, SessionController.me);
authRoutes.post("/validate-cnpj", UserController.validateCnpj);

authRoutes.get(
  "/debug/pic-test/:whatsappId/:number",
  isAuth,
  async (req, res) => {
    try {
      const { whatsappId, number } = req.params;
      const { getWbot } = await import("../libs/wbot");

      const wbot = await getWbot(Number(whatsappId));
      const jid = `${number}@s.whatsapp.net`;

      const wsState = (wbot as any).ws?.readyState;
      const wsStateMap = {
        0: "CONNECTING",
        1: "OPEN",
        2: "CLOSING",
        3: "CLOSED"
      };
      const user = (wbot as any).user;
      const isOpen = wsState === 1;

      console.log(
        `[DEBUG-PIC] WS readyState: ${wsState} (${wsStateMap[wsState]})`
      );
      console.log(`[DEBUG-PIC] user: ${JSON.stringify(user)}`);
      console.log(`[DEBUG-PIC] isOpen: ${isOpen}`);

      const start = Date.now();
      try {
        const pic = await wbot.profilePictureUrl(jid, "image");
        res.json({ success: true, pic, ms: Date.now() - start });
      } catch (e) {
        res.json({ success: false, error: e.message, ms: Date.now() - start });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);

export default authRoutes;
