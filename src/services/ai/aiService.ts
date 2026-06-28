import type { AIIntent, AIRequest, AIResponse, ConversationMessage, ProviderError } from "../../types";
import { connectivityService } from "../connectivity/ConnectivityService";
import { syncProfile } from "../api/ProfileApi";
import { buildHealthContext } from "./healthContextBuilder";
import { generateDailyInsights } from "./insights/DailyInsightGenerator";
import { classifyIntent } from "./intentClassifier";
import { cachedAIResponseStore } from "../local-ai/CachedAIResponseStore";
import { longTermMemory } from "./memory/LongTermMemory";
import { buildProfile } from "./profile/ProfileBuilder";
import { conversationMemory } from "./ConversationMemory";
import { buildPrompt } from "./promptBuilder";
import { buildDirectMetricAnswer } from "./directMetricAnswer";
import { getAIProvider, getOfflineAIProvider } from "./providers/AIProviderFactory";
import { generatePersonalizedRecommendations } from "./recommendation/RecommendationEngineV2";
import { evaluateHealthSafety } from "./safety/HealthSafetyGuard";
import { generateHealthTrends } from "./trends/HealthTrendEngine";
import { traceIdService } from "../observability/TraceIdService";
import { healthOrchestrator, ORCHESTRATOR_VERSION } from "../agents/HealthOrchestrator";
import { createAITimingTrace, markAITiming, type AITimingTrace } from "./aiTiming";

declare const process: {
  env?: {
    NODE_ENV?: string;
    EXPO_PUBLIC_AI_PROVIDER_TIMEOUT_MS?: string;
  };
};

const DEFAULT_CLOUD_PROVIDER_TIMEOUT_MS = 11000;

const debugAIRoute = (label: string, details: Record<string, unknown>): void => {
  if (process.env?.NODE_ENV !== "production") {
    console.log(`[AI_ROUTE] ${label}`, details);
  }
};

const getCloudProviderTimeoutMs = (): number => {
  const configured = Number.parseInt(process.env?.EXPO_PUBLIC_AI_PROVIDER_TIMEOUT_MS ?? "", 10);

  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CLOUD_PROVIDER_TIMEOUT_MS;
};

