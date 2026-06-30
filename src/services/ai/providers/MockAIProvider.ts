import type { AIContext, AIIntent, AIRequest, HealthInsight, ProviderResponse } from "../../../types";
import { generateHealthInsights } from "../healthInsightEngine";
import { getIntentDomain } from "../intentClassifier";
import { generateRecommendations } from "../recommendationEngine";
import type { AIProvider } from "./AIProvider";

const createId = (): string => `ai-${Date.now()}`;

const formatRecommendations = (recommendations: string[]): string =>
  recommendations.map((recommendation) => `- ${recommendation}`).join("\n");

const findRelevantInsights = (intent: AIIntent, insights: HealthInsight[]): HealthInsight[] => {
  const domain = getIntentDomain(intent);

  if (domain === "general") return insights.slice(0, 3);

  const relevant = insights.filter(
    (insight) => insight.category === domain || (domain === "fitness" && insight.category === "recovery"),
  );
  const general = insights.find((insight) => insight.category === "general");

  return general ? [general, ...relevant] : relevant;
};

const getIntentScore = (intent: AIIntent, context: AIContext): number => {
  const domain = getIntentDomain(intent);

  if (domain === "nutrition" || domain === "hydration") return context.nutritionScore;
  if (domain === "fitness") return context.fitnessScore;
  if (domain === "sleep") return context.sleepScore;
  if (domain === "medication") return context.adherenceScore;

  return Math.min(
    context.nutritionScore,
    context.fitnessScore,
    context.sleepScore,
    context.adherenceScore,
  );
};

const getContextSummary = (intent: AIIntent, context: AIContext): string => {
  const domain = getIntentDomain(intent);
  const intentScore = getIntentScore(intent, context);

  if (domain === "sleep") {
    return `Your overall health score is ${context.healthScore}, but your sleep score is ${context.sleepScore}. Device sleep is ${context.sleepMinutes ?? "unavailable"} minutes.`;
  }

  if (domain === "hydration") {
    return `Your overall health score is ${context.healthScore}, and hydration is ${context.hydrationStatus.toLowerCase()} today.`;
  }

  if (domain === "medication") {
    return `Your overall health score is ${context.healthScore}, and your medication adherence score is ${context.adherenceScore}.`;
  }

  if (domain === "nutrition") {
    return `Your overall health score is ${context.healthScore}, and your nutrition score is ${context.nutritionScore}.`;
  }

  if (domain === "fitness") {
    return `Your overall health score is ${context.healthScore}, fitness score is ${context.fitnessScore}, and device heart rate is ${context.heartRateBpm ? `${context.heartRateBpm} bpm` : "unavailable"}.`;
  }

  return `Your overall health score is ${context.healthScore}. Nutrition is ${context.nutritionScore}, fitness is ${context.fitnessScore}, sleep is ${context.sleepScore}, and medication adherence is ${context.adherenceScore}. The lowest current score is ${intentScore}.`;
};

const getScoreInterpretation = (intent: AIIntent, context: AIContext): string => {
  const domain = getIntentDomain(intent);
  const intentScore = getIntentScore(intent, context);

  if (context.healthScore - intentScore >= 15) {
    return "This suggests the topic you asked about may be holding back your overall wellbeing today.";
  }

  if (intentScore >= context.healthScore && domain !== "general") {
    return "This area is currently supporting your broader health profile.";
  }

  return "Small, consistent improvements here can help your daily energy and recovery.";
};

const createResponseText = (
  request: AIRequest,
  insights: HealthInsight[],
  recommendations: string[],
): string => {
  const decision = request.context.recommendationDecision;

  if (decision && /\b(top recommendation|recommendation|what should i do first|what should i do today|what should i focus on today|why did you recommend)\b/i.test(request.message)) {
    return [
      decision.primary.action,
      "",
      `Why: ${decision.rankingReason}`,
      `Confidence: ${decision.confidence}.`,
    ].join("\n");
  }

  if (request.intent === "daily_briefing") {
    const briefing = request.context.dailyBriefing;
    if (!briefing) {
      return "I do not have enough local context for a daily briefing yet. Refresh Health Connect or ask for a current metric.";
    }

    const actionLines = briefing.recommendedActions.length > 0
      ? formatRecommendations(briefing.recommendedActions.slice(0, 3))
      : "- Keep one small wellness action today.";

    return [
      `${briefing.greeting} ${briefing.summary}`,
      "",
      `Focus: ${briefing.focusArea ?? "general wellness"}.`,
      `Data note: ${briefing.dataSourceNote}`,
      "",
      "Recommended actions:",
      actionLines,
    ].join("\n");
  }

  const relevantInsights = findRelevantInsights(request.intent, insights);
  const insightLines = relevantInsights.length > 0
    ? relevantInsights.map((insight) => `- ${insight.message}`).join("\n")
    : "- No major risk patterns detected in the current local health snapshot.";

  return [
    getContextSummary(request.intent, request.context),
    getScoreInterpretation(request.intent, request.context),
    `I am using a ${request.context.intelligenceProfile.preferredCoachingStyle} coaching style with ${request.context.intelligenceProfile.personalizationScore}% personalization confidence.`,
    request.context.goalHabitCoaching.suggestedNextAction
      ? `Current coaching focus: ${request.context.goalHabitCoaching.suggestedNextAction}`
      : "",
    request.context.aiInsights?.topInsights[0]
      ? `Top insight: ${request.context.aiInsights.topInsights[0].title}. ${request.context.aiInsights.topInsights[0].summary}`
      : "",
    "",
    "Possible contributing factors:",
    insightLines,
    "",
    "Recommendations:",
    formatRecommendations(recommendations),
  ].join("\n");
};

