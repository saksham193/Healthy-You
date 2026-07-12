import { createAIProvider, getFallbackAIProvider, getPrimaryAIProvider } from "../ai/providers/AIProviderFactory";
import { HealthAISafetyGuard, SAFETY_NOTICE } from "../ai/safety/HealthAISafetyGuard";
import type { AIChatMessage, AIChatResponse } from "../ai/types";
import { env } from "../config/env";
import {
  attachmentAnalysisResponseSchema,
  type BackendAttachmentAnalysisResponse,
} from "../types/contracts";
import { HttpError } from "../utils/httpError";
import { logger } from "../utils/logger";

const UNSUPPORTED_MESSAGE =
  "This attachment type is not supported for analysis in this build. You can ask Medibot manually or upload a supported text file.";
const DISABLED_MESSAGE =
  "Attachment analysis is not enabled in this build. You can still ask Medibot manually.";
const FAILURE_MESSAGE =
  "Healthy You could not analyze this attachment right now. You can still ask Medibot manually.";
const DEFAULT_LIMITATIONS = [
  "This summary may miss context from the original file.",
  "Review important health information with a qualified clinician.",
  "Do not use this summary to make diagnosis, treatment, or medication decisions.",
];

const parseAllowedMimeTypes = (): string[] =>
  env.ATTACHMENT_ALLOWED_MIME_TYPES
    .split(",")
    .map((mimeType) => mimeType.trim().toLowerCase())
    .filter((mimeType) => mimeType.length > 0);

export const ATTACHMENT_TEXT_MAX_BYTES = env.ATTACHMENT_MAX_BYTES;
export const ATTACHMENT_TEXT_MAX_CHARS = env.ATTACHMENT_TEXT_MAX_CHARS;
export const ATTACHMENT_ALLOWED_MIME_TYPES = parseAllowedMimeTypes();

const normalizeFileText = (text: string, mimeType: string): string => {
  if (mimeType !== "application/json") return text;

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    throw new HttpError(400, "invalid_json_attachment", "Attachment JSON must be valid JSON.");
  }
};

const sanitizeAttachmentText = (buffer: Buffer, mimeType: string): string => {
  const text = normalizeFileText(buffer.toString("utf8"), mimeType)
    .replace(/\u0000/g, "")
    .trim();

  if (!text) {
    throw new HttpError(400, "empty_attachment", "Attachment text could not be read.");
  }

  return text.slice(0, ATTACHMENT_TEXT_MAX_CHARS);
};

export const normalizeAttachmentMimeType = (contentType: string | undefined): string | null => {
  const mimeType = contentType?.split(";")[0]?.trim().toLowerCase();

  if (!mimeType) return null;

  if (mimeType === "application/pdf" && env.ATTACHMENT_ALLOW_PDF_TEXT) {
    return null;
  }

  return ATTACHMENT_ALLOWED_MIME_TYPES.includes(mimeType) ? mimeType : null;
};

