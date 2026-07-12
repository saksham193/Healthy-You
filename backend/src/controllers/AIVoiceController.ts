import type { Request, Response } from "express";
import { createSTTProvider, getFallbackSTTProvider, getPrimarySTTProvider } from "../ai/stt/STTProviderFactory";
import { TRANSCRIPT_REVIEW_NOTICE } from "../ai/stt/MockSTTProvider";
import type { STTTranscriptionResponse } from "../ai/stt/STTProvider";
import { env } from "../config/env";
import { voiceTranscriptionResponseSchema } from "../types/contracts";
import { HttpError } from "../utils/httpError";
import { logger } from "../utils/logger";

export const VOICE_AUDIO_ALLOWED_MIME_TYPES = [
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/3gpp",
];

export const normalizeVoiceAudioMimeType = (contentType: string | undefined): string | null => {
  const mimeType = contentType?.split(";")[0]?.trim().toLowerCase();

  return mimeType && VOICE_AUDIO_ALLOWED_MIME_TYPES.includes(mimeType) ? mimeType : null;
};

const parseDurationSeconds = (value: string | undefined): number | undefined => {
  if (!value) return undefined;

  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;

  return numeric;
};

const validateVoicePayload = (
  body: unknown,
  mimeType: string | null,
  durationSeconds: number | undefined,
): { audio: Buffer; mimeType: string; durationSeconds?: number } => {
  if (!mimeType) {
    throw new HttpError(415, "unsupported_audio_type", "Voice input must be a supported short audio clip.");
  }

  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new HttpError(400, "missing_audio", "A voice recording is required.");
  }

  if (body.length > env.STT_MAX_AUDIO_BYTES) {
    throw new HttpError(413, "audio_too_large", "Voice recordings must be smaller than the configured limit.");
  }

  if (durationSeconds && durationSeconds > env.STT_MAX_DURATION_SECONDS + 1) {
    throw new HttpError(400, "audio_too_long", "Voice recordings must stay within the configured duration limit.");
  }

  return { audio: body, mimeType, durationSeconds };
};

export class AIVoiceController {
  transcribe = async (request: Request, response: Response): Promise<void> => {
    const payload = validateVoicePayload(
      request.body,
      normalizeVoiceAudioMimeType(request.header("content-type")),
      parseDurationSeconds(request.header("x-healthy-you-audio-duration-seconds")),
    );
    const primaryProvider = getPrimarySTTProvider();
    const fallbackProvider = getFallbackSTTProvider();
    let providerResponse: STTTranscriptionResponse;
    let fallbackUsed = false;

    try {
      const primaryAvailable = primaryProvider.isConfigured() && await primaryProvider.checkAvailability();
      if (!primaryAvailable) {
        throw new Error("primary_stt_provider_unavailable");
      }

      providerResponse = await primaryProvider.transcribe({
        ...payload,
        requestId: request.requestId,
      });
    } catch {
      fallbackUsed = true;
      const fallbackAvailable = fallbackProvider.isConfigured() && await fallbackProvider.checkAvailability();

      providerResponse = fallbackAvailable
        ? await fallbackProvider.transcribe({ ...payload, requestId: request.requestId })
        : await createSTTProvider("mock").transcribe({ ...payload, requestId: request.requestId });
    }

    const result = voiceTranscriptionResponseSchema.parse({
      transcript: providerResponse.transcript.slice(0, 4000),
      provider: providerResponse.provider,
      fallbackUsed: providerResponse.fallbackUsed || fallbackUsed,
      safetyNotice: providerResponse.safetyNotice || TRANSCRIPT_REVIEW_NOTICE,
      requestId: request.requestId,
    });

    logger.info("ai_voice_transcription_response", {
      requestId: request.requestId,
      provider: result.provider,
      fallbackProvider: env.STT_FALLBACK_PROVIDER,
      fallbackUsed: result.fallbackUsed,
    });

    response.json({ data: result });
  };
}
