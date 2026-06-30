import type {
  AIContext,
  AIHealthInsightCategory,
  AIInsightSummary,
  DailyHealthBriefing,
  GoalHabitCoachingSummary,
  HealthSummaryBackup,
  MemoryRecord,
  PreventiveHealthSummary,
  TrendIntelligenceSummary,
  UserIntelligenceProfile,
} from "../../types";
import type { PredictionSummary } from "../prediction/PredictionTypes";

type BriefingContext = Pick<
  AIContext,
  | "healthScore"
  | "nutritionScore"
  | "fitnessScore"
  | "sleepScore"
  | "adherenceScore"
  | "hydrationGlasses"
  | "hydrationGoal"
  | "steps"
  | "stepGoal"
  | "weeklyActivityMinutes"
  | "activeMinutes"
  | "sleepMinutes"
  | "heartRateBpm"
  | "deviceDataSource"
  | "deviceDataStatus"
  | "lastDeviceSyncAt"
  | "profile"
>;

type BriefingInput = {
  summaries: HealthSummaryBackup[];
  context: BriefingContext;
  trendIntelligence: TrendIntelligenceSummary;
  goalHabitCoaching: GoalHabitCoachingSummary;
  aiInsights: AIInsightSummary;
  predictions: PredictionSummary;
  intelligenceProfile: UserIntelligenceProfile;
  preventiveSummary?: PreventiveHealthSummary;
  memories?: MemoryRecord[];
  now?: Date;
};

const categoryLabel: Record<AIHealthInsightCategory, string> = {
  activity: "activity",
  sleep: "sleep",
  hydration: "hydration",
  nutrition: "nutrition",
  recovery: "recovery",
  medication: "medication consistency",
  device_data: "device data",
  general_wellness: "general wellness",
};

const confidenceRank = (value: "low" | "medium" | "high"): number =>
  value === "high" ? 3 : value === "medium" ? 2 : 1;

const unique = (items: string[]): string[] => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);

    return true;
  });
};

const sourceNote = (input: BriefingInput): string => {
  const summaries = input.summaries;
  const cloudOnly = summaries.length > 0 && summaries.every((summary) => summary.deviceSource === "cloud_summary");

  if (input.context.deviceDataSource === "no_data") {
    return "Health Connect is connected, but I don't have recent records yet.";
  }

  if (cloudOnly) {
    return "This briefing uses your latest cloud summary, not live device data.";
  }

  if (input.context.deviceDataSource === "demo" || input.context.deviceDataSource === "fallback") {
    return "This briefing may be based on demo data until live sync is available.";
  }

  if (input.context.deviceDataSource === "cache") {
    return "This briefing uses cached device data, so recent changes may not be included.";
  }

  if (input.context.deviceDataSource === "live") {
    return "This briefing uses your current local health context and live device sync when available.";
  }

  return "This briefing uses the latest local Healthy You context available.";
};

const greetingFor = (
  style: UserIntelligenceProfile["preferredCoachingStyle"],
  date: string,
): string => {
  if (style === "minimal") return "Today's briefing.";
  if (style === "motivational") return "Good morning - you're building momentum.";
  if (style === "scientific") return "Today's briefing is based on your strongest local signals.";
  if (style === "professional") return `Daily briefing for ${date}.`;

  return "Good morning - here is your Healthy You briefing.";
};

const summaryForStyle = (
  style: UserIntelligenceProfile["preferredCoachingStyle"],
  focus: string,
  reason: string,
): string => {
  if (style === "minimal") return `Today's focus: ${focus}. ${reason}`;
  if (style === "motivational") return `Today's best win is ${focus}: ${reason}`;
  if (style === "scientific") return `Focus area: ${focus}. The strongest signal is that ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`;
  if (style === "professional") return `Focus: ${focus}. Rationale: ${reason}`;

  return `A helpful focus today is ${focus}. ${reason}`;
};

const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

const trimToWords = (text: string, maxWords: number): string => {
  const words = text.trim().split(/\s+/).filter(Boolean);

  return words.length <= maxWords ? text : `${words.slice(0, maxWords).join(" ")}.`;
};

