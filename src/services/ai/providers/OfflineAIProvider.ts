import type { AIRequest, ProviderResponse, RecommendationCandidate, RecommendationCategory, RecommendationDecision } from "../../../types";
import { cachedAIResponseStore } from "../../local-ai/CachedAIResponseStore";
import { localRecommendationEngine } from "../../local-ai/LocalRecommendationEngine";
import { offlineHealthRulesEngine } from "../../local-ai/OfflineHealthRulesEngine";
import { offlineIntentClassifier } from "../../local-ai/OfflineIntentClassifier";
import { offlineKnowledgeCache } from "../../local-ai/OfflineKnowledgeCache";
import type { OfflineAIResponse, OfflineIntent, OfflineRule } from "../../local-ai/types";
import { offlineAnalytics } from "../../observability/OfflineAnalytics";
import { agentSelectionEngine } from "../../agents/AgentSelectionEngine";
import { ORCHESTRATOR_VERSION } from "../../agents/HealthOrchestrator";
import { normalizeRecommendationText, recommendationDecisionOrchestrator } from "../recommendation/RecommendationDecisionOrchestrator";
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

const compactBriefingLine = (request: AIRequest): string | undefined => {
  const briefing = request.context.dailyBriefing;
  if (!briefing) return undefined;

  const actions = briefing.recommendedActions.slice(0, 3).join(" ");

  return [
    `Daily briefing: ${briefing.greeting} ${briefing.summary}`,
    actions ? `Briefing actions: ${actions}` : "",
    `Briefing metadata: focus ${briefing.focusArea ?? "general wellness"}, ${briefing.confidence} confidence, ${briefing.safetyLevel} safety. ${briefing.dataSourceNote}`,
  ].filter(Boolean).join("\n");
};

const categoryForOfflineIntent = (intent: OfflineIntent, message: string): RecommendationCategory => {
  if (intent === "hydration" || /\bwater|hydration|hydrate\b/i.test(message)) return "hydration";
  if (intent === "sleep" || /\bsleep|bedtime|rest\b/i.test(message)) return "sleep";
  if (intent === "fitness" || /\bactivity|steps|walk|movement|fitness|workout\b/i.test(message)) return "activity";
  if (intent === "nutrition" || /\bfood|meal|nutrition|protein|calorie\b/i.test(message)) return "nutrition";
  if (intent === "medication" || /\bmedication|medicine|pill|dose\b/i.test(message)) return "medication";
  if (intent === "device_status" || /\bdevice|sync|health connect\b/i.test(message)) return "device_data";

  return "general_wellness";
};

const offlineRecommendationCandidates = (
  recommendations: OfflineAIResponse["recommendations"],
  now: Date,
): RecommendationCandidate[] =>
  recommendations.map((recommendation) => {
    const category = categoryForOfflineIntent(recommendation.intent, `${recommendation.message} ${recommendation.reason}`);

    return {
      id: `decision-offline-${recommendation.id}`,
      title: recommendation.message.length <= 56 ? recommendation.message : `${category.replace(/_/g, " ")} offline recommendation`,
      summary: recommendation.reason,
      category,
      source: "fallback",
      supportingSources: ["fallback"],
      priority: recommendation.priority,
      confidence: "medium",
      action: recommendation.message,
      reason: `Offline local recommendation: ${recommendation.reason}`,
      safetyLevel: recommendation.intent === "medication" ? "caution" : "normal",
      dedupeKey: `${category}:${normalizeRecommendationText(recommendation.message)}`,
      createdAt: now.toISOString(),
    };
  });

const compactDecisionLine = (decision: RecommendationDecision): string =>
  [
    `Recommendation decision: ${decision.primary.action}`,
    `Decision why: ${decision.rankingReason}`,
    `Decision confidence: ${decision.confidence}. Alternatives: ${decision.alternatives.length}; suppressed: ${decision.suppressed.length}.`,
  ].join("\n");

