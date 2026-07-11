import { Router } from "express";
import { StatusController } from "../controllers/StatusController";
import { healthRateLimit } from "../middleware/security";

const controller = new StatusController();
export const statusRoutes = Router();

statusRoutes.get("/health", healthRateLimit, controller.health);
statusRoutes.get("/status", healthRateLimit, controller.status);
