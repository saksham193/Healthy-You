import { Router } from "express";
import { MemoryController } from "../controllers/MemoryController";
import { requireAuth } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validateRequest";
import { memorySchema } from "../types/contracts";

const controller = new MemoryController();
export const memoryRoutes = Router();

memoryRoutes.get("/", requireAuth, controller.list);
memoryRoutes.post("/", requireAuth, validateBody(memorySchema), controller.save);
memoryRoutes.delete("/:id", requireAuth, controller.remove);
