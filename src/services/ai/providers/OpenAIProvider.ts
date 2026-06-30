import { sendAIRequest } from "../../api/AIApi";
import type { AIRequest, ProviderResponse } from "../../../types";
import { generateRecommendations } from "../recommendationEngine";
import type { AIProvider } from "./AIProvider";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;

  async sendMessage(request: AIRequest): Promise<ProviderResponse> {
    return this.generateHealthResponse(request);
  }

  async generateHealthResponse(request: AIRequest): Promise<ProviderResponse> {
    const response = await sendAIRequest(request);
    const decision = request.context.recommendationDecision;
    const decisionSuggestions = decision
      ? [decision.primary.action, ...decision.alternatives.map((item) => item.action)]
      : [];
    const fallbackSuggestions = (request.context.personalizedRecommendations ?? []).length > 0
      ? request.context.personalizedRecommendations.map((recommendation) => recommendation.message)
      : decisionSuggestions.length > 0
        ? decisionSuggestions
      : (request.context.dailyBriefing?.recommendedActions ?? []).length > 0
        ? request.context.dailyBriefing?.recommendedActions ?? []
      : generateRecommendations(request.context, request.intent).map(
          (recommendation) => recommendation.message,
        );
    const topInsight = request.context.aiInsights?.topInsights[0];
    const briefing = request.context.dailyBriefing;
    const preventive = request.context.preventiveSummary;

    return {
      ...response,
      suggestions: response.suggestions.length > 0
        ? response.suggestions
        : fallbackSuggestions.slice(0, 5),
      provider: this.name,
      metadata: {
        ...response.metadata,
        source: "cloud",
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