export const sanitizeAttachmentFileName = (fileName: string | undefined): string | undefined => {
  const sanitized = fileName
    ?.replace(/[/\\:*?"<>|]/g, "_")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 160);

  return sanitized || undefined;
};

const parseStructuredAttachmentPayload = (
  body: unknown,
): { fileBuffer: Buffer; mimeType: string; fileName?: string; sizeBytes: number } | null => {
  if (!Buffer.isBuffer(body)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const candidate = parsed as {
    filename?: unknown;
    mimeType?: unknown;
    mode?: unknown;
    sizeBytes?: unknown;
    text?: unknown;
  };

  if (candidate.mode !== "attachment" || typeof candidate.text !== "string") {
    return null;
  }

  const mimeType = typeof candidate.mimeType === "string"
    ? normalizeAttachmentMimeType(candidate.mimeType)
    : null;

  if (!mimeType) {
    throw new HttpError(415, "unsupported_attachment_type", UNSUPPORTED_MESSAGE);
  }

  const fileBuffer = Buffer.from(candidate.text, "utf8");
  const sizeBytes = typeof candidate.sizeBytes === "number" && Number.isFinite(candidate.sizeBytes)
    ? candidate.sizeBytes
    : fileBuffer.length;

  return {
    fileBuffer,
    mimeType,
    fileName: sanitizeAttachmentFileName(typeof candidate.filename === "string" ? candidate.filename : undefined),
    sizeBytes,
  };
};

export const validateAttachmentPayload = (
  body: unknown,
  mimeType: string | null,
  fileNameHeader: string | undefined,
): { fileBuffer: Buffer; mimeType: string; fileName?: string } => {
  const structuredPayload = parseStructuredAttachmentPayload(body);
  if (structuredPayload) {
    if (structuredPayload.sizeBytes > ATTACHMENT_TEXT_MAX_BYTES || structuredPayload.fileBuffer.length > ATTACHMENT_TEXT_MAX_BYTES) {
      throw new HttpError(413, "payload_too_large", "Attachment must be 1 MB or smaller.");
    }

    if (structuredPayload.fileBuffer.length === 0) {
      throw new HttpError(400, "missing_attachment", "An attachment file is required.");
    }

    return {
      fileBuffer: structuredPayload.fileBuffer,
      mimeType: structuredPayload.mimeType,
      fileName: structuredPayload.fileName,
    };
  }

  if (!mimeType) {
    throw new HttpError(415, "unsupported_attachment_type", UNSUPPORTED_MESSAGE);
  }

  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new HttpError(400, "missing_attachment", "An attachment file is required.");
  }

  if (body.length > ATTACHMENT_TEXT_MAX_BYTES) {
    throw new HttpError(413, "payload_too_large", "Attachment must be 1 MB or smaller.");
  }

  return {
    fileBuffer: body,
    mimeType,
    fileName: sanitizeAttachmentFileName(fileNameHeader),
  };
};

export const buildUnsupportedAttachmentResponse = (
  requestId?: string,
  summary = UNSUPPORTED_MESSAGE,
): BackendAttachmentAnalysisResponse =>
  attachmentAnalysisResponseSchema.parse({
    summary,
    safetyNotice: SAFETY_NOTICE,
    safetyNote: SAFETY_NOTICE,
    supported: false,
    fallbackUsed: true,
    requestId,
    limitations: DEFAULT_LIMITATIONS,
  });

export class AttachmentAnalysisService {
  constructor(private readonly safetyGuard = new HealthAISafetyGuard()) {}

  async analyzeAttachment(params: {
    fileBuffer: Buffer;
    mimeType: string;
    fileName?: string;
    requestId?: string;
  }): Promise<BackendAttachmentAnalysisResponse> {
    if (!env.ATTACHMENT_ANALYSIS_ENABLED) {
      return buildUnsupportedAttachmentResponse(params.requestId, DISABLED_MESSAGE);
    }

    const attachmentText = sanitizeAttachmentText(params.fileBuffer, params.mimeType);
    const messages: AIChatMessage[] = [
      {
        role: "system",
        content: [
          "Summarize this attachment in plain language for general wellness education.",
          "Do not diagnose, prescribe, interpret results with medical certainty, or recommend medication changes.",
          "Suggest questions the user may ask a qualified professional.",
          "Do not quote or echo long sections of the original attachment.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          `Attachment MIME type: ${params.mimeType}.`,
          "Attachment text for summary:",
          attachmentText,
        ].join("\n"),
      },
    ];

    const primaryProvider = getPrimaryAIProvider();
    const fallbackProvider = getFallbackAIProvider();
    let providerResponse: AIChatResponse;
    let fallbackUsed = false;

    try {
      const primaryAvailable = primaryProvider.isConfigured() && await primaryProvider.checkAvailability();
      if (!primaryAvailable) {
        throw new Error("primary_ai_provider_unavailable");
      }

      providerResponse = await primaryProvider.chat({
        messages,
        mode: "chat",
      });
    } catch {
      fallbackUsed = true;
      const fallbackAvailable = fallbackProvider.isConfigured() && await fallbackProvider.checkAvailability();

      providerResponse = fallbackAvailable
        ? await fallbackProvider.chat({ messages, mode: "chat" })
        : await createAIProvider("mock").chat({ messages, mode: "chat" });
    }

    const guarded = this.safetyGuard.applyToResponse({
      ...providerResponse,
      fallbackUsed,
    });

    logger.info("ai_attachment_analysis_response", {
      requestId: params.requestId,
      provider: guarded.provider,
      fallbackProvider: env.AI_FALLBACK_PROVIDER,
      fallbackUsed: guarded.fallbackUsed,
    });

    return attachmentAnalysisResponseSchema.parse({
      summary: guarded.text.slice(0, 2000),
      safetyNotice: guarded.safetyNotice ?? SAFETY_NOTICE,
      safetyNote: guarded.safetyNotice ?? SAFETY_NOTICE,
      supported: true,
      provider: guarded.provider,
      fallbackUsed: guarded.fallbackUsed,
      requestId: params.requestId,
      fileName: params.fileName,
      fileType: params.mimeType,
      limitations: DEFAULT_LIMITATIONS,
    });
  }

  buildFailureResponse(requestId?: string): BackendAttachmentAnalysisResponse {
    return buildUnsupportedAttachmentResponse(requestId, FAILURE_MESSAGE);
  }
}
