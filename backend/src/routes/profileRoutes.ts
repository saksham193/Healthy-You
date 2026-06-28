import { Router } from "express";
import { ProfileController } from "../controllers/ProfileController";
import { requireAuth } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validateRequest";
import { profileSyncSchema } from "../types/contracts";

const controller = new ProfileController();
export const profileRoutes = Router();

profileRoutes.get("/", requireAuth, controller.get);
profileRoutes.put("/", requireAuth, validateBody(profileSyncSchema), controller.sync);
