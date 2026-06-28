import type {
  AIContext,
  AIIntent,
  DailyInsight,
  HealthTrend,
  MemoryRecord,
  PersonalHealthProfile,
  PersonalizedRecommendation,
} from "../../../types";
import { getIntentDomain } from "../intentClassifier";
import { generateRecommendations } from "../recommendationEngine";

type RecommendationInput = {
  context: AIContext;
  intent: AIIntent;
  profile: PersonalHealthProfile;
  memories: MemoryRecord[];
  trends: HealthTrend[];
  insights?: DailyInsight[];
};

const createRecommendation = (
  id: string,
  intent: AIIntent,
  message: string,
  reason: string,
  priority: PersonalizedRecommendation["priority"],
): PersonalizedRecommendation => ({
  id,
  intent,
  message,
  reason,
  priority,
});

const getPriority = (score: number): PersonalizedRecommendation["priority"] => {
  if (score < 70) return "high";
  if (score < 85) return "medium";

  return "low";
};

const getIntentScore = (context: AIContext, intent: AIIntent): number => {
  const domain = getIntentDomain(intent);

  if (domain === "nutrition" || domain === "hydration") return context.nutritionScore;
  if (domain === "fitness") return context.fitnessScore;
  if (domain === "sleep") return context.sleepScore;
  if (domain === "medication") return context.adherenceScore;

  return Math.min(context.nutritionScore, context.fitnessScore, context.sleepScore, context.adherenceScore);
};

const memoryReason = (memories: MemoryRecord[]): string | undefined => {
  const memory = memories.find((item) =>
    ["goal", "dietary_preference", "exercise_preference", "medication_habit"].includes(item.category),
  );

  return memory ? `Based on remembered ${memory.category.replace(/_/g, " ")}: ${memory.value}` : undefined;
};

const getTrendRecommendation = (
  trend: HealthTrend,
  intent: AIIntent,
): PersonalizedRecommendation | undefined => {
  if (trend.riskIndicators.length === 0) return undefined;

  const messageByMetric: Record<HealthTrend["metric"], string> = {
    weight: "Keep weight changes gradual and pair nutrition changes with routine activity.",
    sleep: "Protect a consistent wind-down time tonight.",
    calories: "Choose balanced meals and avoid making large calorie swings.",
    water: "Add two scheduled hydration check-ins today.",
    steps: "Add a short walk to close the activity gap.",
    medicationAdherence: "Use a reminder for the next medication window.",
  };

  return createRecommendation(
    `v2-trend-${trend.metric}`,
    intent,
    messageByMetric[trend.metric],
    trend.riskIndicators[0] ?? `${trend.metric} trend needs attention.`,
    "high",
  );
};

export function generatePersonalizedRecommendations(input: RecommendationInput): PersonalizedRecommendation[] {
  const baseline = generateRecommendations(input.context, input.intent).map((recommendation) =>
    createRecommendation(
      `v2-${recommendation.id}`,
      recommendation.intent,
      recommendation.message,
      `Matched to current ${input.intent} context.`,
      getPriority(getIntentScore(input.context, input.intent)),
    ),
  );
  const trendRecommendation = input.trends
    .map((trend) => getTrendRecommendation(trend, input.intent))
    .find((recommendation): recommendation is PersonalizedRecommendation => Boolean(recommendation));
  const rememberedReason = memoryReason(input.memories);
  const memoryRecommendation = rememberedReason
    ? createRecommendation(
        "v2-memory-personalization",
        input.intent,
        "Keep today's plan aligned with your remembered preferences and goals.",
        rememberedReason,
        "medium",
      )
    : undefined;
  const profileRecommendation = input.profile.profileCompletenessScore < 70
    ? createRecommendation(
        "v2-profile-completion",
        "general",
        "Complete missing profile details to improve future personalization.",
        `Profile completeness is ${input.profile.profileCompletenessScore}%.`,
        "medium",
      )
    : undefined;

  return [
    trendRecommendation,
    memoryRecommendation,
    profileRecommendation,
    ...baseline,
  ].filter((recommendation): recommendation is PersonalizedRecommendation => Boolean(recommendation)).slice(0, 5);
}
