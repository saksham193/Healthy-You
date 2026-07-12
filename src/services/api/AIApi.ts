import type { AIRequest, ProviderResponse } from "../../types";
import type { FoodScanImageDraft, PickedAttachment } from "../media/mediaTypes";
import { ApiRequestError, apiClient } from "./ApiClient";

const DEFAULT_AI_TIMEOUT_MS = 11000;
const DEFAULT_AI_VISION_TIMEOUT_MS = 25000;
const DEFAULT_AI_ATTACHMENT_TIMEOUT_MS = 25000;
const DEFAULT_AI_VOICE_TIMEOUT_MS = 25000;
const AI_FOOD_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const AI_VOICE_MAX_BYTES = 5 * 1024 * 1024;
const AI_FOOD_IMAGE_SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AI_ATTACHMENT_MAX_BYTES = 1 * 1024 * 1024;
const AI_ATTACHMENT_TEXT_MAX_CHARS = 8000;
const AI_ATTACHMENT_SUPPORTED_MIME_TYPES = new Set([
  "application/json",
  "text/markdown",
  "text/plain",
]);
export const AI_FOOD_ANALYSIS_UNAVAILABLE_MESSAGE =
  "AI food analysis is not available in this build. Please log manually.";
export const AI_ATTACHMENT_ANALYSIS_UNAVAILABLE_MESSAGE =
  "Attachment analysis is not available in this build. You can still ask Medibot manually.";
export const AI_ATTACHMENT_PDF_UNAVAILABLE_MESSAGE =
  "PDF/image attachment analysis is not available in this build. Please upload a supported .txt, .md, or small .json file. OCR and scanned document support are deferred.";
const AI_ATTACHMENT_FALLBACK_SAFETY_NOTICE =
  "This is general wellness information, not a medical diagnosis or treatment plan.";
const AI_ATTACHMENT_LOCAL_FALLBACK_PREFIX =
  "I could not reach the attachment analysis service, so I am showing a safe local fallback summary.";

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
  safetyNotice: string;
  safetyNote?: string;
  supported: boolean;
  provider?: "mock" | "ollama" | "gemini" | "groq" | "openrouter" | "huggingface" | "openai";
  fallbackUsed?: boolean;
  requestId?: string;
  fileName?: string;
  fileType?: string;
  limitations?: string[];
};

export type VoiceTranscriptionResult = {
  transcript: string;
  provider: "mock" | "vosk" | "whisper_cpp" | "openai_whisper";
  fallbackUsed: boolean;
  safetyNotice: string;
  requestId?: string;
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

const getAIVoiceTimeoutMs = (): number => {
  const configured = Number.parseInt(
    (globalThis as { process?: { env?: { EXPO_PUBLIC_AI_VOICE_TIMEOUT_MS?: string } } }).process?.env
      ?.EXPO_PUBLIC_AI_VOICE_TIMEOUT_MS ?? "",
    10,
  );

  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_AI_VOICE_TIMEOUT_MS;
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

const getAttachmentExtension = (fileName?: string): string | null => {
  const extension = fileName?.split(".").pop()?.trim().toLowerCase();

  return extension && extension !== fileName?.toLowerCase() ? extension : null;
};

const getMimeTypeFromExtension = (fileName?: string): string | null => {
  switch (getAttachmentExtension(fileName)) {
    case "txt":
      return "text/plain";
    case "md":
    case "markdown":
      return "text/markdown";
    case "json":
      return "application/json";
    default:
      return null;
  }
};

const isPdfAttachment = (attachment: PickedAttachment): boolean =>
  attachment.mimeType === "application/pdf" || getAttachmentExtension(attachment.name) === "pdf";

const normalizeAttachmentMimeType = (mimeType?: string, fileName?: string): string | null => {
  const normalized = mimeType?.split(";")[0]?.trim().toLowerCase();

  if (normalized && AI_ATTACHMENT_SUPPORTED_MIME_TYPES.has(normalized)) return normalized;

  if (!normalized || normalized === "application/octet-stream") {
    return getMimeTypeFromExtension(fileName);
  }

  return null;
};

const readSupportedAttachmentText = async (attachment: PickedAttachment, mimeType: string): Promise<{
  text: string;
  sizeBytes: number;
}> => {
  const text = await readTextFromAttachmentUri(attachment.uri);
  const sizeBytes = attachment.size ?? text.length;

  if (sizeBytes > AI_ATTACHMENT_MAX_BYTES) {
    throw new ApiRequestError(413, "payload_too_large", "Attachment must be 1 MB or smaller.");
  }

  let normalizedText = text.replace(/\u0000/g, "").trim();

  if (!normalizedText) {
    throw new ApiRequestError(400, "empty_attachment", "Attachment text could not be read.");
  }

  if (mimeType === "application/json") {
    try {
      normalizedText = JSON.stringify(JSON.parse(normalizedText), null, 2);
    } catch {
      throw new ApiRequestError(400, "invalid_json_attachment", "Attachment JSON must be valid JSON.");
    }
  }

  return {
    text: normalizedText.slice(0, AI_ATTACHMENT_TEXT_MAX_CHARS),
    sizeBytes,
  };
};

const readBlobText = (blob: Blob): Promise<string> => {
  if (typeof blob.text === "function") {
    return blob.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("attachment_file_reader_failed"));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(blob);
  });
};

const readTextWithFetch = async (uri: string): Promise<string> => {
  const localResponse = await fetch(uri);
  const blob = await localResponse.blob();

  return readBlobText(blob);
};

