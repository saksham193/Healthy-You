import type {
  AIContext,
  CoachingConfidence,
  CoachingGoal,
  CoachingHabit,
  CoachingRecommendation,
  GoalDomain,
  GoalHabitCoachingSummary,
  HealthSummaryBackup,
  MemoryRecord,
  TrendIntelligenceItem,
  TrendIntelligenceSummary,
  UserIntelligenceProfile,
} from "../../types";

type CoachingContext = Pick<
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
  | "deviceDataSource"
  | "lastDeviceSyncAt"
  | "profile"
>;

type CoachingInput = {
  summaries: HealthSummaryBackup[];
  context: CoachingContext;
  trendIntelligence: TrendIntelligenceSummary;
  intelligenceProfile: UserIntelligenceProfile;
  memories?: MemoryRecord[];
  now?: Date;
};

type CompletionMetric = "steps" | "sleepMinutes" | "hydrationMl" | "activeMinutes" | "adherence";

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const asPercent = (current = 0, target = 1): number =>
  target > 0 ? clamp(Math.round((current / target) * 100), 0, 100) : 0;

const hasGoal = (profile: UserIntelligenceProfile, pattern: RegExp): boolean =>
  profile.healthGoals.some((goal) => pattern.test(goal));

const confidenceRank = (confidence: CoachingConfidence): number => {
  if (confidence === "high") return 3;
  if (confidence === "medium") return 2;

  return 1;
};

const confidenceFromData = (points: number, trend?: TrendIntelligenceItem): CoachingConfidence => {
  if (points < 3 || trend?.dataQuality === "insufficient") return "low";
  if (trend?.confidence === "high" && trend.dataQuality === "fresh") return "high";
  if (points >= 5 || trend?.confidence === "medium") return "medium";

  return "low";
};

const difficultyFromRate = (completionRate: number): CoachingGoal["difficulty"] => {
  if (completionRate >= 80) return "moderate";
  if (completionRate >= 45) return "easy";

  return "easy";
};

const dateKey = (date: Date): string => date.toISOString().slice(0, 10);

const latestCompletedAt = (summaries: HealthSummaryBackup[], metric: CompletionMetric, target: number): string | undefined =>
  [...summaries]
    .sort((left, right) => right.date.localeCompare(left.date))
    .find((summary) => completed(summary, metric, target))?.date;

const metricValue = (summary: HealthSummaryBackup, metric: CompletionMetric): number | undefined => {
  if (metric === "steps") return summary.metrics.steps;
  if (metric === "sleepMinutes") return summary.metrics.sleepMinutes;
  if (metric === "hydrationMl") return summary.metrics.hydrationMl;
  if (metric === "activeMinutes") return summary.metrics.activeMinutes;

  return summary.scores.healthScore;
};

const completed = (summary: HealthSummaryBackup, metric: CompletionMetric, target: number): boolean => {
  const value = metricValue(summary, metric);

  return typeof value === "number" && Number.isFinite(value) && value >= target;
};

const completionStats = (
  summaries: HealthSummaryBackup[],
  metric: CompletionMetric,
  target: number,
): { streakDays: number; completionRate: number; dataPoints: number; lastCompletedAt?: string } => {
  const recent = [...summaries]
    .filter((summary) => typeof metricValue(summary, metric) === "number")
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-7);
  const dataPoints = recent.length;
  const completedDays = recent.filter((summary) => completed(summary, metric, target)).length;
  const completionRate = dataPoints > 0 ? Math.round((completedDays / dataPoints) * 100) : 0;
  let streakDays = 0;

  for (const summary of [...recent].reverse()) {
    if (!completed(summary, metric, target)) break;
    streakDays += 1;
  }

  return {
    streakDays,
    completionRate,
    dataPoints,
    lastCompletedAt: latestCompletedAt(recent, metric, target),
  };
};

