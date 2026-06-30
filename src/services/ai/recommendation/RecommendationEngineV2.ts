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
import { explainRecommendation } from "../personalization/PersonalizationEngine";
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

const getTrendIntelligenceRecommendation = (
  input: RecommendationInput,
): PersonalizedRecommendation | undefined => {
  const drift = input.context.trendIntelligence?.habitDrifts[0];
  const topTrend = input.context.trendIntelligence?.topTrends[0];
  const signal = drift
    ? input.context.trendIntelligence.metrics.find((item) => item.metric === drift.metric) ?? topTrend
    : topTrend;

  if (!signal || signal.direction === "insufficient_data") return undefined;

  if (signal.metric === "hydration_ml" && (signal.direction === "declining" || signal.habitDrift)) {
    return createRecommendation(
      "v2-trend-intelligence-hydration",
      "hydration",
      "Prioritize two simple hydration check-ins today.",
      signal.interpretation,
      "high",
    );
  }

  if (signal.metric === "sleep_minutes" && (signal.direction === "declining" || signal.habitDrift)) {
    return createRecommendation(
      "v2-trend-intelligence-sleep",
      "sleep",
      "Protect sleep recovery before adding workout intensity.",
      signal.interpretation,
      "high",
    );
  }

  if ((signal.metric === "steps" || signal.metric === "activity_minutes") && (signal.direction === "declining" || signal.habitDrift)) {
    return createRecommendation(
      "v2-trend-intelligence-activity",
      "fitness",
      "Use a short gentle movement block to rebuild momentum.",
      signal.interpretation,
      "high",
    );
  }

  if (signal.metric === "heart_rate_avg" && signal.abnormalChange) {
    return createRecommendation(
      "v2-trend-intelligence-recovery",
      "fitness",
      "Keep today's activity recovery-focused and watch for unusual symptoms.",
      signal.interpretation,
      "medium",
    );
  }

  return undefined;
};

const getGoalHabitRecommendation = (
  input: RecommendationInput,
): PersonalizedRecommendation | undefined => {
  const coaching = input.context.goalHabitCoaching;
  const top = coaching?.recommendations[0];

  if (!top) return undefined;

  const intentByDomain: Record<string, AIIntent> = {
    activity: "fitness",
    sleep: "sleep",
    hydration: "hydration",
    nutrition: "nutrition",
    medication_adherence: "medication",
    recovery: "fitness",
    general_wellness: input.intent,
  };

  return createRecommendation(
    `v2-goal-habit-${top.domain}`,
    intentByDomain[top.domain] ?? input.intent,
    top.message,
    `${top.reason} Active coaching progress is ${coaching.progressScore}% with ${coaching.atRiskCount} at-risk habit or goal signals.`,
    top.priority,
  );
};

const getInsightRecommendation = (
  input: RecommendationInput,
): PersonalizedRecommendation | undefined => {
  const topInsight = input.context.aiInsights?.topInsights[0];

  if (!topInsight || topInsight.safetyLevel === "urgent") return undefined;

  const intentByCategory: Record<string, AIIntent> = {
    activity: "fitness",
    sleep: "sleep",
    hydration: "hydration",
    nutrition: "nutrition",
    recovery: "fitness",
    medication: "medication",
    device_data: "device_sync_query",
    general_wellness: input.intent,
  };

  return createRecommendation(
    `v2-ai-insight-${topInsight.category}`,
    intentByCategory[topInsight.category] ?? input.intent,
    topInsight.suggestedAction,
    `Recommended because this was your top ranked insight today: ${topInsight.title}. ${topInsight.explanation}`,
    topInsight.priority,
  );
};

const getBriefingRecommendation = (
  input: RecommendationInput,
): PersonalizedRecommendation | undefined => {
  const briefing = input.context.dailyBriefing;
  const action = briefing?.recommendedActions[0];

  if (!briefing || !action || briefing.safetyLevel === "urgent") return undefined;

  const intentByFocus: Array<[RegExp, AIIntent]> = [
    [/hydration/i, "hydration"],
    [/sleep|recovery/i, "sleep"],
    [/activity|fitness|movement/i, "fitness"],
    [/nutrition/i, "nutrition"],
    [/medication/i, "medication"],
    [/device/i, "device_sync_query"],
  ];
  const intent = intentByFocus.find(([pattern]) => pattern.test(briefing.focusArea ?? ""))?.[1] ?? input.intent;

  return createRecommendation(
    "v2-daily-briefing-focus",
    intent,
    action,
    `Recommended because today's briefing focus is ${briefing.focusArea ?? "general wellness"}. ${briefing.summary}`,
    briefing.safetyLevel === "caution" ? "high" : briefing.confidence === "low" ? "medium" : "high",
  );
};

const getPreventiveRecommendation = (
  input: RecommendationInput,
): PersonalizedRecommendation | undefined => {
  const risk = input.context.preventiveSummary?.primaryRisk;

  if (!risk || risk.confidence === "low") return undefined;

  const intentByRisk: Record<string, AIIntent> = {
    sleep: "sleep",
    activity: "fitness",
    hydration: "hydration",
    recovery: "fitness",
    habit: input.intent,
    device_quality: "device_sync_query",
    general: "general_wellness",
  };

  return createRecommendation(
    `v2-preventive-${risk.category}`,
    intentByRisk[risk.category] ?? input.intent,
    risk.suggestedAction,
    `Recommended because preventive wellness risk is ${input.context.preventiveSummary.overallRisk}: ${risk.title}. ${risk.explanation}`,
    risk.severity === "high" ? "high" : risk.severity === "medium" ? "medium" : "low",
  );
};

const dedupeRecommendations = (recommendations: PersonalizedRecommendation[]): PersonalizedRecommendation[] => {
  const seen = new Set<string>();

  return recommendations.filter((recommendation) => {
    const key = recommendation.message.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);

    return true;
  });
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

  const recommendations = [
    getPreventiveRecommendation(input),
    getBriefingRecommendation(input),
    getInsightRecommendation(input),
    getGoalHabitRecommendation(input),
    getTrendIntelligenceRecommendation(input),
    trendRecommendation,
    memoryRecommendation,
    profileRecommendation,
    ...baseline,
  ].filter((recommendation): recommendation is PersonalizedRecommendation => Boolean(recommendation));

  return dedupeRecommendations(recommendations).slice(0, 5).map((recommendation) => ({
    ...recommendation,
    reason: explainRecommendation(recommendation, input.context),
  }));
}
