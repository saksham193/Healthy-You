import type {
  AIContext,
  AIHealthInsight,
  AIHealthInsightCategory,
  AIInsightSummary,
  GoalHabitCoachingSummary,
  HealthSummaryBackup,
  MemoryRecord,
  TrendIntelligenceItem,
  TrendIntelligenceSummary,
  UserIntelligenceProfile,
} from "../../types";
import type { PredictionSummary } from "../prediction/PredictionTypes";

type InsightContext = Pick<
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

type InsightInput = {
  summaries: HealthSummaryBackup[];
  context: InsightContext;
  trendIntelligence: TrendIntelligenceSummary;
  goalHabitCoaching: GoalHabitCoachingSummary;
  predictions: PredictionSummary;
  intelligenceProfile: UserIntelligenceProfile;
  memories?: MemoryRecord[];
  now?: Date;
};

type Candidate = AIHealthInsight & {
  rankScore: number;
};

const priorityScore: Record<AIHealthInsight["priority"], number> = {
  high: 30,
  medium: 18,
  low: 8,
};

const confidenceScore: Record<AIHealthInsight["confidence"], number> = {
  high: 16,
  medium: 10,
  low: 3,
};

const dataQualityScore: Record<TrendIntelligenceSummary["dataQuality"], number> = {
  fresh: 10,
  stale: 4,
  limited: 2,
  insufficient: -8,
};

const sourceFromContext = (
  context: InsightContext,
  summaries: HealthSummaryBackup[],
): AIHealthInsight["source"] => {
  if (context.deviceDataSource === "live") return "live";
  if (context.deviceDataSource === "cache" || context.deviceDataSource === "fallback" || context.deviceDataSource === "no_data") {
    return "cached";
  }
  if (context.deviceDataSource === "demo") return "demo";

  const sources = new Set(summaries.map((summary) => summary.deviceSource));
  if (sources.has("cloud_summary")) return sources.size > 1 ? "mixed" : "cloud_summary";
  if (sources.size > 1) return "mixed";

  return "local_summary";
};

const trendFor = (
  trendIntelligence: TrendIntelligenceSummary,
  category: AIHealthInsightCategory,
): TrendIntelligenceItem | undefined => {
  if (category === "activity") {
    return trendIntelligence.metrics.find((item) => item.metric === "steps") ??
      trendIntelligence.metrics.find((item) => item.metric === "activity_minutes");
  }
  if (category === "sleep") return trendIntelligence.metrics.find((item) => item.metric === "sleep_minutes");
  if (category === "hydration") return trendIntelligence.metrics.find((item) => item.metric === "hydration_ml");
  if (category === "recovery") {
    return trendIntelligence.metrics.find((item) => item.metric === "heart_rate_avg") ??
      trendIntelligence.metrics.find((item) => item.metric === "sleep_minutes");
  }
  if (category === "nutrition") return trendIntelligence.metrics.find((item) => item.metric === "calories_burned");

  return trendIntelligence.metrics.find((item) => item.metric === "health_score");
};

const compactDate = (date: Date): string => date.toISOString();

const styleLine = (
  style: UserIntelligenceProfile["preferredCoachingStyle"],
  summary: string,
): string => {
  if (style === "minimal") return summary;
  if (style === "motivational") return `Small win focus: ${summary}`;
  if (style === "scientific") return `Signal-based insight: ${summary}`;
  if (style === "professional") return `Focus: ${summary}`;

  return `A helpful focus today: ${summary}`;
};

const confidenceReason = (confidence: AIHealthInsight["confidence"], signals: string[], dataPoints: number): string => {
  if (confidence === "low") return `Confidence is low because only ${dataPoints} recent summaries or limited signals are available.`;
  if (confidence === "high") return `Confidence is high because multiple recent signals agree: ${signals.slice(0, 2).join("; ")}.`;

  return `Confidence is medium based on ${dataPoints} recent summaries and the strongest available local signals.`;
};

const insight = (
  base: Omit<AIHealthInsight, "createdAt">,
  rankScore: number,
  createdAt: string,
): Candidate => ({
  ...base,
  createdAt,
  rankScore,
});

const mapPredictionCategory = (category: string): AIHealthInsightCategory =>
  category === "medication" ? "medication" :
    category === "device_data" ? "device_data" :
      category === "activity" || category === "sleep" || category === "hydration" || category === "nutrition" || category === "recovery"
        ? category
        : "general_wellness";