const readTextWithXhr = (uri: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", uri);
    request.responseType = "text";
    request.onerror = () => reject(new Error("attachment_xhr_read_failed"));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300 || request.status === 0) {
        resolve(typeof request.responseText === "string" ? request.responseText : "");
        return;
      }

      reject(new Error("attachment_xhr_read_failed"));
    };
    request.send();
  });

const readTextFromAttachmentUri = async (uri: string): Promise<string> => {
  try {
    return await readTextWithFetch(uri);
  } catch {
    return readTextWithXhr(uri);
  }
};

const includesAny = (text: string, words: string[]): boolean =>
  words.some((word) => text.includes(word));

const detectAttachmentTopic = (text?: string): string => {
  const normalized = text?.toLowerCase() ?? "";

  if (includesAny(normalized, ["meal", "food", "protein", "calorie", "nutrition", "diet"])) {
    return "nutrition or meal notes";
  }
  if (includesAny(normalized, ["walk", "steps", "exercise", "workout", "fitness", "run"])) {
    return "fitness or activity notes";
  }
  if (includesAny(normalized, ["sleep", "bedtime", "rest", "fatigue"])) {
    return "sleep or recovery notes";
  }
  if (includesAny(normalized, ["water", "hydration", "fluid"])) {
    return "hydration notes";
  }

  return "general wellness notes";
};

const buildLocalAttachmentFallback = (
  attachment: PickedAttachment,
  mimeType: string,
  text?: string,
): AttachmentAnalysisResult => ({
  supported: true,
  summary: [
    AI_ATTACHMENT_LOCAL_FALLBACK_PREFIX,
    `The selected ${mimeType} file appears to contain ${detectAttachmentTopic(text)}.`,
    "You can use this as a general starting point for habits, nutrition, fitness, or questions to discuss with a qualified professional.",
    AI_ATTACHMENT_FALLBACK_SAFETY_NOTICE,
  ].join(" "),
  provider: "mock",
  fallbackUsed: true,
  safetyNotice: AI_ATTACHMENT_FALLBACK_SAFETY_NOTICE,
  fileName: attachment.name,
  fileType: mimeType,
  limitations: [
    "This fallback summary is generated locally without sending the file to the attachment analysis service.",
    "It may miss important context from the selected file.",
    "Review important health information with a qualified clinician.",
  ],
});

const normalizeAttachmentAnalysisResult = (value: AttachmentAnalysisResult | {
  data?: AttachmentAnalysisResult;
}): AttachmentAnalysisResult => {
  const candidate: AttachmentAnalysisResult = "data" in value && value.data ? value.data : value as AttachmentAnalysisResult;

  return {
    ...candidate,
    safetyNotice: candidate.safetyNotice ?? candidate.safetyNote ?? AI_ATTACHMENT_FALLBACK_SAFETY_NOTICE,
    supported: Boolean(candidate.supported),
  };
};

export async function analyzeMedibotAttachment(attachment: PickedAttachment): Promise<AttachmentAnalysisResult> {
  if (isPdfAttachment(attachment)) {
    throw new ApiRequestError(400, "unsupported_attachment_type", AI_ATTACHMENT_PDF_UNAVAILABLE_MESSAGE);
  }

  const mimeType = normalizeAttachmentMimeType(attachment.mimeType, attachment.name);

  if (!mimeType) {
    throw new ApiRequestError(
      400,
      "unsupported_attachment_type",
      "Attachment must be a supported text, Markdown, or JSON file.",
    );
  }

  if (attachment.size && attachment.size > AI_ATTACHMENT_MAX_BYTES) {
    throw new ApiRequestError(413, "payload_too_large", "Attachment must be 1 MB or smaller.");
  }

  let text: string | undefined;
  let sizeBytes = attachment.size ?? 0;

  try {
    const readable = await readSupportedAttachmentText(attachment, mimeType);
    text = readable.text;
    sizeBytes = readable.sizeBytes;
  } catch (error) {
    if (error instanceof ApiRequestError && (
      error.code === "payload_too_large" ||
      error.code === "empty_attachment" ||
      error.code === "invalid_json_attachment"
    )) {
      throw error;
    }

    return buildLocalAttachmentFallback(attachment, mimeType);
  }

  try {
    const result = await apiClient.post<AttachmentAnalysisResult | { data?: AttachmentAnalysisResult }>(
      "/ai/attachments/analyze",
      {
        filename: attachment.name,
        mimeType,
        mode: "attachment",
        sizeBytes,
        text,
      },
      {
        authenticated: true,
        timeoutMs: getAIAttachmentTimeoutMs(),
      },
    );

    return normalizeAttachmentAnalysisResult(result);
  } catch {
    return buildLocalAttachmentFallback(attachment, mimeType, text);
  }
}

export async function transcribeMedibotVoiceClip(params: {
  uri: string;
  mimeType: string;
  durationSeconds: number;
}): Promise<VoiceTranscriptionResult> {
  const localResponse = await fetch(params.uri);
  const blob = await localResponse.blob();

  if (blob.size > AI_VOICE_MAX_BYTES) {
    throw new ApiRequestError(413, "audio_too_large", "Voice recording must be 5 MB or smaller.");
  }

  return apiClient.postBinary<VoiceTranscriptionResult>(
    "/ai/voice/transcribe",
    blob,
    params.mimeType,
    {
      authenticated: true,
      headers: {
        "X-Healthy-You-Audio-Duration-Seconds": String(params.durationSeconds),
      },
      timeoutMs: getAIVoiceTimeoutMs(),
    },
  );
}
