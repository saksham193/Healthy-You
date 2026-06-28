import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { requireAuth } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validateRequest";
import { updateUserSchema } from "../types/contracts";

const controller = new UserController();
export const userRoutes = Router();

userRoutes.get("/me", requireAuth, controller.me);
userRoutes.patch("/me", requireAuth, validateBody(updateUserSchema), controller.update);
