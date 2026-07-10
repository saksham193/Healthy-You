import OpenAI from "openai";
import { env } from "../config/env";
import {
  attachmentAnalysisResponseSchema,
  type BackendAttachmentAnalysisResponse,
} from "../types/contracts";
import { HttpError } from "../utils/httpError";

export const ATTACHMENT_TEXT_MAX_BYTES = 1 * 1024 * 1024;
export const ATTACHMENT_ALLOWED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
] as const;

const SAFETY_NOTE =
  "This is an AI-generated summary for general wellness support only. It is not a diagnosis or medical advice.";
const UNAVAILABLE_MESSAGE =
  "Attachment analysis is not available in this build. You can still ask Medibot manually.";
const FAILURE_MESSAGE =
  "Healthy You could not analyze this attachment right now. You can still ask Medibot manually.";
const DEFAULT_LIMITATIONS = [
  "This summary may miss context from the original file.",
  "Review important health information with a qualified clinician.",
  "Do not use this summary to make diagnosis, treatment, or medication decisions.",
];

const attachmentAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "safetyNote", "fileName", "fileType", "limitations"],
  properties: {
    summary: { type: "string" },
    safetyNote: { type: "string" },
    fileName: {
      anyOf: [
        { type: "string" },
        { type: "null" },
      ],
    },
    fileType: {
      anyOf: [
        { type: "string" },
        { type: "null" },
      ],
    },
    limitations: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

export const normalizeAttachmentMimeType = (contentType: string | undefined): string | null => {
  const mimeType = contentType?.split(";")[0]?.trim().toLowerCase();

  if (!mimeType) return null;

  return ATTACHMENT_ALLOWED_MIME_TYPES.includes(
    mimeType as (typeof ATTACHMENT_ALLOWED_MIME_TYPES)[number],
  )
    ? mimeType
    : null;
};

export const sanitizeAttachmentFileName = (fileName: string | undefined): string | undefined => {
  const sanitized = fileName
    ?.replace(/[/\\:*?"<>|]/g, "_")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 160);

  return sanitized || undefined;
};

export const validateAttachmentPayload = (
  body: unknown,
  mimeType: string | null,
  fileNameHeader: string | undefined,
): { fileBuffer: Buffer; mimeType: string; fileName?: string } => {
  if (!mimeType) {
    throw new HttpError(
      400,
      "unsupported_attachment_type",
      "Attachment must be a supported text, Markdown, CSV, or JSON file.",
    );
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

export class AttachmentAnalysisService {
  private readonly client: OpenAI | null;

  constructor(client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null) {
    this.client = client;
  }

  async analyzeAttachment(params: {
    fileBuffer: Buffer;
    mimeType: string;
    fileName?: string;
  }): Promise<BackendAttachmentAnalysisResponse> {
    if (!this.client) {
      throw new HttpError(503, "ai_attachment_analysis_unavailable", UNAVAILABLE_MESSAGE);
    }

    const attachmentText = params.fileBuffer.toString("utf8").slice(0, 60000);

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
                  "Summarize the attached text-like file for general wellness support only.",
                  "Do not diagnose, interpret lab results as medically accurate, recommend treatment changes, or give medication advice.",
                  "If the content appears clinical, explain that the user should ask a qualified clinician.",
                  "Return concise, privacy-safe JSON only.",
                  `File name: ${params.fileName ?? "attachment"}.`,
                  `File type: ${params.mimeType}.`,
                  `Attachment text:\n${attachmentText}`,
                ].join(" "),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "attachment_analysis",
            strict: true,
            schema: attachmentAnalysisJsonSchema,
          },
        },
      });

      const parsed = JSON.parse(result.output_text);
      const analysis = attachmentAnalysisResponseSchema.parse({
        ...parsed,
        fileName: params.fileName,
        fileType: params.mimeType,
        safetyNote: SAFETY_NOTE,
      });

      return {
        ...analysis,
        limitations: Array.from(new Set([...analysis.limitations, ...DEFAULT_LIMITATIONS])).slice(0, 6),
      };
    } catch (error) {
      if (error instanceof HttpError) throw error;

      if (error instanceof SyntaxError) {
        throw new HttpError(502, "invalid_attachment_analysis_response", FAILURE_MESSAGE);
      }

      throw new HttpError(502, "attachment_analysis_failed", FAILURE_MESSAGE);
    }
  }
}