const trendFor = (summary: TrendIntelligenceSummary, domain: GoalDomain): TrendIntelligenceItem | undefined => {
  if (domain === "activity") {
    return summary.metrics.find((item) => item.metric === "steps") ??
      summary.metrics.find((item) => item.metric === "activity_minutes");
  }
  if (domain === "sleep") return summary.metrics.find((item) => item.metric === "sleep_minutes");
  if (domain === "hydration") return summary.metrics.find((item) => item.metric === "hydration_ml");
  if (domain === "recovery") {
    return summary.metrics.find((item) => item.metric === "heart_rate_avg") ??
      summary.metrics.find((item) => item.metric === "sleep_minutes");
  }
  if (domain === "nutrition") return summary.metrics.find((item) => item.metric === "calories_burned");

  return summary.metrics.find((item) => item.metric === "health_score");
};

const driftFor = (input: CoachingInput, typePattern: RegExp) =>
  input.trendIntelligence.habitDrifts.find((drift) => typePattern.test(drift.type));

const styleMessage = (
  style: UserIntelligenceProfile["preferredCoachingStyle"],
  domain: GoalDomain,
  base: string,
): string => {
  if (style === "minimal") return base;
  if (style === "motivational") return `Small win today: ${base}`;
  if (style === "scientific") return `${base} This matches the strongest local trend signal.`;
  if (style === "professional") return `Focus: ${base}`;
  if (domain === "medication_adherence") return base;

  return `A gentle next step: ${base}`;
};

const safeMedicationText =
  "Set a reminder and follow your clinician's instructions for medication timing.";

const recommendation = (
  id: string,
  domain: GoalDomain,
  message: string,
  reason: string,
  priority: CoachingRecommendation["priority"],
  confidence: CoachingConfidence,
  source: CoachingRecommendation["source"],
): CoachingRecommendation => ({ id, domain, message, reason, priority, confidence, source });

const goal = (
  id: string,
  domain: GoalDomain,
  title: string,
  targetValue: number | undefined,
  unit: string | undefined,
  currentValue: number | undefined,
  progressPercent: number,
  difficulty: CoachingGoal["difficulty"],
  status: CoachingGoal["status"],
  confidence: CoachingConfidence,
  reason: string,
  updatedAt: string,
  baselineValue?: number,
): CoachingGoal => ({
  id,
  domain,
  title,
  targetValue,
  unit,
  cadence: "daily",
  baselineValue,
  currentValue,
  progressPercent,
  difficulty,
  status,
  confidence,
  reason,
  updatedAt,
});

const habit = (
  id: string,
  domain: GoalDomain,
  title: string,
  stats: ReturnType<typeof completionStats>,
  confidence: CoachingConfidence,
  updatedAt: string,
  suggestedNextAction: string,
  cue?: string,
): CoachingHabit => ({
  id,
  domain,
  title,
  streakDays: stats.streakDays,
  completionRate: stats.completionRate,
  lastCompletedAt: stats.lastCompletedAt,
  status: stats.dataPoints < 3
    ? "building"
    : stats.completionRate >= 80
      ? "consistent"
      : stats.completionRate < 45
        ? "slipping"
        : "building",
  confidence,
  cue,
  suggestedNextAction,
  updatedAt,
});

const dedupe = <T extends { id: string; message?: string; title?: string }>(items: T[]): T[] => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = (item.message ?? item.title ?? item.id).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);

    return true;
  });
};

