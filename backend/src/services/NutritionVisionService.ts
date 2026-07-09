import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { env } from "../config/env";
import {
  nutritionImageAnalysisResponseSchema,
  type BackendNutritionImageAnalysisResponse,
} from "../types/contracts";
import { HttpError } from "../utils/httpError";

export const NUTRITION_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const NUTRITION_IMAGE_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const REVIEW_WARNING = "AI estimates can be inaccurate. Review before saving.";
const UNAVAILABLE_MESSAGE = "AI food analysis is not available in this build. Please log manually.";
const FAILURE_MESSAGE = "Healthy You could not analyze this image right now. Please log manually.";

const nullableNutritionNumberSchema = {
  anyOf: [
    { type: "number" },
    { type: "null" },
  ],
};

const nutritionImageAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["analysisId", "title", "items", "totals", "confidence", "warnings", "requiresReview"],
  properties: {
    analysisId: {
      anyOf: [
        { type: "string" },
        { type: "null" },
      ],
    },
    title: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "confidence", "estimatedCalories", "protein", "carbs", "fat", "notes"],
        properties: {
          name: { type: "string" },
          confidence: { type: "number" },
          estimatedCalories: nullableNutritionNumberSchema,
          protein: nullableNutritionNumberSchema,
          carbs: nullableNutritionNumberSchema,
          fat: nullableNutritionNumberSchema,
          notes: { type: "string" },
        },
      },
    },
    totals: {
      type: "object",
      additionalProperties: false,
      required: ["calories", "protein", "carbs", "fat"],
      properties: {
        calories: nullableNutritionNumberSchema,
        protein: nullableNutritionNumberSchema,
        carbs: nullableNutritionNumberSchema,
        fat: nullableNutritionNumberSchema,
      },
    },
    confidence: { type: "number" },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    requiresReview: { type: "boolean", enum: [true] },
  },
} as const;

export const normalizeNutritionImageMimeType = (contentType: string | undefined): string | null => {
  const mimeType = contentType?.split(";")[0]?.trim().toLowerCase();

  if (!mimeType) return null;

  return NUTRITION_IMAGE_ALLOWED_MIME_TYPES.includes(
    mimeType as (typeof NUTRITION_IMAGE_ALLOWED_MIME_TYPES)[number],
  )
    ? mimeType
    : null;
};

export const validateNutritionImagePayload = (
  body: unknown,
  mimeType: string | null,
): { imageBuffer: Buffer; mimeType: string } => {
  if (!mimeType) {
    throw new HttpError(400, "unsupported_image_type", "Food image must be a JPEG, PNG, or WebP file.");
  }

  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new HttpError(400, "missing_image", "A food image is required.");
  }

  if (body.length > NUTRITION_IMAGE_MAX_BYTES) {
    throw new HttpError(400, "image_too_large", "Food image must be 3 MB or smaller.");
  }

  return { imageBuffer: body, mimeType };
};

export class NutritionVisionService {
  private readonly client: OpenAI | null;

  constructor(client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null) {
    this.client = client;
  }

  async analyzeFoodImage(params: {
    imageBuffer: Buffer;
    mimeType: string;
  }): Promise<BackendNutritionImageAnalysisResponse> {
    if (!this.client) {
      throw new HttpError(503, "ai_food_analysis_unavailable", UNAVAILABLE_MESSAGE);
    }

    const dataUrl = `data:${params.mimeType};base64,${params.imageBuffer.toString("base64")}`;

    try {
      const result = await this.client.responses.create({
        model: env.OPENAI_MODEL,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Estimate visible food items and rough nutrition from this meal photo.",
                  "Return estimates only for user review, not medical advice.",
                  "Use null when the image does not provide enough information.",
                  "Do not claim certainty. Always include review warnings.",
                ].join(" "),
              },
              {
                type: "input_image",
                image_url: dataUrl,
                detail: "low",
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "nutrition_image_analysis",
            strict: true,
            schema: nutritionImageAnalysisJsonSchema,
          },
        },
      });

      const parsed = JSON.parse(result.output_text);
      const analysis = nutritionImageAnalysisResponseSchema.parse(parsed);

      return {
        ...analysis,
        analysisId: analysis.analysisId ?? `local-${randomUUID()}`,
        warnings: Array.from(new Set([REVIEW_WARNING, ...analysis.warnings])).slice(0, 5),
        requiresReview: true,
      };
    } catch (error) {
      if (error instanceof HttpError) throw error;

      if (error instanceof SyntaxError) {
        throw new HttpError(502, "invalid_food_analysis_response", FAILURE_MESSAGE);
      }

      throw new HttpError(502, "food_analysis_failed", FAILURE_MESSAGE);
    }
  }
}
