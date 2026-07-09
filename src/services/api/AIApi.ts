import type { AIRequest, ProviderResponse } from "../../types";
import type { FoodScanImageDraft } from "../media/mediaTypes";
import { ApiRequestError, apiClient } from "./ApiClient";

const DEFAULT_AI_TIMEOUT_MS = 11000;
const DEFAULT_AI_VISION_TIMEOUT_MS = 25000;
const AI_FOOD_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const AI_FOOD_IMAGE_SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const AI_FOOD_ANALYSIS_UNAVAILABLE_MESSAGE =
  "AI food analysis is not available in this build. Please log manually.";

export type NutritionImageAnalysisItem = {
  name: string;
  confidence: number;
  estimatedCalories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string;
};

export type NutritionImageAnalysisDraft = {
  analysisId: string | null;
  title: string;
  items: NutritionImageAnalysisItem[];
  totals: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
  confidence: number;
  warnings: string[];
  requiresReview: true;
};

const getAITimeoutMs = (): number => {
  const configured = Number.parseInt(
    (globalThis as { process?: { env?: { EXPO_PUBLIC_AI_PROVIDER_TIMEOUT_MS?: string } } }).process?.env
      ?.EXPO_PUBLIC_AI_PROVIDER_TIMEOUT_MS ?? "",
    10,
  );

  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_AI_TIMEOUT_MS;
};

export async function sendAIRequest(request: AIRequest): Promise<ProviderResponse> {
  return apiClient.post<ProviderResponse>("/ai/message", request, {
    authenticated: true,
    timeoutMs: getAITimeoutMs(),
  });
}

const normalizeImageMimeType = (mimeType?: string): string | null => {
  const normalized = mimeType?.split(";")[0]?.trim().toLowerCase();

  return normalized && AI_FOOD_IMAGE_SUPPORTED_MIME_TYPES.has(normalized) ? normalized : null;
};

const getAIVisionTimeoutMs = (): number => {
  const configured = Number.parseInt(
    (globalThis as { process?: { env?: { EXPO_PUBLIC_AI_VISION_TIMEOUT_MS?: string } } }).process?.env
      ?.EXPO_PUBLIC_AI_VISION_TIMEOUT_MS ?? "",
    10,
  );

  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_AI_VISION_TIMEOUT_MS;
};

export async function analyzeFoodImageDraft(draft: FoodScanImageDraft): Promise<NutritionImageAnalysisDraft> {
  const mimeType = normalizeImageMimeType(draft.mimeType);

  if (!mimeType) {
    throw new ApiRequestError(400, "unsupported_image_type", "Food image must be a JPEG, PNG, or WebP file.");
  }

  if (draft.fileSize && draft.fileSize > AI_FOOD_IMAGE_MAX_BYTES) {
    throw new ApiRequestError(400, "image_too_large", "Food image must be 3 MB or smaller.");
  }

  const localResponse = await fetch(draft.uri);
  const blob = await localResponse.blob();

  if (blob.size > AI_FOOD_IMAGE_MAX_BYTES) {
    throw new ApiRequestError(400, "image_too_large", "Food image must be 3 MB or smaller.");
  }

  return apiClient.postBinary<NutritionImageAnalysisDraft>(
    "/ai/nutrition/analyze-image",
    blob,
    mimeType,
    {
      authenticated: true,
      headers: {
        "X-Healthy-You-Filename": draft.fileName,
      },
      timeoutMs: getAIVisionTimeoutMs(),
    },
  );
}
