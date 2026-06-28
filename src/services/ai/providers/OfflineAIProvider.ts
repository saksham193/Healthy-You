import type { AIRequest, ProviderResponse } from "../../../types";
import { cachedAIResponseStore } from "../../local-ai/CachedAIResponseStore";
import { localRecommendationEngine } from "../../local-ai/LocalRecommendationEngine";
import { offlineHealthRulesEngine } from "../../local-ai/OfflineHealthRulesEngine";
import { offlineIntentClassifier } from "../../local-ai/OfflineIntentClassifier";
import { offlineKnowledgeCache } from "../../local-ai/OfflineKnowledgeCache";
import type { OfflineAIResponse, OfflineIntent, OfflineRule } from "../../local-ai/types";
import { offlineAnalytics } from "../../observability/OfflineAnalytics";
import { agentSelectionEngine } from "../../agents/AgentSelectionEngine";
import { ORCHESTRATOR_VERSION } from "../../agents/HealthOrchestrator";
import type { AIProvider } from "./AIProvider";

const safetyRank: Record<OfflineAIResponse["safetyLevel"], number> = {
  routine: 1,
  limited: 2,
  caution: 3,
  urgent: 4,
};

const toSafetyLevel = (rules: OfflineRule[]): OfflineAIResponse["safetyLevel"] =>
  rules.reduce<OfflineAIResponse["safetyLevel"]>(
    (highest, rule) => safetyRank[rule.safetyLevel] > safetyRank[highest] ? rule.safetyLevel : highest,
    "routine",
  );

const hasRecentContext = (request: AIRequest): boolean => {
  const lastSync = request.context.lastDeviceSyncAt
    ? new Date(request.context.lastDeviceSyncAt).getTime()
    : undefined;
  const recentSync = typeof lastSync === "number" &&
    Number.isFinite(lastSync) &&
    Date.now() - lastSync < 24 * 60 * 60 * 1000;
  const hasScores = request.context.healthScore > 0 ||
    request.context.nutritionScore > 0 ||
    request.context.fitnessScore > 0 ||
    request.context.sleepScore > 0;

  return hasScores && (recentSync || request.context.deviceDataSource === "live");
};

const hasRelevantContext = (request: AIRequest): boolean =>
  request.context.healthScore > 0 ||
  request.context.memory.length > 0 ||
  request.context.trends.length > 0 ||
  request.context.profile.profileCompletenessScore > 0;

const confidenceForIntent = (
  intent: OfflineIntent,
  rules: OfflineRule[],
  request: AIRequest,
  cachedResponseUsed: boolean,
): OfflineAIResponse["confidence"] => {
  if (intent === "unknown") return "low";
  if (intent === "emergency") return "medium";
  if (cachedResponseUsed && rules.length <= 1 && !hasRelevantContext(request)) return "low";
  if (rules.some((rule) => rule.safetyLevel === "limited")) return "medium";
  if (rules.some((rule) => rule.id === "general-safe-baseline")) return hasRelevantContext(request) ? "medium" : "low";
  if (hasRecentContext(request)) return "high";

  return "medium";
};

const offlinePrefix =
  "Offline response: I am using saved Healthy You data and local safety rules. This is limited wellness guidance, not a diagnosis or medical decision.";

const unique = (items: string[]): string[] => Array.from(new Set(items.filter(Boolean)));

const buildEmergencyResponse = (rules: OfflineRule[]): OfflineAIResponse => ({
  response: [
    offlinePrefix,
    rules[0]?.message,
    "Please seek urgent local medical help now. If emergency services are available where you are, contact them immediately.",
  ].filter(Boolean).join("\n\n"),
  suggestions: ["Call local emergency services.", "Go to the nearest emergency department.", "Ask someone nearby to stay with you."],
  offlineIntent: "emergency",
  rules,
  recommendations: [],
  knowledge: [],
  confidence: "medium",
  safetyLevel: "urgent",
  cachedResponseUsed: false,
});

export class OfflineAIProvider implements AIProvider {
  readonly name = "offline" as const;

  async sendMessage(request: AIRequest): Promise<ProviderResponse> {
    return this.generateHealthResponse(request);
  }

