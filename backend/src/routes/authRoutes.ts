import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authRateLimit } from "../middleware/security";
import { validateBody } from "../middleware/validateRequest";
import { loginSchema, refreshTokenSchema, registerSchema } from "../types/contracts";

const controller = new AuthController();
export const authRoutes = Router();

authRoutes.post("/register", authRateLimit, validateBody(registerSchema), controller.register);
authRoutes.post("/login", authRateLimit, validateBody(loginSchema), controller.login);
authRoutes.post("/refresh-token", authRateLimit, validateBody(refreshTokenSchema), controller.refresh);
authRoutes.post("/logout", validateBody(refreshTokenSchema), controller.logout);
