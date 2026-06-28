import type { AIRequest, ProviderResponse } from "../../types";
import { apiClient } from "./ApiClient";

const DEFAULT_AI_TIMEOUT_MS = 11000;

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
