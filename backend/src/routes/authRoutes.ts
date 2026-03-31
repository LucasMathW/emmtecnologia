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

export default authRoutes;