export class GoalHabitCoachingEngine {
  generate(input: CoachingInput): GoalHabitCoachingSummary {
    const now = input.now ?? new Date();
    const updatedAt = now.toISOString();
    const recentSummaries = [...input.summaries]
      .filter((summary) => summary.summaryType === "daily")
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-14);
    const goals: CoachingGoal[] = [];
    const habits: CoachingHabit[] = [];
    const recommendations: CoachingRecommendation[] = [];
    const style = input.intelligenceProfile.preferredCoachingStyle;
    const stepsTrend = trendFor(input.trendIntelligence, "activity");
    const sleepTrend = trendFor(input.trendIntelligence, "sleep");
    const hydrationTrend = trendFor(input.trendIntelligence, "hydration");
    const recoveryTrend = trendFor(input.trendIntelligence, "recovery");
    const activityDrift = driftFor(input, /activity_drop|weekly_activity_drop/);
    const sleepDrift = driftFor(input, /sleep_below_baseline/);
    const hydrationDrift = driftFor(input, /hydration_below_baseline/);
    const recoveryDrift = driftFor(input, /recovery_strain/);
    const stepTarget = clamp(
      Math.round(Math.min(input.context.stepGoal || 4000, Math.max(2000, (stepsTrend?.baselineValue ?? input.context.steps) * 0.75)) / 250) * 250,
      1500,
      9000,
    );
    const sleepTarget = clamp(
      Math.round(Math.min(480, Math.max(390, sleepTrend?.baselineValue ?? input.context.sleepMinutes ?? 420))),
      360,
      510,
    );
    const hydrationTargetMl = clamp(input.context.hydrationGoal > 0 ? input.context.hydrationGoal * 250 : 1800, 1000, 2500);
    const activityStats = completionStats(recentSummaries, "steps", stepTarget);
    const sleepStats = completionStats(recentSummaries, "sleepMinutes", sleepTarget);
    const hydrationStats = completionStats(recentSummaries, "hydrationMl", hydrationTargetMl);
    const activityConfidence = confidenceFromData(activityStats.dataPoints, stepsTrend);
    const sleepConfidence = confidenceFromData(sleepStats.dataPoints, sleepTrend);
    const hydrationConfidence = confidenceFromData(hydrationStats.dataPoints, hydrationTrend);

    if (activityDrift || stepsTrend?.direction === "declining" || hasGoal(input.intelligenceProfile, /energy|fitness|activity|walk|weight/i)) {
      const current = input.context.steps;
      const message = styleMessage(style, "activity", "take a 10-minute easy walk or aim for a small step reset today.");

      goals.push(goal(
        "coaching-goal-activity-reset",
        "activity",
        "Gentle daily movement",
        stepTarget,
        "steps",
        current,
        asPercent(current, stepTarget),
        difficultyFromRate(activityStats.completionRate),
        activityDrift ? "at_risk" : asPercent(current, stepTarget) >= 100 ? "completed" : "active",
        activityConfidence,
        activityDrift?.message ?? stepsTrend?.interpretation ?? "Activity goal is based on your saved goals and current step pattern.",
        updatedAt,
        stepsTrend?.baselineValue,
      ));
      habits.push(habit(
        "coaching-habit-activity",
        "activity",
        "Repeatable movement habit",
        activityStats,
        activityConfidence,
        updatedAt,
        message,
        "After lunch or your usual workout window",
      ));
      recommendations.push(recommendation(
        "coaching-rec-activity-reset",
        "activity",
        message,
        activityDrift?.message ?? "Your activity pattern is below your recent baseline, so a small walking goal is safer than a big jump.",
        activityDrift ? "high" : "medium",
        activityConfidence,
        "trend",
      ));
    }

    if (sleepDrift || sleepTrend?.direction === "declining" || input.context.sleepScore < 75 || hasGoal(input.intelligenceProfile, /sleep|energy|recovery/i)) {
      const current = input.context.sleepMinutes;
      const message = styleMessage(style, "sleep", "protect a consistent wind-down routine tonight.");

      goals.push(goal(
        "coaching-goal-sleep-routine",
        "sleep",
        "Consistent sleep routine",
        sleepTarget,
        "minutes",
        current,
        asPercent(current, sleepTarget),
        difficultyFromRate(sleepStats.completionRate),
        sleepDrift || input.context.sleepScore < 70 ? "at_risk" : asPercent(current, sleepTarget) >= 100 ? "completed" : "active",
        sleepConfidence,
        sleepDrift?.message ?? sleepTrend?.interpretation ?? "Sleep routine goal is based on current sleep and recovery signals.",
        updatedAt,
        sleepTrend?.baselineValue,
      ));
      habits.push(habit(
        "coaching-habit-sleep",
        "sleep",
        "Bedtime routine habit",
        sleepStats,
        sleepConfidence,
        updatedAt,
        message,
        "Start 30 minutes before your usual bedtime",
      ));
      recommendations.push(recommendation(
        "coaching-rec-sleep-routine",
        "sleep",
        message,
        sleepDrift?.message ?? "Sleep is a current recovery gap, so a routine goal is more realistic than adding intensity.",
        sleepDrift ? "high" : "medium",
        sleepConfidence,
        "habit",
      ));
    }

