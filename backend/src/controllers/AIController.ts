import type { Request, Response } from "express";
import {
  AttachmentAnalysisService,
  buildUnsupportedAttachmentResponse,
  normalizeAttachmentMimeType,
  validateAttachmentPayload,
} from "../services/AttachmentAnalysisService";
import { OpenAIProxyService } from "../services/OpenAIProxyService";
import {
  normalizeNutritionImageMimeType,
  NutritionVisionService,
  validateNutritionImagePayload,
} from "../services/NutritionVisionService";
import type { BackendAIRequest } from "../types/contracts";

export class AIController {
  constructor(
    private readonly openAI = new OpenAIProxyService(),
    private readonly nutritionVision = new NutritionVisionService(),
    private readonly attachmentAnalysis = new AttachmentAnalysisService(),
  ) {}

  sendMessage = async (request: Request<unknown, unknown, BackendAIRequest>, response: Response): Promise<void> => {
    response.json({ data: await this.openAI.sendMessage(request.body) });
  };

  analyzeNutritionImage = async (request: Request, response: Response): Promise<void> => {
    const payload = validateNutritionImagePayload(
      request.body,
      normalizeNutritionImageMimeType(request.header("content-type")),
    );

    response.json({ data: await this.nutritionVision.analyzeFoodImage(payload) });
  };

  analyzeAssistantAttachment = async (request: Request, response: Response): Promise<void> => {
    const mimeType = normalizeAttachmentMimeType(request.header("content-type"));

    if (!mimeType) {
      response.json({ data: buildUnsupportedAttachmentResponse(request.requestId) });
      return;
    }

    const payload = validateAttachmentPayload(
      request.body,
      mimeType,
      request.header("x-healthy-you-filename"),
    );

    response.json({
      data: await this.attachmentAnalysis.analyzeAttachment({
        ...payload,
        requestId: request.requestId,
      }),
    });
  };
}
