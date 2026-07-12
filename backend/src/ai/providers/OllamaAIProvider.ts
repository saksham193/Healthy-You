import { env } from "../../config/env";
import { HttpError } from "../../utils/httpError";
import type { AIChatRequest, AIChatResponse, AIChatMessage } from "../types";
import type { AIProvider } from "./AIProvider";

type OllamaChatResponse = {
  message?: {
    content?: unknown;
  };
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const buildOllamaMessages = (request: AIChatRequest): AIChatMessage[] => {
  const systemMessage: AIChatMessage = {
    role: "system",
    content: [
      "You are Medibot for Healthy You.",
      "Provide general wellness information only.",
      "Do not diagnose, prescribe, provide medication dosage instructions, or claim medical certainty.",
      "If symptoms may be urgent, advise seeking urgent medical help or local emergency services.",
    ].join(" "),
  };

  return [systemMessage, ...request.messages];
};

export class OllamaAIProvider implements AIProvider {
  readonly name = "ollama" as const;
  readonly model = env.OLLAMA_MODEL;

  isConfigured(): boolean {
    return Boolean(env.OLLAMA_BASE_URL && env.OLLAMA_MODEL);
  }

  async checkAvailability(): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const response = await fetchWithTimeout(`${env.OLLAMA_BASE_URL}/api/tags`, {
        method: "GET",
      }, Math.min(env.AI_PROVIDER_TIMEOUT_MS, 3000));

      return response.ok;
    } catch {
      return false;
    }
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    if (!this.isConfigured()) {
      throw new HttpError(503, "ai_provider_unavailable", "AI provider is not available.");
    }

    try {
      const response = await fetchWithTimeout(`${env.OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: env.OLLAMA_MODEL,
          stream: false,
          messages: buildOllamaMessages(request),
        }),
      }, env.AI_PROVIDER_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error("ollama_unavailable");
      }

      const parsed = await response.json() as OllamaChatResponse;
      const content = parsed.message?.content;

      if (typeof content !== "string" || content.trim().length === 0) {
        throw new Error("ollama_empty_response");
      }

      return {
        text: content.trim(),
        provider: this.name,
        model: this.model,
        fallbackUsed: false,
      };
    } catch {
      throw new HttpError(503, "ai_provider_unavailable", "AI provider is not available.");
    }
  }
}