    if (hydrationDrift || hydrationTrend?.direction === "declining" || (input.context.hydrationGoal > 0 && input.context.hydrationGlasses / input.context.hydrationGoal < 0.8)) {
      const current = input.context.hydrationGlasses > 0 ? input.context.hydrationGlasses * 250 : undefined;
      const message = styleMessage(style, "hydration", "drink one normal glass of water before your next meal if appropriate for you.");

      goals.push(goal(
        "coaching-goal-hydration-consistency",
        "hydration",
        "Hydration consistency",
        hydrationTargetMl,
        "ml",
        current,
        asPercent(current, hydrationTargetMl),
        difficultyFromRate(hydrationStats.completionRate),
        hydrationDrift ? "at_risk" : asPercent(current, hydrationTargetMl) >= 100 ? "completed" : "active",
        hydrationConfidence,
        hydrationDrift?.message ?? hydrationTrend?.interpretation ?? "Hydration goal is based on today's hydration and saved trend signals.",
        updatedAt,
        hydrationTrend?.baselineValue,
      ));
      habits.push(habit(
        "coaching-habit-hydration",
        "hydration",
        "Meal-linked hydration habit",
        hydrationStats,
        hydrationConfidence,
        updatedAt,
        message,
        "Before meals",
      ));
      recommendations.push(recommendation(
        "coaching-rec-hydration-nudge",
        "hydration",
        message,
        hydrationDrift?.message ?? "Your hydration habit is below target, so a meal-linked cue is the next realistic step.",
        hydrationDrift ? "high" : "medium",
        hydrationConfidence,
        "habit",
      ));
    }

    if (
      recoveryDrift ||
      (input.context.weeklyActivityMinutes >= 240 && (input.context.sleepScore < 75 || sleepTrend?.direction === "declining"))
    ) {
      const message = styleMessage(style, "recovery", "make today's movement light and prioritize recovery.");

      goals.push(goal(
        "coaching-goal-recovery-balance",
        "recovery",
        "Recovery balance",
        20,
        "easy minutes",
        input.context.activeMinutes,
        asPercent(input.context.activeMinutes, 20),
        "easy",
        "active",
        confidenceFromData(Math.max(activityStats.dataPoints, sleepStats.dataPoints), recoveryTrend),
        recoveryDrift?.message ?? "Activity is high while sleep recovery is lower, so recovery-focused coaching is safer today.",
        updatedAt,
        recoveryTrend?.baselineValue,
      ));
      recommendations.push(recommendation(
        "coaching-rec-recovery-balance",
        "recovery",
        message,
        recoveryDrift?.message ?? "High activity with lower sleep makes recovery a better focus than workout escalation.",
        "high",
        confidenceFromData(Math.max(activityStats.dataPoints, sleepStats.dataPoints), recoveryTrend),
        "trend",
      ));
    }

    if (input.context.adherenceScore > 0 && input.context.adherenceScore < 90) {
      const medConfidence = recentSummaries.length >= 3 ? "medium" : "low";

      goals.push(goal(
        "coaching-goal-medication-reminder",
        "medication_adherence",
        "Medication reminder consistency",
        100,
        "adherence score",
        input.context.adherenceScore,
        asPercent(input.context.adherenceScore, 100),
        "easy",
        input.context.adherenceScore < 80 ? "at_risk" : "active",
        medConfidence,
        "Medication coaching is limited to reminders and following clinician instructions.",
        updatedAt,
      ));
      recommendations.push(recommendation(
        "coaching-rec-medication-reminder",
        "medication_adherence",
        safeMedicationText,
        "Medication adherence is below target; Healthy You can only suggest reminder habits, not dosage changes.",
        "high",
        medConfidence,
        "goal",
      ));
    }