  async generateHealthResponse(request: AIRequest): Promise<ProviderResponse> {
    const offlineIntent = offlineIntentClassifier.classify(request.message);
    const rules = offlineHealthRulesEngine.evaluate({
      context: request.context,
      profile: request.context.profile,
      trends: request.context.trends,
      memory: request.context.memory,
      message: request.message,
      intent: offlineIntent,
    });

    if (offlineIntent === "emergency") {
      offlineAnalytics.trackOfflineUse();
      return this.toProviderResponse(request, buildEmergencyResponse(rules));
    }

    const recommendations = localRecommendationEngine.generate({
      intent: offlineIntent,
      context: request.context,
      profile: request.context.profile,
      memory: request.context.memory,
      trends: request.context.trends,
      rules,
    });
    const knowledge = offlineKnowledgeCache.search(request.message, offlineIntent);
    const cached = await cachedAIResponseStore.search(offlineIntent, request.message, 1);
    const safetyLevel = toSafetyLevel(rules);
    const cachedLine = cached[0]
      ? `Previously cached guidance on this topic: ${cached[0].responseSummary}`
      : undefined;
    const ruleLines = rules.slice(0, 3).map((rule) => rule.message);
    const recommendationLines = recommendations.slice(0, 3).map((item) => `Next step: ${item.message}`);
    const knowledgeLine = knowledge[0] ? `General note: ${knowledge[0].summary}` : undefined;
    const limitationLine = offlineIntent === "unknown"
      ? "I could not confidently classify this offline. Reconnect for full cloud AI, or ask about hydration, sleep, nutrition, fitness, medication, device sync, or trends."
      : "Reconnect when available for cloud AI, fresher device data, and fuller context.";
    const response = [
      offlinePrefix,
      cachedLine,
      ...ruleLines,
      ...recommendationLines,
      knowledgeLine,
      limitationLine,
      rules.find((rule) => rule.safetyLevel === safetyLevel)?.disclaimer,
    ].filter(Boolean).join("\n\n");
    const offlineResponse: OfflineAIResponse = {
      response,
      suggestions: unique([
        ...recommendations.map((item) => item.message),
        "Reconnect for cloud AI when available.",
        offlineIntent === "device_status" ? "Refresh device permissions and sync." : "",
      ]).slice(0, 4),
      offlineIntent,
      rules,
      recommendations,
      knowledge,
      confidence: confidenceForIntent(offlineIntent, rules, request, cached.length > 0),
      safetyLevel,
      cachedResponseUsed: cached.length > 0,
    };
    offlineAnalytics.trackOfflineUse({ cacheHit: offlineResponse.cachedResponseUsed });

    return this.toProviderResponse(request, offlineResponse);
  }

  async generateRecommendation(request: AIRequest): Promise<ProviderResponse> {
    return this.generateHealthResponse(request);
  }

  private toProviderResponse(request: AIRequest, offlineResponse: OfflineAIResponse): ProviderResponse {
    const decision = agentSelectionEngine.select(request.message, request.intent);

    return {
      id: `offline-${Date.now()}`,
      intent: request.intent,
      response: offlineResponse.response,
      suggestions: offlineResponse.suggestions,
      provider: this.name,
      metadata: {
        offline: true,
        traceId: request.traceId,
        source: "offline",
        cachedResponseUsed: offlineResponse.cachedResponseUsed,
        safetyLevel: offlineResponse.safetyLevel,
        confidence: offlineResponse.confidence,
        orchestratorVersion: ORCHESTRATOR_VERSION,
        coordinationMode: decision.executionMode,
        agentsUsed: decision.selectedAgents,
        agentConfidence: offlineResponse.confidence,
        agentLatency: {},
        agentRoutingReason: decision.reason,
        predictionCount: request.context.predictions.metrics.predictionCount,
        highRiskPredictionCount: request.context.predictions.metrics.highRiskCount,
        predictionCategories: request.context.predictions.metrics.predictionCategories,
        averagePredictionConfidence: request.context.predictions.metrics.averageConfidence,
        dataQualityIssues: request.context.predictions.metrics.dataQualityIssues,
      },
    };
  }
}