export class MockAIProvider implements AIProvider {
  readonly name = "mock" as const;

  async sendMessage(request: AIRequest): Promise<ProviderResponse> {
    return this.generateHealthResponse(request);
  }

  async generateHealthResponse(request: AIRequest): Promise<ProviderResponse> {
    const insights = request.prompt.length > 0 ? generateHealthInsights(request.context) : [];
    const topInsight = request.context.aiInsights?.topInsights[0];
    const briefing = request.context.dailyBriefing;
    const decision = request.context.recommendationDecision;
    const preventive = request.context.preventiveSummary;
    const recommendations = (request.context.personalizedRecommendations ?? []).length > 0
      ? request.context.personalizedRecommendations.map((recommendation) => recommendation.message)
      : decision
        ? [decision.primary.action, ...decision.alternatives.map((item) => item.action)]
      : (request.context.dailyBriefing?.recommendedActions ?? []).length > 0
        ? request.context.dailyBriefing?.recommendedActions ?? []
      : generateRecommendations(request.context, request.intent).map(
          (recommendation) => recommendation.message,
        );

    return {
      id: createId(),
      intent: request.intent,
      response: createResponseText(request, insights, recommendations),
      suggestions: recommendations,
      provider: this.name,
      metadata: {
        source: "mock",
        safetyLevel: "routine",
        personalizationScore: request.context.intelligenceProfile?.personalizationScore,
        coachingStyle: request.context.intelligenceProfile?.preferredCoachingStyle,
        preferredResponseLength: request.context.intelligenceProfile?.preferredResponseLength,
        learnedPreferenceCount: request.context.intelligenceProfile?.learnedPreferences.length,
        trendConfidence: request.context.trendIntelligence?.confidence,
        trendDataQuality: request.context.trendIntelligence?.dataQuality,
        trendSignalCount: request.context.trendIntelligence?.topTrends.length,
        coachingProgressScore: request.context.goalHabitCoaching?.progressScore,
        activeGoalCount: request.context.goalHabitCoaching?.goals.filter((goal) => goal.status === "active" || goal.status === "at_risk").length,
        atRiskHabitCount: request.context.goalHabitCoaching?.atRiskCount,
        topInsightCategory: topInsight?.category,
        topInsightPriority: topInsight?.priority,
        topInsightConfidence: topInsight?.confidence,
        insightCount: request.context.aiInsights?.allInsights.length,
        briefingGeneratedAt: briefing?.generatedAt,
        briefingRecommendedActionCount: briefing?.recommendedActions.length,
        briefingFocusArea: briefing?.focusArea,
        briefingConfidence: briefing?.confidence,
        briefingSafetyLevel: briefing?.safetyLevel,
        recommendationDecisionId: decision?.id,
        recommendationPrimaryAction: decision?.primary.action,
        recommendationPrimaryCategory: decision?.primary.category,
        recommendationPrimarySource: decision?.primary.source,
        recommendationDecisionConfidence: decision?.confidence,
        recommendationAlternativeCount: decision?.alternatives.length,
        recommendationSuppressedCount: decision?.suppressed.length,
        recommendationRankingReason: decision?.rankingReason,
        preventiveOverallRisk: preventive?.overallRisk,
        preventivePrimaryRisk: preventive?.primaryRisk?.title,
        preventiveFocus: preventive?.focus,
        preventiveConfidence: preventive?.confidence,
        preventiveRiskCount: preventive?.risks.length,
      },
    };
  }

  async generateRecommendation(request: AIRequest): Promise<ProviderResponse> {
    return this.generateHealthResponse(request);
  }
}
