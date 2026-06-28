import { Router } from "express";
import { StatusController } from "../controllers/StatusController";

const controller = new StatusController();
export const statusRoutes = Router();

statusRoutes.get("/health", controller.health);
statusRoutes.get("/status", controller.status);
