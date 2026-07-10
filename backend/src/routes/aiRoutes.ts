import { raw, Router } from "express";
import { AIController } from "../controllers/AIController";
import { requireAuth } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validateRequest";
import { ATTACHMENT_ALLOWED_MIME_TYPES, ATTACHMENT_TEXT_MAX_BYTES } from "../services/AttachmentAnalysisService";
import { NUTRITION_IMAGE_ALLOWED_MIME_TYPES, NUTRITION_IMAGE_MAX_BYTES } from "../services/NutritionVisionService";
import { aiRequestSchema } from "../types/contracts";

const controller = new AIController();
export const aiRoutes = Router();
const nutritionImageParser = raw({
  limit: NUTRITION_IMAGE_MAX_BYTES,
  type: [...NUTRITION_IMAGE_ALLOWED_MIME_TYPES],
});
const attachmentParser = raw({
  limit: ATTACHMENT_TEXT_MAX_BYTES,
  type: [...ATTACHMENT_ALLOWED_MIME_TYPES],
});

aiRoutes.post("/message", requireAuth, validateBody(aiRequestSchema), controller.sendMessage);
aiRoutes.post("/nutrition/analyze-image", requireAuth, nutritionImageParser, controller.analyzeNutritionImage);
aiRoutes.post("/assistant/analyze-attachment", requireAuth, attachmentParser, controller.analyzeAssistantAttachment);
