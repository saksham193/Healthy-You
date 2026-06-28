import type {
  AIContext,
  DailyInsight,
  HealthTrend,
  PersonalHealthProfile,
  PersonalizedRecommendation,
} from "../../../types";
import { generateTrendInsights } from "../trends/TrendInsightGenerator";
import { markDailyInsightsGenerated } from "./InsightScheduler";

type DailyInsightInput = {
  context: Pick<
    AIContext,
    "healthScore" | "nutritionScore" | "fitnessScore" | "sleepScore" | "adherenceScore" | "hydrationGlasses" | "hydrationGoal"
  >;
  profile: PersonalHealthProfile;
  trends: HealthTrend[];
  recommendations: PersonalizedRecommendation[];
};

const createInsight = (
  type: DailyInsight["type"],
  title: string,
  message: string,
  priority: DailyInsight["priority"],
): DailyInsight => ({
  id: `${type}-${Date.now()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  type,
  title,
  message,
  priority,
  createdAt: new Date().toISOString(),
});

const getLowestArea = (context: DailyInsightInput["context"]): string => {
  const scores = [
    { label: "nutrition", value: context.nutritionScore },
    { label: "fitness", value: context.fitnessScore },
    { label: "sleep", value: context.sleepScore },
    { label: "medication adherence", value: context.adherenceScore },
  ].sort((left, right) => left.value - right.value);

  return scores[0]?.label ?? "overall wellbeing";
};

export function generateDailyInsights(input: DailyInsightInput): DailyInsight[] {
  const hydrationLow = input.context.hydrationGlasses < input.context.hydrationGoal;
  const riskTrend = input.trends.find((trend) => trend.riskIndicators.length > 0);
  const trendInsight = generateTrendInsights(input.trends).find((insight) => insight.severity === "attention");
  const topRecommendation = input.recommendations.find((recommendation) => recommendation.priority === "high")
    ?? input.recommendations[0];
  const insights: DailyInsight[] = [
    createInsight(
      "morning_summary",
      "Daily health summary",
      `Health score is ${input.context.healthScore}; focus first on ${getLowestArea(input.context)} today.`,
      "medium",
    ),
  ];

  if (input.context.healthScore >= 80) {
    insights.push(
      createInsight(
        "health_win",
        "Health momentum",
        "Your current health score is in a strong range. Keep the routine consistent before adding harder goals.",
        "low",
      ),
    );
  }

  if (hydrationLow) {
    insights.push(
      createInsight(
        "risk_alert",
        "Hydration gap",
        `Hydration is ${input.context.hydrationGlasses}/${input.context.hydrationGoal} glasses, so plan water with meals and activity.`,
        "high",
      ),
    );
  } else if (riskTrend) {
    insights.push(
      createInsight(
        "risk_alert",
        "Trend to watch",
        trendInsight?.message ?? riskTrend.riskIndicators[0] ?? `${riskTrend.metric} needs attention.`,
        "high",
      ),
    );
  }

  if (topRecommendation) {
    insights.push(
      createInsight(
        "personalized_suggestion",
        "Suggested next action",
        `${topRecommendation.message} Reason: ${topRecommendation.reason}`,
        topRecommendation.priority,
      ),
    );
  }

  if (input.profile.goals.length > 0) {
    insights.push(
      createInsight(
        "goal_progress",
        "Goal progress",
        `Active goal: ${input.profile.goals[0]}. Use today's lowest score to choose one small supporting action.`,
        "medium",
      ),
    );
  }

  markDailyInsightsGenerated();

  return insights.slice(0, 5);
}
