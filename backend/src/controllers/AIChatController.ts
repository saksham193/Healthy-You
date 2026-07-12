import type { Request, Response } from "express";
import { env } from "../config/env";
import { createAIProvider, getFallbackAIProvider, getPrimaryAIProvider } from "../ai/providers/AIProviderFactory";
import { HealthAISafetyGuard, SAFETY_NOTICE } from "../ai/safety/HealthAISafetyGuard";
import type { AIChatMessage, AIChatResponse, AIProviderStatus } from "../ai/types";
import type { BackendAIChatRequest } from "../types/contracts";
import { logger } from "../utils/logger";

const toMode = (available: boolean): AIProviderStatus["mode"] => {
  if (env.AI_PROVIDER === "mock") return "development-safe";
  if (env.AI_PROVIDER === "ollama") return available ? "local" : "not-configured";

  return "not-configured";
};

const latestUserMessage = (request: BackendAIChatRequest): string => request.message.trim();

export class AIChatController {
  constructor(private readonly safetyGuard = new HealthAISafetyGuard()) {}

  getProviderStatus = async (request: Request, response: Response): Promise<void> => {
    const provider = getPrimaryAIProvider();
    const available = provider.isConfigured() && await provider.checkAvailability();

    response.json({
      data: {
        provider: provider.name,
        available,
        fallbackProvider: env.AI_FALLBACK_PROVIDER,
        safetyGuardEnabled: this.safetyGuard.enabled,
        mode: toMode(available),
        requestId: request.requestId,
      },
    });
  };

  chat = async (
    request: Request<unknown, unknown, BackendAIChatRequest>,
    response: Response,
  ): Promise<void> => {
    const message = latestUserMessage(request.body);
    const safety = this.safetyGuard.evaluateUserMessage(message);

    if (!safety.allowed) {
      const blockedResponse: AIChatResponse = {
        text: `${safety.reply} ${SAFETY_NOTICE}`,
        provider: "mock",
        fallbackUsed: true,
        safetyNotice: SAFETY_NOTICE,
      };

      response.json({
        data: {
          reply: blockedResponse.text,
          provider: blockedResponse.provider,
          fallbackUsed: blockedResponse.fallbackUsed,
          safetyNotice: blockedResponse.safetyNotice,
          requestId: request.requestId,
        },
      });
      return;
    }

    const messages: AIChatMessage[] = [
      {
        role: "system",
        content: "Provide safe, general wellness support only. Do not diagnose, prescribe, or claim medical certainty.",
      },
      {
        role: "user",
        content: message,
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
        healthContextSummary: request.body.healthContextSummary,
        mode: request.body.mode,
      });
    } catch {
      const fallbackAvailable = fallbackProvider.isConfigured() && await fallbackProvider.checkAvailability();

      if (!fallbackAvailable) {
        providerResponse = await createAIProvider("mock").chat({ messages, mode: request.body.mode });
      } else {
        providerResponse = await fallbackProvider.chat({ messages, mode: request.body.mode });
      }
      fallbackUsed = true;
    }

    const guarded = this.safetyGuard.applyToResponse({
      ...providerResponse,
      fallbackUsed,
    });

    logger.info("ai_chat_response", {
      requestId: request.requestId,
      provider: guarded.provider,
      fallbackProvider: env.AI_FALLBACK_PROVIDER,
      fallbackUsed: guarded.fallbackUsed,
    });

    response.json({
      data: {
        reply: guarded.text,
        provider: guarded.provider,
        fallbackUsed: guarded.fallbackUsed,
        safetyNotice: guarded.safetyNotice,
        requestId: request.requestId,
      },
    });
  };
}
