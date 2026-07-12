import { ApiRequestError, apiClient } from "../api/ApiClient";
import { classifyIntent } from "./intentClassifier";
import type { AIResponse } from "../../types";

const DEFAULT_MEDIBOT_TIMEOUT_MS = 15000;
const SAFETY_NOTICE = "This is general wellness information, not a medical diagnosis or treatment plan.";
const FALLBACK_NOTICE =
  "I am using safe fallback mode right now. I can still share general wellness information, but this is not medical advice.";

type MedibotChatMode = "chat" | "nutrition" | "fitness" | "schedule" | "data-insight";

type BackendMedibotProvider =
  | "mock"
  | "ollama"
  | "gemini"
  | "groq"
  | "openrouter"
  | "huggingface"
  | "openai";

type BackendProviderStatus = {
  provider: BackendMedibotProvider;
  available: boolean;
  fallbackProvider: BackendMedibotProvider;
  safetyGuardEnabled: boolean;
  mode: "development-safe" | "local" | "not-configured";
  requestId?: string;
};

type BackendMedibotChatResponse = {
  reply: string;
  provider: BackendMedibotProvider;
  fallbackUsed: boolean;
  safetyNotice?: string;
  requestId?: string;
};

export type MedibotRuntimeStatus = {
  label: "Demo" | "Local" | "Backend" | "Fallback";
  provider?: BackendMedibotProvider;
  available: boolean;
  fallbackProvider?: BackendMedibotProvider;
};

const getMedibotTimeoutMs = (): number => {
  const configured = Number.parseInt(
    (globalThis as { process?: { env?: { EXPO_PUBLIC_AI_PROVIDER_TIMEOUT_MS?: string } } }).process?.env
      ?.EXPO_PUBLIC_AI_PROVIDER_TIMEOUT_MS ?? "",
    10,
  );

  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MEDIBOT_TIMEOUT_MS;
};

const buildModeLabel = (status: BackendProviderStatus): MedibotRuntimeStatus["label"] => {
  if (!status.available) return "Fallback";
  if (status.provider === "mock") return "Demo";
  if (status.provider === "ollama") return "Local";

  return "Backend";
};

const isBackendProviderStatus = (value: unknown): value is BackendProviderStatus => {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<BackendProviderStatus>;

  return typeof candidate.provider === "string" &&
    typeof candidate.available === "boolean" &&
    typeof candidate.fallbackProvider === "string" &&
    typeof candidate.safetyGuardEnabled === "boolean" &&
    typeof candidate.mode === "string";
};

const isBackendChatResponse = (value: unknown): value is BackendMedibotChatResponse => {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<BackendMedibotChatResponse>;

  return typeof candidate.reply === "string" &&
    candidate.reply.trim().length > 0 &&
    typeof candidate.provider === "string" &&
    typeof candidate.fallbackUsed === "boolean";
};

export async function getMedibotRuntimeStatus(): Promise<MedibotRuntimeStatus> {
  const status = await apiClient.get<BackendProviderStatus>("/ai/providers/status", {
    timeoutMs: 5000,
  });

  if (!isBackendProviderStatus(status)) {
    throw new ApiRequestError(502, "invalid_provider_status", "AI provider status is unavailable.");
  }

  return {
    label: buildModeLabel(status),
    provider: status.provider,
    available: status.available,
    fallbackProvider: status.fallbackProvider,
  };
}

export async function sendBackendMedibotMessage(
  message: string,
  mode: MedibotChatMode = "chat",
): Promise<AIResponse> {
  const result = await apiClient.post<BackendMedibotChatResponse>(
    "/ai/chat",
    {
      message,
      mode,
    },
    {
      timeoutMs: getMedibotTimeoutMs(),
    },
  );

  if (!isBackendChatResponse(result)) {
    throw new ApiRequestError(502, "invalid_ai_chat_response", "Medibot returned an invalid response.");
  }

  const reply = result.safetyNotice && !result.reply.includes(result.safetyNotice)
    ? `${result.reply} ${result.safetyNotice}`
    : result.reply;

  return {
    id: `backend-ai-${Date.now()}`,
    intent: classifyIntent(message),
    response: reply,
    suggestions: [
      "Ask a follow-up wellness question.",
      "Ask what to discuss with a qualified professional.",
      "Ask for a small habit idea.",
    ],
    provider: "backend",
    metadata: {
      source: result.provider === "mock" ? "mock" : "cloud",
      fallback: result.fallbackUsed,
      safetyLevel: "wellness",
      backendProvider: result.provider,
      backendFallbackUsed: result.fallbackUsed,
      backendRequestId: result.requestId,
      safetyNotice: result.safetyNotice ?? SAFETY_NOTICE,
      runtimeMode: "backend",
    },
  };
}

export function buildSafeMedibotFallbackResponse(message: string): AIResponse {
  return {
    id: `fallback-ai-${Date.now()}`,
    intent: classifyIntent(message),
    response: `${FALLBACK_NOTICE} ${SAFETY_NOTICE}`,
    suggestions: [
      "Try again when the backend is available.",
      "Ask a general wellness question.",
      "Use emergency services for urgent symptoms.",
    ],
    provider: "offline",
    metadata: {
      source: "offline",
      fallback: true,
      offline: true,
      safetyLevel: "wellness",
      safetyNotice: SAFETY_NOTICE,
      runtimeMode: "fallback",
    },
  };
}