    if (goals.length === 0) {
      const confidence = recentSummaries.length >= 3 ? "medium" : "low";
      goals.push(goal(
        "coaching-goal-general-wellness",
        "general_wellness",
        "One steady wellness action",
        1,
        "action",
        0,
        0,
        "easy",
        "active",
        confidence,
        recentSummaries.length < 3 ? "Not enough recent history yet." : "No strong drift detected, so a small general wellness action is appropriate.",
        updatedAt,
      ));
      recommendations.push(recommendation(
        "coaching-rec-general-wellness",
        "general_wellness",
        styleMessage(style, "general_wellness", "choose one low-risk action: hydrate, walk lightly, or protect bedtime."),
        recentSummaries.length < 3 ? "Not enough recent history yet." : "No strong goal drift is active.",
        "low",
        confidence,
        "profile",
      ));
    }

    const uniqueGoals = dedupe(goals).slice(0, 4);
    const uniqueHabits = dedupe(habits).slice(0, 4);
    const uniqueRecommendations = dedupe(recommendations)
      .sort((left, right) =>
        priorityRank(right.priority) - priorityRank(left.priority) ||
        confidenceRank(right.confidence) - confidenceRank(left.confidence),
      )
      .slice(0, 5);
    const atRiskCount = uniqueGoals.filter((item) => item.status === "at_risk").length +
      uniqueHabits.filter((item) => item.status === "slipping").length;
    const progressScore = uniqueGoals.length > 0
      ? Math.round(uniqueGoals.reduce((sum, item) => sum + item.progressPercent, 0) / uniqueGoals.length)
      : 0;
    const confidence = summaryConfidence(uniqueGoals, uniqueHabits, recentSummaries.length);
    const suggestedNextAction = uniqueRecommendations[0]?.message;
    const compactSummary = [
      uniqueGoals[0]
        ? `Active goal: ${uniqueGoals[0].title}, ${uniqueGoals[0].progressPercent}% complete.`
        : undefined,
      uniqueHabits.find((item) => item.status === "slipping")
        ? `Habit risk: ${uniqueHabits.find((item) => item.status === "slipping")!.title} slipping, confidence ${uniqueHabits.find((item) => item.status === "slipping")!.confidence}.`
        : uniqueHabits[0]
          ? `Habit: ${uniqueHabits[0].title}, ${uniqueHabits[0].completionRate}% weekly completion.`
          : undefined,
      suggestedNextAction ? `Suggested next action: ${suggestedNextAction}` : undefined,
      `Progress score: ${progressScore}%; at-risk habits/goals: ${atRiskCount}.`,
    ].filter((line): line is string => Boolean(line));

    return {
      generatedAt: updatedAt,
      source: input.context.deviceDataSource === "cache" || input.context.deviceDataSource === "fallback"
        ? "offline_cache"
        : "local",
      goals: uniqueGoals,
      habits: uniqueHabits,
      recommendations: uniqueRecommendations,
      compactSummary,
      progressScore,
      atRiskCount,
      confidence,
      dataQuality: input.trendIntelligence.dataQuality,
      suggestedNextAction,
    };
  }
}

const priorityRank = (priority: CoachingRecommendation["priority"]): number => {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;

  return 1;
};

const summaryConfidence = (
  goals: CoachingGoal[],
  habits: CoachingHabit[],
  dataPoints: number,
): CoachingConfidence => {
  if (dataPoints < 3) return "low";
  if ([...goals, ...habits].some((item) => item.confidence === "high")) return "high";
  if ([...goals, ...habits].some((item) => item.confidence === "medium")) return "medium";

  return "low";
};

export const goalHabitCoachingEngine = new GoalHabitCoachingEngine();
