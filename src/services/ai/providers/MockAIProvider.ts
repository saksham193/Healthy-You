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
  const relevantInsights = findRelevantInsights(request.intent, insights);
  const insightLines = relevantInsights.length > 0
    ? relevantInsights.map((insight) => `- ${insight.message}`).join("\n")
    : "- No major risk patterns detected in the current local health snapshot.";

  return [
    getContextSummary(request.intent, request.context),
    getScoreInterpretation(request.intent, request.context),
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
    const recommendations = generateRecommendations(request.context, request.intent).map(
      (recommendation) => recommendation.message,
    );

    return {
      id: createId(),
      intent: request.intent,
      response: createResponseText(request, insights, recommendations),
      suggestions: recommendations,
      provider: this.name,
    };
  }

  async generateRecommendation(request: AIRequest): Promise<ProviderResponse> {
    return this.generateHealthResponse(request);
  }
}