const predictionSeverityScore = (summary: PredictionSummary, category: AIHealthInsightCategory): number => {
  const prediction = summary.topPredictions.find((item) => mapPredictionCategory(item.category) === category);
  if (!prediction) return 0;
  if (prediction.riskLevel === "high") return 28;
  if (prediction.riskLevel === "elevated") return 22;
  if (prediction.riskLevel === "moderate") return 14;

  return 4;
};

const priorityFromRisk = (risk: number): AIHealthInsight["priority"] => {
  if (risk >= 60) return "high";
  if (risk >= 34) return "medium";

  return "low";
};

const confidenceFromSignals = (
  trend: TrendIntelligenceItem | undefined,
  coachingConfidence: GoalHabitCoachingSummary["confidence"],
  dataPoints: number,
): AIHealthInsight["confidence"] => {
  if (dataPoints < 3 || trend?.dataQuality === "insufficient") return "low";
  if (trend?.confidence === "high" || coachingConfidence === "high") return "high";
  if (trend?.confidence === "medium" || coachingConfidence === "medium" || dataPoints >= 5) return "medium";

  return "low";
};

const dedupeInsights = (items: Candidate[]): Candidate[] => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.category}:${item.suggestedAction}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);

    return true;
  });
};

export class AIInsightEngine {
  generate(input: InsightInput): AIInsightSummary {
    const now = input.now ?? new Date();
    const createdAt = compactDate(now);
    const recentSummaries = input.summaries
      .filter((summary) => summary.summaryType === "daily")
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-7);
    const source = sourceFromContext(input.context, input.summaries);
    const candidates: Candidate[] = [];

    candidates.push(...this.urgentCandidates(input, createdAt, source));
    candidates.push(...this.deviceCandidates(input, recentSummaries.length, createdAt, source));
    candidates.push(...this.recoveryCandidates(input, recentSummaries.length, createdAt, source));
    candidates.push(...this.hydrationCandidates(input, recentSummaries.length, createdAt, source));
    candidates.push(...this.activityCandidates(input, recentSummaries.length, createdAt, source));
    candidates.push(...this.sleepCandidates(input, recentSummaries.length, createdAt, source));
    candidates.push(...this.medicationCandidates(input, recentSummaries.length, createdAt, source));
    candidates.push(...this.nutritionCandidates(input, recentSummaries.length, createdAt, source));

    if (candidates.length === 0) {
      candidates.push(this.generalCandidate(input, recentSummaries.length, createdAt, source));
    }

    const ranked = dedupeInsights(candidates)
      .sort((left, right) => right.rankScore - left.rankScore)
      .slice(0, 8);
    const topInsights = ranked.slice(0, 3);