const compactPreventiveLine = (request: AIRequest): string | undefined => {
  const summary = request.context.preventiveSummary;
  if (!summary) return undefined;

  return [
    `Preventive wellness: overall ${summary.overallRisk} risk, focus ${summary.focus}, confidence ${summary.confidence}.`,
    summary.primaryRisk ? `Primary preventive risk: ${summary.primaryRisk.title}. ${summary.primaryRisk.summary}` : "",
  ].filter(Boolean).join("\n");
};

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
    const localDecision = recommendationDecisionOrchestrator.generate({
      context: request.context,
      extraCandidates: offlineRecommendationCandidates(recommendations, new Date()),
    });
    const knowledge = offlineKnowledgeCache.search(request.message, offlineIntent);
    const cached = await cachedAIResponseStore.search(offlineIntent, request.message, 1);
    const safetyLevel = toSafetyLevel(rules);
    const cachedLine = cached[0]
      ? `Previously cached guidance on this topic: ${cached[0].responseSummary}`
      : undefined;
    const ruleLines = rules.slice(0, 3).map((rule) => rule.message);
    const recommendationLines = recommendations.slice(0, 3).map((item) => `Next step: ${item.message}`);
    const explanationLines = recommendations.slice(0, 2).map((item) => `Why this fits you: ${item.reason}`);
    const intelligenceProfile = request.context.intelligenceProfile;
    const coachingStyle = intelligenceProfile?.preferredCoachingStyle ?? "friendly";
    const personalizationScore = intelligenceProfile?.personalizationScore ?? request.context.profile.profileCompletenessScore ?? 0;
    const preferredResponseLength = intelligenceProfile?.preferredResponseLength ?? "concise";
    const learnedPreferenceCount = intelligenceProfile?.learnedPreferences.length ?? 0;
    const styleLine = `Coaching style: ${coachingStyle}; personalization score ${personalizationScore}%.`;
    const trendLine = request.context.trendIntelligence?.compactSummary.length
      ? `Trend summary: ${request.context.trendIntelligence.compactSummary.slice(0, 3).join(" ")}`
      : undefined;
    const driftLine = request.context.trendIntelligence?.habitDrifts.length
      ? `Habit drift: ${request.context.trendIntelligence.habitDrifts.slice(0, 2).map((drift) => drift.message).join(" ")}`
      : undefined;
    const coachingLine = request.context.goalHabitCoaching?.compactSummary.length
      ? `Coaching summary: ${request.context.goalHabitCoaching.compactSummary.slice(0, 3).join(" ")}`
      : undefined;
    const insightLine = request.context.aiInsights?.compactSummary.length
      ? `Top insights: ${request.context.aiInsights.compactSummary.slice(0, 3).join(" ")}`
      : undefined;
    const briefingLine = compactBriefingLine(request);
    const decisionLine = compactDecisionLine(localDecision);
    const preventiveLine = compactPreventiveLine(request);
    const knowledgeLine = knowledge[0] ? `General note: ${knowledge[0].summary}` : undefined;
    const limitationLine = offlineIntent === "unknown"
      ? "I could not confidently classify this offline. Reconnect for full cloud AI, or ask about hydration, sleep, nutrition, fitness, medication, device sync, or trends."
      : "Reconnect when available for cloud AI, fresher device data, and fuller context.";
    const response = [
      offlinePrefix,
      cachedLine,
      styleLine,
      trendLine,
      driftLine,
      preventiveLine,
      decisionLine,
      briefingLine,
      coachingLine,
      insightLine,
      ...ruleLines,
      ...recommendationLines,
      ...explanationLines,
      knowledgeLine,
      limitationLine,
      rules.find((rule) => rule.safetyLevel === safetyLevel)?.disclaimer,
    ].filter(Boolean).join("\n\n");
    const offlineResponse: OfflineAIResponse = {
      response,
      suggestions: unique([
        localDecision.primary.action,
        ...localDecision.alternatives.map((item) => item.action),
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

    return this.toProviderResponse(request, offlineResponse, localDecision);
  }

  async generateRecommendation(request: AIRequest): Promise<ProviderResponse> {
    return this.generateHealthResponse(request);
  }

  private toProviderResponse(request: AIRequest, offlineResponse: OfflineAIResponse, localDecision = request.context.recommendationDecision): ProviderResponse {
    const decision = agentSelectionEngine.select(request.message, request.intent);
    const intelligenceProfile = request.context.intelligenceProfile;
    const coachingStyle = intelligenceProfile?.preferredCoachingStyle ?? "friendly";
    const personalizationScore = intelligenceProfile?.personalizationScore ?? request.context.profile.profileCompletenessScore ?? 0;
    const preferredResponseLength = intelligenceProfile?.preferredResponseLength ?? "concise";
    const learnedPreferenceCount = intelligenceProfile?.learnedPreferences.length ?? 0;
    const coaching = request.context.goalHabitCoaching;
    const topInsight = request.context.aiInsights?.topInsights[0];
    const briefing = request.context.dailyBriefing;
    const preventive = request.context.preventiveSummary;

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
        personalizationScore,
        coachingStyle,
        preferredResponseLength,
        learnedPreferenceCount,
        trendConfidence: request.context.trendIntelligence?.confidence,
        trendDataQuality: request.context.trendIntelligence?.dataQuality,
        trendSignalCount: request.context.trendIntelligence?.topTrends.length,
        coachingProgressScore: coaching?.progressScore,
        activeGoalCount: coaching?.goals.filter((goal) => goal.status === "active" || goal.status === "at_risk").length,
        atRiskHabitCount: coaching?.atRiskCount,
        topInsightCategory: topInsight?.category,
        topInsightPriority: topInsight?.priority,
        topInsightConfidence: topInsight?.confidence,
        insightCount: request.context.aiInsights?.allInsights.length,
        briefingGeneratedAt: briefing?.generatedAt,
        briefingRecommendedActionCount: briefing?.recommendedActions.length,
        briefingFocusArea: briefing?.focusArea,
        briefingConfidence: briefing?.confidence,
        briefingSafetyLevel: briefing?.safetyLevel,
        recommendationDecisionId: localDecision?.id,
        recommendationPrimaryAction: localDecision?.primary.action,
        recommendationPrimaryCategory: localDecision?.primary.category,
        recommendationPrimarySource: localDecision?.primary.source,
        recommendationDecisionConfidence: localDecision?.confidence,
        recommendationAlternativeCount: localDecision?.alternatives.length,
        recommendationSuppressedCount: localDecision?.suppressed.length,
        recommendationRankingReason: localDecision?.rankingReason,
        preventiveOverallRisk: preventive?.overallRisk,
        preventivePrimaryRisk: preventive?.primaryRisk?.title,
        preventiveFocus: preventive?.focus,
        preventiveConfidence: preventive?.confidence,
        preventiveRiskCount: preventive?.risks.length,
      },
    };
  }
}
