import { Router } from "express";
import { HealthSummaryController } from "../controllers/HealthSummaryController";
import { requireAuth } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validateRequest";
import { healthSummarySchema } from "../types/contracts";

const controller = new HealthSummaryController();
export const syncRoutes = Router();

syncRoutes.get("/health-summary", requireAuth, controller.list);
syncRoutes.post("/health-summary", requireAuth, validateBody(healthSummarySchema), controller.save);
syncRoutes.delete("/health-summary/:id", requireAuth, controller.remove);