    return {
      generatedAt: createdAt,
      source: source === "cached" ? "offline_cache" : source === "mixed" ? "mixed" : "local",
      topInsights,
      allInsights: ranked,
      compactSummary: topInsights.map((item) =>
        `${item.title}: ${item.supportingSignals.slice(0, 2).join(" + ") || item.summary}, confidence ${item.confidence}.`,
      ),
      confidence: this.summaryConfidence(topInsights),
      dataQuality: input.trendIntelligence.dataQuality,
    };
  }

  private urgentCandidates(input: InsightInput, createdAt: string, source: AIHealthInsight["source"]): Candidate[] {
    const heartRate = input.context.heartRateBpm;
    if (!heartRate || heartRate < 130) return [];

    return [insight({
      id: "ai-insight-urgent-heart-rate",
      category: "recovery",
      title: "Urgent signal to check",
      summary: "This may need urgent medical attention.",
      priority: "high",
      confidence: "medium",
      source,
      supportingSignals: [`Heart rate reading is ${heartRate} bpm`, "Local safety ranking puts urgent signals first"],
      explanation: "A very elevated heart-rate reading can be important when it is unexpected or paired with symptoms.",
      suggestedAction: "Please contact local emergency services or seek urgent care if this reading is unexpected, persistent, or you feel unwell.",
      safetyLevel: "urgent",
    }, 180, createdAt)];
  }

  private deviceCandidates(
    input: InsightInput,
    dataPoints: number,
    createdAt: string,
    source: AIHealthInsight["source"],
  ): Candidate[] {
    if (input.context.deviceDataSource !== "no_data" && input.context.deviceDataSource !== "unavailable") return [];

    const confidence: AIHealthInsight["confidence"] = dataPoints >= 3 ? "medium" : "low";
    const signals = [
      `Device source is ${input.context.deviceDataSource}`,
      `Device status is ${input.context.deviceDataStatus}`,
    ];

    return [insight({
      id: "ai-insight-device-data",
      category: "device_data",
      title: "Device data needs a refresh",
      summary: styleLine(input.intelligenceProfile.preferredCoachingStyle, "insights are limited until device data refreshes."),
      priority: "medium",
      confidence,
      source,
      supportingSignals: signals,
      explanation: `Why this matters: recent device data improves trend and coaching accuracy. ${confidenceReason(confidence, signals, dataPoints)}`,
      suggestedAction: "Reconnect Health Connect or refresh device permissions when available.",
      safetyLevel: "normal",
    }, 58 + confidenceScore[confidence], createdAt)];
  }

  private recoveryCandidates(
    input: InsightInput,
    dataPoints: number,
    createdAt: string,
    source: AIHealthInsight["source"],
  ): Candidate[] {
    const recoveryGoal = input.goalHabitCoaching.goals.find((goal) => goal.domain === "recovery" || goal.domain === "sleep");
    const recoveryRec = input.goalHabitCoaching.recommendations.find((item) => item.domain === "recovery");
    const sleepTrend = trendFor(input.trendIntelligence, "sleep");
    const predictionRisk = predictionSeverityScore(input.predictions, "recovery");
    const highActivityLowSleep = input.context.weeklyActivityMinutes >= 240 && input.context.sleepScore > 0 && input.context.sleepScore < 75;

    if (!recoveryRec && !highActivityLowSleep && predictionRisk === 0) return [];

    const signals = [
      sleepTrend && sleepTrend.direction !== "insufficient_data" ? `Sleep trend is ${sleepTrend.direction}` : "",
      highActivityLowSleep ? `Weekly activity is ${input.context.weeklyActivityMinutes} minutes with sleep score ${input.context.sleepScore}` : "",
      recoveryRec ? recoveryRec.reason : "",
      predictionRisk > 0 ? "Predictive wellness signals include recovery" : "",
    ].filter(Boolean);
    const confidence = confidenceFromSignals(sleepTrend, input.goalHabitCoaching.confidence, dataPoints);
    const suggestedAction = recoveryRec?.message ?? "Keep movement light today and protect your bedtime routine.";

    return [insight({
      id: "ai-insight-recovery-focus",
      category: "recovery",
      title: "Recovery focus today",
      summary: styleLine(input.intelligenceProfile.preferredCoachingStyle, "sleep and activity signals point to a recovery-first day."),
      priority: highActivityLowSleep || recoveryRec?.priority === "high" ? "high" : "medium",
      confidence,
      source,
      supportingSignals: signals,
      explanation: `Why this matters: lower sleep alongside moderate or high activity can affect energy. ${confidenceReason(confidence, signals, dataPoints)}`,
      suggestedAction,
      safetyLevel: "normal",
    }, this.rankBase("recovery", input, confidence) + predictionRisk + 14, createdAt)];
  }

  private hydrationCandidates(
    input: InsightInput,
    dataPoints: number,
    createdAt: string,
    source: AIHealthInsight["source"],
  ): Candidate[] {
    const hydrationTrend = trendFor(input.trendIntelligence, "hydration");
    const hydrationHabit = input.goalHabitCoaching.habits.find((item) => item.domain === "hydration");
    const hydrationRec = input.goalHabitCoaching.recommendations.find((item) => item.domain === "hydration");
    const hydrationPercent = input.context.hydrationGoal > 0 ? input.context.hydrationGlasses / input.context.hydrationGoal : 0;
    const predictionRisk = predictionSeverityScore(input.predictions, "hydration");

    if (!hydrationRec && hydrationPercent >= 0.85 && predictionRisk === 0) return [];

    const signals = [
      hydrationHabit ? `Hydration habit is ${hydrationHabit.status}` : "",
      hydrationTrend && hydrationTrend.direction !== "insufficient_data" ? `Hydration trend is ${hydrationTrend.direction}` : "",
      input.context.hydrationGoal > 0 ? `Hydration is ${input.context.hydrationGlasses}/${input.context.hydrationGoal} glasses` : "",
      predictionRisk > 0 ? "Predictive wellness signals include hydration" : "",
    ].filter(Boolean);
    const confidence = confidenceFromSignals(hydrationTrend, input.goalHabitCoaching.confidence, dataPoints);
    const suggestedAction = hydrationRec?.message ?? "Drink one normal glass of water before your next meal if appropriate for you.";

    return [insight({
      id: "ai-insight-hydration-consistency",
      category: "hydration",
      title: "Hydration consistency",
      summary: styleLine(input.intelligenceProfile.preferredCoachingStyle, "your hydration habit is the easiest consistency win right now."),
      priority: hydrationPercent < 0.6 || hydrationRec?.priority === "high" ? "high" : "medium",
      confidence,
      source,
      supportingSignals: signals,
      explanation: `Why this matters: hydration is a repeatable daily habit and it is currently below the saved goal. ${confidenceReason(confidence, signals, dataPoints)}`,
      suggestedAction,
      safetyLevel: "normal",
    }, this.rankBase("hydration", input, confidence) + predictionRisk + 10, createdAt)];
  }

  private activityCandidates(
    input: InsightInput,
    dataPoints: number,
    createdAt: string,
    source: AIHealthInsight["source"],
  ): Candidate[] {
    const activityTrend = trendFor(input.trendIntelligence, "activity");
    const activityRec = input.goalHabitCoaching.recommendations.find((item) => item.domain === "activity");
    const predictionRisk = predictionSeverityScore(input.predictions, "activity");
    const stepPercent = input.context.stepGoal > 0 ? input.context.steps / input.context.stepGoal : 0;

    if (!activityRec && activityTrend?.direction !== "declining" && stepPercent >= 0.75 && predictionRisk === 0) return [];

    const signals = [
      activityTrend && activityTrend.direction !== "insufficient_data" ? `Activity trend is ${activityTrend.direction}` : "",
      input.context.stepGoal > 0 ? `Steps are ${input.context.steps}/${input.context.stepGoal}` : "",
      activityRec ? activityRec.reason : "",
      predictionRisk > 0 ? "Predictive wellness signals include activity" : "",
    ].filter(Boolean);
    const confidence = confidenceFromSignals(activityTrend, input.goalHabitCoaching.confidence, dataPoints);
    const suggestedAction = activityRec?.message ?? "Take a 10-minute easy walk if you feel well.";

    return [insight({
      id: "ai-insight-activity-drift",
      category: "activity",
      title: "Activity drift to watch",
      summary: styleLine(input.intelligenceProfile.preferredCoachingStyle, "steps are below your recent pattern, so keep the goal small."),
      priority: activityTrend?.habitDrift || stepPercent < 0.5 ? "high" : "medium",
      confidence,
      source,
      supportingSignals: signals,
      explanation: `Why this matters: a small movement goal is easier to rebuild than trying to recover the full gap at once. ${confidenceReason(confidence, signals, dataPoints)}`,
      suggestedAction,
      safetyLevel: "normal",
    }, this.rankBase("activity", input, confidence) + predictionRisk + 8, createdAt)];
  }

  private sleepCandidates(
    input: InsightInput,
    dataPoints: number,
    createdAt: string,
    source: AIHealthInsight["source"],
  ): Candidate[] {
    const sleepTrend = trendFor(input.trendIntelligence, "sleep");
    const sleepRec = input.goalHabitCoaching.recommendations.find((item) => item.domain === "sleep");
    const predictionRisk = predictionSeverityScore(input.predictions, "sleep");

    if (!sleepRec && input.context.sleepScore >= 75 && predictionRisk === 0) return [];

    const signals = [
      sleepTrend && sleepTrend.direction !== "insufficient_data" ? `Sleep trend is ${sleepTrend.direction}` : "",
      `Sleep score is ${input.context.sleepScore}`,
      sleepRec ? sleepRec.reason : "",
      predictionRisk > 0 ? "Predictive wellness signals include sleep" : "",
    ].filter(Boolean);
    const confidence = confidenceFromSignals(sleepTrend, input.goalHabitCoaching.confidence, dataPoints);

    return [insight({
      id: "ai-insight-sleep-routine",
      category: "sleep",
      title: "Sleep routine leverage",
      summary: styleLine(input.intelligenceProfile.preferredCoachingStyle, "a consistent wind-down is the strongest sleep lever today."),
      priority: input.context.sleepScore < 65 ? "high" : "medium",
      confidence,
      source,
      supportingSignals: signals,
      explanation: `Why this matters: sleep consistency supports next-day energy and recovery. ${confidenceReason(confidence, signals, dataPoints)}`,
      suggestedAction: sleepRec?.message ?? "Protect a consistent wind-down routine tonight.",
      safetyLevel: "normal",
    }, this.rankBase("sleep", input, confidence) + predictionRisk + 6, createdAt)];
  }

  private medicationCandidates(
    input: InsightInput,
    dataPoints: number,
    createdAt: string,
    source: AIHealthInsight["source"],
  ): Candidate[] {
    if (input.context.adherenceScore >= 85) return [];

    const medicationRec = input.goalHabitCoaching.recommendations.find((item) => item.domain === "medication_adherence");
    const signals = [
      `Medication adherence score is ${input.context.adherenceScore}`,
      medicationRec?.reason ?? "Medication insight is limited to adherence reminders",
    ].filter(Boolean);
    const confidence: AIHealthInsight["confidence"] = dataPoints >= 3 ? "medium" : "low";

    return [insight({
      id: "ai-insight-medication-reminder",
      category: "medication",
      title: "Medication reminder consistency",
      summary: styleLine(input.intelligenceProfile.preferredCoachingStyle, "a reminder habit may help your prescribed routine."),
      priority: "high",
      confidence,
      source,
      supportingSignals: signals,
      explanation: `Why this matters: reminders can support consistency with your existing prescribed schedule. ${confidenceReason(confidence, signals, dataPoints)}`,
      suggestedAction: "Set a reminder and follow your clinician's instructions for medication timing.",
      safetyLevel: "caution",
    }, 90 + confidenceScore[confidence], createdAt)];
  }

  private nutritionCandidates(
    input: InsightInput,
    dataPoints: number,
    createdAt: string,
    source: AIHealthInsight["source"],
  ): Candidate[] {
    if (input.context.nutritionScore >= 70) return [];

    const confidence: AIHealthInsight["confidence"] = dataPoints >= 3 ? "medium" : "low";
    const signals = [
      `Nutrition score is ${input.context.nutritionScore}`,
      "Nutrition data is interpreted as a wellness signal only",
    ];

    return [insight({
      id: "ai-insight-nutrition-baseline",
      category: "nutrition",
      title: "Nutrition baseline check",
      summary: styleLine(input.intelligenceProfile.preferredCoachingStyle, "use a simple balanced meal cue today."),
      priority: "medium",
      confidence,
      source,
      supportingSignals: signals,
      explanation: `Why this matters: consistent meals are a low-risk wellness foundation. ${confidenceReason(confidence, signals, dataPoints)}`,
      suggestedAction: "Choose a balanced meal with a protein source, fiber-rich food, and water if suitable for you.",
      safetyLevel: "normal",
    }, 42 + confidenceScore[confidence], createdAt)];
  }

  private generalCandidate(
    input: InsightInput,
    dataPoints: number,
    createdAt: string,
    source: AIHealthInsight["source"],
  ): Candidate {
    const confidence: AIHealthInsight["confidence"] = dataPoints >= 3 ? "medium" : "low";
    const signals = [
      `Health score is ${input.context.healthScore}`,
      input.goalHabitCoaching.suggestedNextAction ? `Coaching action: ${input.goalHabitCoaching.suggestedNextAction}` : "No strong drift signal",
    ].filter(Boolean);

    return insight({
      id: "ai-insight-general-wellness",
      category: "general_wellness",
      title: "Small wellness focus",
      summary: styleLine(input.intelligenceProfile.preferredCoachingStyle, "one small action is enough for today."),
      priority: "low",
      confidence,
      source,
      supportingSignals: signals,
      explanation: `Why this matters: when signals are sparse or steady, the safest guidance is one low-risk action. ${confidenceReason(confidence, signals, dataPoints)}`,
      suggestedAction: input.goalHabitCoaching.suggestedNextAction ?? "Hydrate, take a short walk, or protect bedtime.",
      safetyLevel: "normal",
    }, 20 + confidenceScore[confidence], createdAt);
  }

  private rankBase(
    category: AIHealthInsightCategory,
    input: InsightInput,
    confidence: AIHealthInsight["confidence"],
  ): number {
    const coaching = input.goalHabitCoaching.recommendations.find((item) =>
      item.domain === category ||
      (category === "activity" && item.domain === "recovery") ||
      (category === "medication" && item.domain === "medication_adherence"),
    );
    const trend = trendFor(input.trendIntelligence, category);
    const trendSeverity = trend?.habitDrift || trend?.abnormalChange ? 18 : trend?.direction === "declining" ? 12 : 3;
    const coachingRisk = coaching?.priority === "high" ? 18 : coaching?.priority === "medium" ? 9 : 0;
    const personalization = input.intelligenceProfile.healthGoals.some((goal) => goal.toLowerCase().includes(category.replace("_", " ")))
      ? 7
      : 0;
    const priority = priorityFromRisk(trendSeverity + coachingRisk + predictionSeverityScore(input.predictions, category));

    return priorityScore[priority] +
      confidenceScore[confidence] +
      dataQualityScore[input.trendIntelligence.dataQuality] +
      trendSeverity +
      coachingRisk +
      personalization;
  }

  private summaryConfidence(topInsights: AIHealthInsight[]): AIHealthInsight["confidence"] {
    if (topInsights.some((item) => item.confidence === "high")) return "high";
    if (topInsights.some((item) => item.confidence === "medium")) return "medium";

    return "low";
  }
}

export const aiInsightEngine = new AIInsightEngine();
