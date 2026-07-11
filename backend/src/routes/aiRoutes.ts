import { raw, Router } from "express";
import { env } from "../config/env";
import { AIController } from "../controllers/AIController";
import { requireAuth } from "../middleware/authMiddleware";
import { aiRateLimit } from "../middleware/security";
import { validateBody } from "../middleware/validateRequest";
import { ATTACHMENT_ALLOWED_MIME_TYPES, ATTACHMENT_TEXT_MAX_BYTES } from "../services/AttachmentAnalysisService";
import { NUTRITION_IMAGE_ALLOWED_MIME_TYPES } from "../services/NutritionVisionService";
import { aiRequestSchema } from "../types/contracts";

const controller = new AIController();
export const aiRoutes = Router();
const nutritionImageParser = raw({
  limit: env.REQUEST_BODY_LIMIT_AI_IMAGE,
  type: [...NUTRITION_IMAGE_ALLOWED_MIME_TYPES],
});
const attachmentParser = raw({
  limit: ATTACHMENT_TEXT_MAX_BYTES,
  type: [...ATTACHMENT_ALLOWED_MIME_TYPES],
});

aiRoutes.post("/message", aiRateLimit, requireAuth, validateBody(aiRequestSchema), controller.sendMessage);
aiRoutes.post("/nutrition/analyze-image", aiRateLimit, requireAuth, nutritionImageParser, controller.analyzeNutritionImage);
aiRoutes.post("/assistant/analyze-attachment", aiRateLimit, requireAuth, attachmentParser, controller.analyzeAssistantAttachment);
