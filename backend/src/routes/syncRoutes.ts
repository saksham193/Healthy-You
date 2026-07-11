import { Router } from "express";
import { HealthSummaryController } from "../controllers/HealthSummaryController";
import { SyncController } from "../controllers/SyncController";
import { requireAuth } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validateRequest";
import { healthSummarySchema, syncPushRequestSchema } from "../types/contracts";

const healthSummaryController = new HealthSummaryController();
const syncController = new SyncController();
export const syncRoutes = Router();

syncRoutes.post("/push", requireAuth, validateBody(syncPushRequestSchema), syncController.push);
syncRoutes.get("/pull", requireAuth, syncController.pull);
syncRoutes.get("/export", requireAuth, syncController.exportData);
syncRoutes.delete("/data", requireAuth, syncController.deleteData);
syncRoutes.get("/health-summary", requireAuth, healthSummaryController.list);
syncRoutes.post("/health-summary", requireAuth, validateBody(healthSummarySchema), healthSummaryController.save);
syncRoutes.delete("/health-summary/:id", requireAuth, healthSummaryController.remove);