const runBackground = (label: string, work: () => Promise<unknown>): void => {
  void work().catch((error) => {
    if (process.env?.NODE_ENV !== "production") {
      console.warn(`[AI_BACKGROUND] ${label} failed`, error);
    }
  });
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const guarded = promise.catch((error) => {
    throw error;
  });
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label}_timeout_${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([guarded, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    promise.catch(() => undefined);
  }
};

const createProviderError = (provider: ProviderError["provider"], error: unknown): ProviderError => ({
  provider,
  message: error instanceof Error ? error.message : "The AI provider request failed.",
  recoverable: true,
});

const createRequest = async (message: string, intent: AIIntent): Promise<AIRequest> => {
  const profile = buildProfile();
  void connectivityService.isOnline().then((online) => {
    if (online) {
      void syncProfile(profile).catch(() => undefined);
    }
  });
  const memories = await longTermMemory.getRelevantLocalMemories(message);
  const trends = generateHealthTrends();
  const conversation = conversationMemory.getMessages();
  const draftContext = buildHealthContext({
    profile,
    memories,
    trends,
    insights: [],
    recommendations: [],
    conversation,
  });
  const insights = generateDailyInsights({
    context: draftContext,
    profile,
    trends,
    recommendations: [],
  });
  const recommendations = generatePersonalizedRecommendations({
    context: {
      ...draftContext,
      insights,
    },
    intent,
    profile,
    memories,
    trends,
    insights,
  });
  const context = buildHealthContext({
    profile,
    memories,
    trends,
    insights,
    recommendations,
    conversation,
  });
  const request = {
    message,
    intent,
    context,
    prompt: "",
    conversation,
    traceId: traceIdService.createTraceId(),
  };

  return {
    ...request,
    prompt: buildPrompt(request),
  };
};

export function syncConversationMemory(messages: ConversationMessage[]): void {
  conversationMemory.replace(messages);
}

async function requestProviderResponse(request: AIRequest, timing?: AITimingTrace): Promise<AIResponse> {
  if (!(await connectivityService.isOnline())) {
    debugAIRoute("provider selected", { provider: "offline" });
    markAITiming(timing ?? createAITimingTrace("ai-provider"), "provider selected", { provider: "offline" });
    return getOfflineAIProvider().sendMessage(request);
  }

  const provider = getAIProvider();
  debugAIRoute("provider selected", { provider: provider.name });
  markAITiming(timing ?? createAITimingTrace("ai-provider"), "provider selected", { provider: provider.name });

  try {
    markAITiming(timing ?? createAITimingTrace("ai-provider"), "provider call", {
      provider: provider.name,
      timeoutMs: provider.name === "openai" ? getCloudProviderTimeoutMs() : undefined,
    });
    const response = provider.name === "openai"
      ? await withTimeout(provider.sendMessage(request), getCloudProviderTimeoutMs(), "cloud_provider")
      : await provider.sendMessage(request);

    markAITiming(timing ?? createAITimingTrace("ai-provider"), "provider call complete", { provider: provider.name });

    return response;
  } catch (error) {
    const providerError = createProviderError(provider.name, error);
    console.warn("AI provider failed; falling back to offline provider.", providerError);
    markAITiming(timing ?? createAITimingTrace("ai-provider"), "provider fallback start", { provider: provider.name });
    const offlineResponse = await getOfflineAIProvider().sendMessage(request);

    return {
      ...offlineResponse,
      metadata: {
        ...offlineResponse.metadata,
        fallback: true,
      },
    };
  }
}

const buildDirectRequest = (message: string, intent: AIIntent): AIRequest => {
  const context = buildHealthContext({
    profile: buildProfile(),
    memories: [],
    trends: [],
    insights: [],
    recommendations: [],
    conversation: conversationMemory.getMessages(),
  });
  const request = {
    message,
    intent,
    context,
    prompt: "",
    conversation: conversationMemory.getMessages(),
    traceId: traceIdService.createTraceId(),
  };

  return {
    ...request,
    prompt: buildPrompt(request),
  };
};

const rememberConversation = (message: string, response: AIResponse): void => {
  conversationMemory.add("user", message);
  conversationMemory.add("assistant", response.response, response.id);
};

const runPostResponseTasks = (request: AIRequest, response: AIResponse, timing: AITimingTrace): void => {
  markAITiming(timing, "memory save", { awaited: false });
  runBackground("memory save", () => longTermMemory.saveMemoriesFromMessage(request.message));
  markAITiming(timing, "response cache", { awaited: false });
  runBackground("response cache", () => cachedAIResponseStore.cacheResponse(request, response));
};

async function sendIntentMessage(message: string, intent: AIIntent, timing: AITimingTrace): Promise<AIResponse> {
  const safety = evaluateHealthSafety(message, intent);
  let safetyCategory = "safe";
  if (!safety.safe) {
    safetyCategory = safety.category;
  }
  markAITiming(timing, "safety guard", { safe: safety.safe, category: safetyCategory });
  debugAIRoute("message intent", { intent });
  debugAIRoute("safety classification", {
    safe: safety.safe,
    category: safetyCategory,
  });

  if (!safety.safe) {
    const safetyResponse: AIResponse = {
      ...safety.response,
      metadata: {
        ...safety.response.metadata,
        orchestratorVersion: ORCHESTRATOR_VERSION,
        coordinationMode: "sequential",
        agentsUsed: [],
        agentConfidence: "high",
        agentLatency: {},
        agentRoutingReason: "HealthSafetyGuard blocked the request before specialist routing.",
      },
    };
    rememberConversation(message, safetyResponse);
    markAITiming(timing, "urgent safety response ready", { responseId: safetyResponse.id });

    return safetyResponse;
  }

  const directRequest = buildDirectRequest(message, intent);
  markAITiming(timing, "health context build", {
    source: directRequest.context.deviceDataSource,
    status: directRequest.context.deviceDataStatus,
  });
  debugAIRoute("device source/status", {
    source: directRequest.context.deviceDataSource,
    status: directRequest.context.deviceDataStatus,
  });
  markAITiming(timing, "device sync check", { refreshed: false });
  const directAnswer = buildDirectMetricAnswer(message, intent, directRequest.context);
  markAITiming(timing, "direct metric answer", { used: Boolean(directAnswer) });

  if (directAnswer) {
    debugAIRoute("provider selected", { provider: "direct_local" });
    debugAIRoute("metric direct-answer used", { used: true });
    const response: AIResponse = {
      ...directAnswer,
      metadata: {
        ...directAnswer.metadata,
        traceId: directRequest.traceId,
        deviceDataSource: directRequest.context.deviceDataSource,
        deviceDataStatus: directRequest.context.deviceDataStatus,
      },
    };

    rememberConversation(message, response);
    runPostResponseTasks(directRequest, response, timing);
    markAITiming(timing, "UI response ready", { direct: true });

    return response;
  }

  debugAIRoute("metric direct-answer used", { used: false });
  const request = await createRequest(message, intent);
  markAITiming(timing, "full request build", { memoryCount: request.context.memory.length });
  const providerResponse = await requestProviderResponse(request, timing);
  const response = await healthOrchestrator.composeResponse(request, providerResponse);
  markAITiming(timing, "orchestrator", {
    agentsUsed: response.metadata?.agentsUsed?.length ?? 0,
  });

  rememberConversation(message, response);
  runPostResponseTasks(request, response, timing);
  markAITiming(timing, "UI response ready", { direct: false });

  return response;
}

export async function sendMessage(message: string): Promise<AIResponse> {
  const timing = createAITimingTrace("medibot-send");
  markAITiming(timing, "send start", { messageLength: message.length });
  const intent = classifyIntent(message);
  markAITiming(timing, "intent classification", { intent });

  return sendIntentMessage(message, intent, timing);
}

export async function generateNutritionAdvice(message = "Give me nutrition advice."): Promise<AIResponse> {
  return sendIntentMessage(message, "nutrition", createAITimingTrace("medibot-nutrition"));
}

export async function generateFitnessAdvice(message = "Give me fitness advice."): Promise<AIResponse> {
  return sendIntentMessage(message, "fitness", createAITimingTrace("medibot-fitness"));
}

export async function generateSleepAdvice(message = "Give me sleep advice."): Promise<AIResponse> {
  return sendIntentMessage(message, "sleep", createAITimingTrace("medibot-sleep"));
}

export async function generateMedicationAdvice(message = "Give me medication advice."): Promise<AIResponse> {
  return sendIntentMessage(message, "medication", createAITimingTrace("medibot-medication"));
}

export async function generateHydrationAdvice(message = "Give me hydration advice."): Promise<AIResponse> {
  return sendIntentMessage(message, "hydration", createAITimingTrace("medibot-hydration"));
}
