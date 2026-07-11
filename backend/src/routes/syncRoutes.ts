import { Router } from "express";
import { HealthSummaryController } from "../controllers/HealthSummaryController";
import { SyncController } from "../controllers/SyncController";
import { requireAuth } from "../middleware/authMiddleware";
import { syncPrivacyRateLimit, syncRateLimit } from "../middleware/security";
import { validateBody } from "../middleware/validateRequest";
import { healthSummarySchema, syncPushRequestSchema } from "../types/contracts";

const healthSummaryController = new HealthSummaryController();
const syncController = new SyncController();
export const syncRoutes = Router();

syncRoutes.post("/push", syncRateLimit, requireAuth, validateBody(syncPushRequestSchema), syncController.push);
syncRoutes.get("/pull", syncRateLimit, requireAuth, syncController.pull);
syncRoutes.get("/export", syncPrivacyRateLimit, requireAuth, syncController.exportData);
syncRoutes.delete("/data", syncPrivacyRateLimit, requireAuth, syncController.deleteData);
syncRoutes.get("/health-summary", syncRateLimit, requireAuth, healthSummaryController.list);
syncRoutes.post("/health-summary", syncRateLimit, requireAuth, validateBody(healthSummarySchema), healthSummaryController.save);
syncRoutes.delete("/health-summary/:id", syncRateLimit, requireAuth, healthSummaryController.remove);
