import type { Request, Response } from "express";
import { env } from "../config/env";
import { createAIProvider, getFallbackAIProvider, getPrimaryAIProvider } from "../ai/providers/AIProviderFactory";
import { HealthAISafetyGuard, SAFETY_NOTICE } from "../ai/safety/HealthAISafetyGuard";
import type { AIChatMessage, AIChatResponse, AIProviderStatus } from "../ai/types";
import type { BackendAIChatRequest, BackendHealthAIContext } from "../types/contracts";
import { logger } from "../utils/logger";

const toMode = (available: boolean): AIProviderStatus["mode"] => {
  if (env.AI_PROVIDER === "mock") return "development-safe";
  if (env.AI_PROVIDER === "ollama") return available ? "local" : "not-configured";

  return "not-configured";
};

const latestUserMessage = (request: BackendAIChatRequest): string => request.message.trim();

const appendIfDefined = (parts: string[], label: string, value: number | string | undefined): void => {
  if (value === undefined || value === "") return;
  parts.push(`${label}: ${value}`);
};

const summarizeHealthContext = (context?: BackendHealthAIContext, legacySummary?: string): string | undefined => {
  if (!context) return legacySummary?.trim();

  const parts: string[] = [
    `Scope: ${context.scope}`,
    `Summary: ${context.summary}`,
    "The data is user-logged app context and may be incomplete.",
  ];

  if (context.today) {
    appendIfDefined(parts, "Steps today", context.today.steps);
    appendIfDefined(parts, "Step goal", context.today.stepGoal);
    appendIfDefined(parts, "Meals logged today", context.today.mealsLogged);
    appendIfDefined(parts, "Calories logged today", context.today.caloriesLogged);
    appendIfDefined(parts, "Workouts logged today", context.today.workoutsLogged);
    appendIfDefined(parts, "Active minutes today", context.today.activeMinutes);
    appendIfDefined(parts, "Calories burned today", context.today.caloriesBurned);
    appendIfDefined(parts, "Water glasses today", context.today.waterGlasses);
    appendIfDefined(parts, "Water goal", context.today.waterGoal);
  }

  if (context.recent) {
    appendIfDefined(parts, "Nutrition summary", context.recent.nutritionSummary);
    appendIfDefined(parts, "Fitness summary", context.recent.fitnessSummary);
    appendIfDefined(parts, "Routine summary", context.recent.routineSummary);
    appendIfDefined(parts, "Reminder summary", context.recent.reminderSummary);
  }

  if (context.activeScreen) {
    appendIfDefined(parts, "Active screen", context.activeScreen.name);
    appendIfDefined(parts, "Selected item", context.activeScreen.selectedItemSummary);
  }

  return parts.join("\n").slice(0, 2200);
};

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
    const healthContextSummary = summarizeHealthContext(
      request.body.healthContext,
      request.body.healthContextSummary,
    );
    const contextUsed = Boolean(healthContextSummary);
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
          contextUsed,
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
      ...(healthContextSummary
        ? [{
            role: "system" as const,
            content: [
              "The user explicitly enabled a minimized Healthy You app context summary for this request only.",
              "Treat it as user-logged wellness data that may be incomplete.",
              "Use it to answer factual app-data questions when relevant, but do not infer diagnoses or treatment plans.",
              `Healthy You context summary:\n${healthContextSummary}`,
            ].join(" "),
          }]
        : []),
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
        healthContextSummary,
        mode: request.body.mode,
      });
    } catch {
      const fallbackAvailable = fallbackProvider.isConfigured() && await fallbackProvider.checkAvailability();

      if (!fallbackAvailable) {
        providerResponse = await createAIProvider("mock").chat({ messages, healthContextSummary, mode: request.body.mode });
      } else {
        providerResponse = await fallbackProvider.chat({ messages, healthContextSummary, mode: request.body.mode });
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
        contextUsed,
        requestId: request.requestId,
      },
    });
  };
}