export class DailyHealthBriefingEngine {
  generate(input: BriefingInput): DailyHealthBriefing {
    const now = input.now ?? new Date();
    const generatedAt = now.toISOString();
    const date = generatedAt.slice(0, 10);
    const topInsight = input.aiInsights.topInsights[0];
    const urgentInsight = input.aiInsights.topInsights.find((insight) => insight.safetyLevel === "urgent");
    const recoveryInsight = input.aiInsights.topInsights.find((insight) => insight.category === "recovery" && insight.priority === "high");
    const recoveryRecommendation = input.goalHabitCoaching.recommendations.find((item) =>
      item.domain === "recovery" && item.priority === "high",
    );
    const recoveryStrain = Boolean(recoveryInsight || recoveryRecommendation) ||
      (input.context.weeklyActivityMinutes >= 240 && input.context.sleepScore > 0 && input.context.sleepScore < 75);
    const hydrationGap = input.context.hydrationGoal > 0 &&
      input.context.hydrationGlasses / input.context.hydrationGoal < 0.6;
    const activityGap = (input.context.stepGoal > 0 &&
      input.context.steps / input.context.stepGoal < 0.5) ||
      (typeof input.context.activeMinutes === "number" && input.context.activeMinutes < 15) ||
      (input.context.weeklyActivityMinutes > 0 && input.context.weeklyActivityMinutes < 105);
    const atRiskGoal = input.goalHabitCoaching.goals.find((goal) => goal.status === "at_risk");
    const slippingHabit = input.goalHabitCoaching.habits.find((habit) => habit.status === "slipping");
    const topTrend = input.trendIntelligence.topTrends.find((trend) => trend.direction !== "insufficient_data");
    const topPrediction = input.predictions.topPredictions[0];
    const preventiveRisk = input.preventiveSummary?.primaryRisk &&
      input.preventiveSummary.confidence !== "low" &&
      input.preventiveSummary.primaryRisk.confidence !== "low"
      ? input.preventiveSummary.primaryRisk
      : undefined;
    const source = sourceNote(input);
    const focusCategory = urgentInsight?.category ??
      (preventiveRisk?.category === "device_quality" ? "device_data" : preventiveRisk?.category === "habit" ? "general_wellness" : preventiveRisk?.category) ??
      (recoveryStrain ? "recovery" : undefined) ??
      (hydrationGap ? "hydration" : undefined) ??
      (activityGap ? "activity" : undefined) ??
      topInsight?.category ??
      atRiskGoal?.domain ??
      slippingHabit?.domain ??
      (topTrend?.metric === "hydration_ml" ? "hydration" :
        topTrend?.metric === "sleep_minutes" ? "sleep" :
          topTrend?.metric === "steps" || topTrend?.metric === "activity_minutes" ? "activity" :
            topPrediction?.category === "device_data" ? "device_data" :
              topPrediction?.category ?? "general_wellness");
    const focusArea = categoryLabel[focusCategory as AIHealthInsightCategory] ?? "general wellness";
    const reason = urgentInsight
      ? "This may need urgent medical attention, so safety comes first."
      : preventiveRisk
        ? `${preventiveRisk.title.toLowerCase()} is the top preventive wellness signal.`
      : recoveryStrain
        ? "Sleep and activity signals point to a recovery-first wellness day."
        : hydrationGap
          ? "Hydration is below today's target, so an easy refill routine is the clearest next step."
          : activityGap
            ? "Movement is below today's target, so a small activity block is the clearest next step."
      : topInsight
        ? `${topInsight.title.toLowerCase()} is your top ranked insight.`
        : atRiskGoal
          ? `${atRiskGoal.title.toLowerCase()} is at risk.`
          : slippingHabit
            ? `${slippingHabit.title.toLowerCase()} is slipping.`
            : topTrend
              ? `${topTrend.label.toLowerCase()} is ${topTrend.direction.replace(/_/g, " ")}.`
              : topPrediction
                ? `${topPrediction.category.replace(/_/g, " ")} has a ${topPrediction.riskLevel} wellness risk signal.`
                : "Your signals look steady, so one small action is enough.";
    const actions = unique([
      urgentInsight?.suggestedAction,
      recoveryInsight?.suggestedAction,
      recoveryRecommendation?.message,
      preventiveRisk?.suggestedAction,
      topInsight?.suggestedAction,
      input.goalHabitCoaching.suggestedNextAction,
      input.goalHabitCoaching.recommendations[0]?.message,
      topPrediction?.preventiveActions[0]?.message,
      "Reconnect or refresh Health Connect if data looks stale.",
    ].filter((item): item is string => Boolean(item))).slice(0, 3);
    const goalStatus = atRiskGoal
      ? `${atRiskGoal.title}: ${atRiskGoal.progressPercent}% complete and at risk.`
      : input.goalHabitCoaching.goals[0]
        ? `${input.goalHabitCoaching.goals[0].title}: ${input.goalHabitCoaching.goals[0].progressPercent}% complete.`
        : undefined;
    const habitStatus = slippingHabit
      ? `${slippingHabit.title} is slipping with ${slippingHabit.completionRate}% weekly completion.`
      : input.goalHabitCoaching.habits[0]
        ? `${input.goalHabitCoaching.habits[0].title}: ${input.goalHabitCoaching.habits[0].completionRate}% weekly completion.`
        : undefined;
    const trendHighlight = topTrend
      ? `${topTrend.label} is ${topTrend.direction.replace(/_/g, " ")} with ${topTrend.confidence} confidence.`
      : undefined;
    const safetyLevel = urgentInsight ? "urgent" : topInsight?.safetyLevel === "caution" ? "caution" : "normal";
    const confidence = this.confidence(input);
    const greeting = greetingFor(input.intelligenceProfile.preferredCoachingStyle, date);
    const baseSummary = summaryForStyle(input.intelligenceProfile.preferredCoachingStyle, focusArea, reason);
    const actionText = actions.length > 0 ? `Next actions: ${actions.join(" ")}` : "";
    const qualityText = `Data note: ${source}`;
    const confidenceText = `Confidence: ${confidence}.`;
    const summary = trimToWords([
      baseSummary,
      preventiveRisk ? `Preventive wellness: ${preventiveRisk.summary}` : "",
      topInsight ? `Top insight: ${topInsight.summary}` : "",
      goalStatus ? `Goal: ${goalStatus}` : "",
      habitStatus ? `Habit: ${habitStatus}` : "",
      trendHighlight ? `Trend: ${trendHighlight}` : "",
      actionText,
      qualityText,
      confidenceText,
    ].filter(Boolean).join(" "), 180);

    return {
      id: `daily-briefing-${date}`,
      date,
      title: safetyLevel === "urgent" ? "Safety-first health briefing" : "Daily health briefing",
      greeting,
      summary: wordCount(summary) < 80 && input.intelligenceProfile.preferredCoachingStyle !== "minimal"
        ? `${summary} This is wellness guidance only and should be adjusted to how you feel today.`
        : summary,
      topInsight: topInsight?.title,
      focusArea,
      goalStatus,
      habitStatus,
      trendHighlight,
      recommendedActions: actions,
      dataSourceNote: source,
      confidence,
      safetyLevel,
      generatedAt,
    };
  }

  private confidence(input: BriefingInput): DailyHealthBriefing["confidence"] {
    const signals = [
      input.aiInsights.confidence,
      input.goalHabitCoaching.confidence,
      input.trendIntelligence.confidence,
    ];
    const predictionConfidence = input.predictions.topPredictions[0]?.confidence;
    if (predictionConfidence) signals.push(predictionConfidence);

    if (input.trendIntelligence.dataQuality === "insufficient" || input.context.deviceDataSource === "no_data") {
      return "low";
    }

    const average = signals.reduce((sum, value) => sum + confidenceRank(value), 0) / Math.max(signals.length, 1);

    if (average >= 2.6) return "high";
    if (average >= 1.8) return "medium";

    return "low";
  }
}

export const dailyHealthBriefingEngine = new DailyHealthBriefingEngine();
