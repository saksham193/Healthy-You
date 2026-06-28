import { Router } from "express";
import { AIController } from "../controllers/AIController";
import { requireAuth } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validateRequest";
import { aiRequestSchema } from "../types/contracts";

const controller = new AIController();
export const aiRoutes = Router();

aiRoutes.post("/message", requireAuth, validateBody(aiRequestSchema), controller.sendMessage);
