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
  async (req, res) => {
    try {
      const { whatsappId, number } = req.params;
      // ?lid=191006288932913@lid (opcional)
      const lid = (req.query.lid as string) || null;
      const { getWbot } = await import("../libs/wbot");

      const wbot = await getWbot(Number(whatsappId));

      const wsState = (wbot as any).ws?.readyState;
      const wsStateMap: Record<number, string> = {
        0: "CONNECTING", 1: "OPEN", 2: "CLOSING", 3: "CLOSED"
      };
      const results: Record<string, any> = {
        wsState: wsStateMap[wsState] ?? wsState,
        user: (wbot as any).user,
        serverProps: (wbot as any).serverProps ?? "N/A",
      };

      const tryFetch = async (jid: string, type: "image" | "preview") => {
        const key = `${jid}__${type}`;
        const start = Date.now();
        try {
          const pic = await Promise.race([
            wbot.profilePictureUrl(jid, type),
            new Promise<null>(r => setTimeout(() => r(null), 10000))
          ]);
          results[key] = { ok: true, pic, ms: Date.now() - start };
        } catch (e: any) {
          results[key] = { ok: false, error: e.message, ms: Date.now() - start };
        }
      };

      // Testa todos os formatos relevantes em paralelo
      const jids: Array<[string, "image" | "preview"]> = [
        [`${number}@s.whatsapp.net`, "image"],
        [`${number}@s.whatsapp.net`, "preview"],
      ];
      if (lid) {
        jids.push([lid, "image"]);
        jids.push([lid, "preview"]);
      }

      await Promise.all(jids.map(([j, t]) => tryFetch(j, t)));

      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
);

export default authRoutes;
