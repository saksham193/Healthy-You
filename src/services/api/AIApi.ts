import type { AIRequest, ProviderResponse } from "../../types";
import type { FoodScanImageDraft, PickedAttachment } from "../media/mediaTypes";
import { ApiRequestError, apiClient } from "./ApiClient";

const DEFAULT_AI_TIMEOUT_MS = 11000;
const DEFAULT_AI_VISION_TIMEOUT_MS = 25000;
const DEFAULT_AI_ATTACHMENT_TIMEOUT_MS = 25000;
const AI_FOOD_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const AI_FOOD_IMAGE_SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AI_ATTACHMENT_MAX_BYTES = 1 * 1024 * 1024;
const AI_ATTACHMENT_SUPPORTED_MIME_TYPES = new Set([
  "application/json",
  "text/csv",
  "text/markdown",
  "text/plain",
]);
export const AI_FOOD_ANALYSIS_UNAVAILABLE_MESSAGE =
  "AI food analysis is not available in this build. Please log manually.";
export const AI_ATTACHMENT_ANALYSIS_UNAVAILABLE_MESSAGE =
  "Attachment analysis is not available in this build. You can still ask Medibot manually.";
export const AI_ATTACHMENT_PDF_UNAVAILABLE_MESSAGE =
  "PDF attachment analysis is not available in this build. You can ask Medibot manually or upload a supported text file.";

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

export type AttachmentAnalysisResult = {
  summary: string;
  safetyNote: string;
  fileName?: string;
  fileType?: string;
  limitations: string[];
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

const getAIAttachmentTimeoutMs = (): number => {
  const configured = Number.parseInt(
    (globalThis as { process?: { env?: { EXPO_PUBLIC_AI_ATTACHMENT_TIMEOUT_MS?: string } } }).process?.env
      ?.EXPO_PUBLIC_AI_ATTACHMENT_TIMEOUT_MS ?? "",
    10,
  );

  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_AI_ATTACHMENT_TIMEOUT_MS;
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

const normalizeAttachmentMimeType = (mimeType?: string): string | null => {
  const normalized = mimeType?.split(";")[0]?.trim().toLowerCase();

  return normalized && AI_ATTACHMENT_SUPPORTED_MIME_TYPES.has(normalized) ? normalized : null;
};

export async function analyzeMedibotAttachment(attachment: PickedAttachment): Promise<AttachmentAnalysisResult> {
  if (attachment.mimeType === "application/pdf") {
    throw new ApiRequestError(400, "unsupported_attachment_type", AI_ATTACHMENT_PDF_UNAVAILABLE_MESSAGE);
  }

  const mimeType = normalizeAttachmentMimeType(attachment.mimeType);

  if (!mimeType) {
    throw new ApiRequestError(
      400,
      "unsupported_attachment_type",
      "Attachment must be a supported text, Markdown, CSV, or JSON file.",
    );
  }

  if (attachment.size && attachment.size > AI_ATTACHMENT_MAX_BYTES) {
    throw new ApiRequestError(413, "payload_too_large", "Attachment must be 1 MB or smaller.");
  }

  const localResponse = await fetch(attachment.uri);
  const blob = await localResponse.blob();

  if (blob.size > AI_ATTACHMENT_MAX_BYTES) {
    throw new ApiRequestError(413, "payload_too_large", "Attachment must be 1 MB or smaller.");
  }

  return apiClient.postBinary<AttachmentAnalysisResult>(
    "/ai/assistant/analyze-attachment",
    blob,
    mimeType,
    {
      authenticated: true,
      headers: {
        "X-Healthy-You-Filename": attachment.name,
      },
      timeoutMs: getAIAttachmentTimeoutMs(),
    },
  );
}
