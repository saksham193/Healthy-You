import type {
  AIContext,
  CoachingStyle,
  DailyHealthBriefing,
  GoalHabitCoachingSummary,
  HealthSummaryBackup,
  PreventiveHealthSummary,
  PreventiveRisk,
  PreventiveRiskCategory,
  PreventiveRiskConfidence,
  PreventiveRiskSeverity,
  RecommendationDecision,
  TrendIntelligenceItem,
  TrendIntelligenceSummary,
  UserIntelligenceProfile,
} from "../../types";
import type { PredictionResult, PredictionSummary } from "../prediction/PredictionTypes";

type PreventionContext = Pick<
  AIContext,
  | "sleepScore"
  | "sleepMinutes"
  | "weeklyActivityMinutes"
  | "activeMinutes"
  | "hydrationGlasses"
  | "hydrationGoal"
  | "steps"
  | "stepGoal"
  | "stepPercent"
  | "deviceDataSource"
  | "deviceDataStatus"
  | "lastDeviceSyncAt"
  | "healthScore"
  | "profile"
>;

type PreventiveInput = {
  summaries: HealthSummaryBackup[];
  context: PreventionContext;
  trendIntelligence: TrendIntelligenceSummary;
  goalHabitCoaching: GoalHabitCoachingSummary;
  aiInsights?: AIContext["aiInsights"];
  predictions: PredictionSummary;
  intelligenceProfile: UserIntelligenceProfile;
  dailyBriefing?: DailyHealthBriefing;
  recommendationDecision?: RecommendationDecision;
  now?: Date;
};

type RiskCandidate = PreventiveRisk & {
  score: number;
};

const severityRank: Record<PreventiveRiskSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const confidenceRank: Record<PreventiveRiskConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const categoryFocusLabel: Record<PreventiveRiskCategory | "none", string> = {
  sleep: "Sleep",
  activity: "Activity",
  hydration: "Hydration",
  recovery: "Recovery",
  habit: "Habit consistency",
  device_quality: "Device data quality",
  general: "General wellness",
  none: "General wellness",
};

const riskyDiagnosisPatterns: Array<[RegExp, string]> = [
  [/\byou have diabetes\b/gi, "your glucose-related data needs clinician review"],
  [/\byou have heart disease\b/gi, "your heart-related data needs clinician review"],
  [/\byou are depressed\b/gi, "your mood or energy patterns may deserve support"],
  [/\byou have anxiety\b/gi, "your stress patterns may deserve support"],
  [/\bmedically diagnosed\b/gi, "clinically assessed"],
  [/\bclinically burned out\b/gi, "showing wellness strain signals"],
  [/\byou have dehydration\b/gi, "your hydration trend has declined"],
  [/\byou have burnout\b/gi, "your recovery may deserve more attention"],
  [/\byou have chronic fatigue\b/gi, "your fatigue signals may deserve attention"],
  [/\b(double|increase|reduce|adjust|change|stop)\s+(your\s+)?(medication|medicine|dose|dosage)\b/gi, "follow your clinician's medication instructions"],
];

const normalizeKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const unique = (items: string[]): string[] => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = normalizeKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);

    return true;
  });
};

const sanitize = (text: string): string =>
  riskyDiagnosisPatterns.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);

const trendFor = (
  trendIntelligence: TrendIntelligenceSummary,
  category: PreventiveRiskCategory,
): TrendIntelligenceItem | undefined => {
  if (category === "sleep") return trendIntelligence.metrics.find((item) => item.metric === "sleep_minutes");
  if (category === "hydration") return trendIntelligence.metrics.find((item) => item.metric === "hydration_ml");
  if (category === "activity") {
    return trendIntelligence.metrics.find((item) => item.metric === "steps") ??
      trendIntelligence.metrics.find((item) => item.metric === "activity_minutes");
  }
  if (category === "recovery") {
    return trendIntelligence.metrics.find((item) => item.metric === "heart_rate_avg") ??
      trendIntelligence.metrics.find((item) => item.metric === "sleep_minutes");
  }

  return trendIntelligence.metrics.find((item) => item.metric === "health_score");
};

const predictionFor = (predictions: PredictionSummary, category: PreventiveRiskCategory): PredictionResult | undefined => {
  const predictionCategory = category === "device_quality" ? "device_data" : category;

  return predictions.topPredictions.find((item) => item.category === predictionCategory) ??
    predictions.allPredictions.find((item) => item.category === predictionCategory);
};

const confidenceFrom = (...values: Array<PreventiveRiskConfidence | undefined>): PreventiveRiskConfidence => {
  const present = values.filter((value): value is PreventiveRiskConfidence => Boolean(value));
  if (present.includes("high")) return "high";
  if (present.includes("medium")) return "medium";

  return "low";
};

const severityFromScore = (score: number): PreventiveRiskSeverity => {
  if (score >= 82) return "high";
  if (score >= 52) return "medium";

  return "low";
};

const riskLevelScore = (risk: PredictionResult["riskLevel"] | undefined): number => {
  if (risk === "high") return 30;
  if (risk === "elevated") return 22;
  if (risk === "moderate") return 12;

  return 0;
};

const trendScore = (trend?: TrendIntelligenceItem): number => {
  if (!trend || trend.direction === "insufficient_data") return 0;

  return (trend.direction === "declining" ? 16 : 0) +
    (trend.habitDrift ? 12 : 0) +
    (trend.abnormalChange ? 10 : 0) +
    Math.min(Math.abs(trend.percentageChange), 35) * 0.35;
};

const recentNumericValues = (
  summaries: HealthSummaryBackup[],
  select: (summary: HealthSummaryBackup) => number | undefined,
): number[] =>
  [...summaries]
    .filter((summary) => summary.summaryType === "daily")
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-7)
    .map(select)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

const countBelow = (values: number[], threshold: number): number =>
  values.filter((value) => value < threshold).length;

const bedtimeInconsistencySignal = (summaries: HealthSummaryBackup[]): string | undefined => {
  const values = recentNumericValues(summaries, (summary) => summary.metrics.sleepMinutes);
  if (values.length < 4) return undefined;

  const min = Math.min(...values);
  const max = Math.max(...values);

  return max - min >= 90 ? "Sleep duration varies by more than 90 minutes across recent summaries" : undefined;
};

const daysSince = (now: Date, iso: string | null): number | undefined => {
  if (!iso) return undefined;
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return undefined;

  return (now.getTime() - time) / (24 * 60 * 60 * 1000);
};

const styleSummary = (
  style: CoachingStyle,
  category: PreventiveRiskCategory,
  base: string,
): string => {
  if (style === "minimal") return base;
  if (style === "motivational") return `Small focus: ${base}`;
  if (style === "scientific") return `Pattern signal: ${base}`;
  if (style === "professional") return `Observation: ${base}`;

  if (category === "device_quality") return base;

  return `Recent patterns suggest ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
};

const safeAction = (category: PreventiveRiskCategory, action: string): string => {
  if (category === "habit" && /medication/i.test(action)) {
    return "Use reminders and follow your clinician's medication instructions.";
  }

  return action;
};

export class PreventiveHealthEngine {
  generate(input: PreventiveInput): PreventiveHealthSummary {
    const now = input.now ?? new Date();
    const generatedAt = now.toISOString();
    const risks = [
      this.sleepRisk(input, generatedAt),
      this.recoveryRisk(input, generatedAt),
      this.hydrationRisk(input, generatedAt),
      this.activityRisk(input, generatedAt),
      this.habitRisk(input, generatedAt),
      this.deviceRisk(input, generatedAt, now),
    ].filter((risk): risk is RiskCandidate => Boolean(risk));
    const general = this.generalRisk(input, risks, generatedAt);
    if (general) risks.push(general);

    const ranked = this.dedupe(risks)
      .sort((left, right) => right.score - left.score)
      .map(({ score: _score, ...risk }) => risk)
      .slice(0, 6);
    const primary = ranked[0];
    const overallRisk = ranked.some((risk) => risk.severity === "high")
      ? "high"
      : ranked.filter((risk) => risk.severity === "medium").length >= 2
        ? "medium"
        : primary?.severity ?? "low";
    const confidence = this.summaryConfidence(ranked, input);
    const topActions = unique(ranked.map((risk) => risk.suggestedAction)).slice(0, 3);
    const compactSummary = [
      `Overall Wellness Risk: ${overallRisk}`,
      `Primary Risk: ${primary?.title ?? "No strong preventive wellness risk"}`,
      `Confidence: ${confidence}`,
      `Suggested Focus: ${categoryFocusLabel[primary?.category ?? "none"]}`,
      ...topActions.map((action) => `Top Action: ${action}`),
    ];

    return {
      generatedAt,
      overallRisk,
      primaryRisk: primary,
      focus: primary?.category ?? "none",
      confidence,
      topActions,
      risks: ranked,
      compactSummary,
      safetyLevel: ranked.some((risk) => risk.safetyLevel === "caution") ? "caution" : "normal",
    };
  }

  private makeRisk(
    input: PreventiveInput,
    generatedAt: string,
    base: Omit<PreventiveRisk, "generatedAt" | "summary" | "explanation" | "suggestedAction"> & {
      summary: string;
      explanation: string;
      suggestedAction: string;
      score: number;
    },
  ): RiskCandidate {
    const style = input.intelligenceProfile.preferredCoachingStyle;

    return {
      ...base,
      title: sanitize(base.title),
      summary: sanitize(styleSummary(style, base.category, base.summary)),
      explanation: sanitize(base.explanation),
      suggestedAction: sanitize(safeAction(base.category, base.suggestedAction)),
      supportingSignals: unique(base.supportingSignals.map(sanitize)).slice(0, 5),
      generatedAt,
    };
  }

  private sleepRisk(input: PreventiveInput, generatedAt: string): RiskCandidate | undefined {
    const trend = trendFor(input.trendIntelligence, "sleep");
    const prediction = predictionFor(input.predictions, "sleep");
    const sleepValues = recentNumericValues(input.summaries, (summary) => summary.metrics.sleepMinutes);
    const shortNights = countBelow(sleepValues, 390);
    const sleepDebt = sleepValues.length >= 3 && countBelow(sleepValues.slice(-4), 420) >= 3;
    const inconsistent = bedtimeInconsistencySignal(input.summaries);
    const score = trendScore(trend) +
      riskLevelScore(prediction?.riskLevel) +
      (input.context.sleepScore > 0 && input.context.sleepScore < 70 ? 22 : 0) +
      (shortNights >= 3 ? 20 : 0) +
      (sleepDebt ? 18 : 0) +
      (inconsistent ? 12 : 0);

    if (score < 22) return undefined;

    const signals = [
      input.context.sleepScore > 0 ? `Sleep score is ${input.context.sleepScore}` : "",
      shortNights >= 2 ? `${shortNights} recent short sleep nights` : "",
      sleepDebt ? "Recent sleep pattern suggests sleep debt" : "",
      inconsistent ?? "",
      trend?.reason ?? "",
      prediction?.explanation.summary ?? "",
    ].filter(Boolean);
    const confidence = confidenceFrom(trend?.confidence, prediction?.confidence, sleepValues.length >= 4 ? "medium" : undefined);

    return this.makeRisk(input, generatedAt, {
      id: "preventive-risk-sleep-debt",
      category: "sleep",
      severity: severityFromScore(score),
      confidence,
      title: sleepDebt ? "Sleep debt pattern" : "Sleep routine needs attention",
      summary: sleepDebt ? "your sleep routine may deserve more attention." : "sleep consistency may be slipping.",
      explanation: "Sleep risk is based on repeated short nights, declining sleep trend, sleep score, and predictive wellness signals.",
      suggestedAction: "Protect a consistent wind-down routine tonight.",
      supportingSignals: signals,
      source: trend ? "trend" : prediction ? "prediction" : "device",
      safetyLevel: severityFromScore(score) === "high" ? "caution" : "normal",
      score,
    });
  }

  private recoveryRisk(input: PreventiveInput, generatedAt: string): RiskCandidate | undefined {
    const trend = trendFor(input.trendIntelligence, "recovery");
    const prediction = predictionFor(input.predictions, "recovery");
    const recoveryDrift = input.trendIntelligence.habitDrifts.find((drift) => drift.type === "recovery_strain");
    const recoveryInsight = input.aiInsights?.topInsights.find((insight) => insight.category === "recovery");
    const highActivityLowSleep = input.context.weeklyActivityMinutes >= 240 &&
      input.context.sleepScore > 0 &&
      input.context.sleepScore < 75;
    const fatigueMemory = input.aiInsights?.topInsights.some((insight) => /fatigue|tired|recovery/i.test(`${insight.summary} ${insight.explanation}`));
    const score = trendScore(trend) +
      riskLevelScore(prediction?.riskLevel) +
      (highActivityLowSleep ? 34 : 0) +
      (recoveryDrift ? 22 : 0) +
      (recoveryInsight ? 16 : 0) +
      (fatigueMemory ? 8 : 0);

    if (score < 26) return undefined;

    const signals = [
      highActivityLowSleep ? `Weekly activity is ${input.context.weeklyActivityMinutes} minutes with sleep score ${input.context.sleepScore}` : "",
      recoveryDrift?.message ?? "",
      recoveryInsight?.title ?? "",
      trend?.reason ?? "",
      prediction?.explanation.summary ?? "",
    ].filter(Boolean);
    const confidence = confidenceFrom(trend?.confidence, prediction?.confidence, recoveryInsight?.confidence);

    return this.makeRisk(input, generatedAt, {
      id: "preventive-risk-recovery-strain",
      category: "recovery",
      severity: severityFromScore(score),
      confidence,
      title: "Recovery strain",
      summary: "your recovery may deserve more attention.",
      explanation: "Recovery risk is based on activity load, sleep quality, trend drift, insights, and predictive wellness support.",
      suggestedAction: "Keep today's movement light and protect bedtime.",
      supportingSignals: signals,
      source: recoveryDrift || trend ? "trend" : prediction ? "prediction" : "insight",
      safetyLevel: "caution",
      score,
    });
  }

  private hydrationRisk(input: PreventiveInput, generatedAt: string): RiskCandidate | undefined {
    const trend = trendFor(input.trendIntelligence, "hydration");
    const prediction = predictionFor(input.predictions, "hydration");
    const hydrationPercent = input.context.hydrationGoal > 0
      ? input.context.hydrationGlasses / input.context.hydrationGoal
      : 0;
    const hydrationValues = recentNumericValues(input.summaries, (summary) => summary.metrics.hydrationMl);
    const lowDays = countBelow(hydrationValues, 1500);
    const score = trendScore(trend) +
      riskLevelScore(prediction?.riskLevel) +
      (hydrationPercent > 0 && hydrationPercent < 0.65 ? 24 : 0) +
      (lowDays >= 3 ? 18 : 0);

    if (score < 22) return undefined;

    const signals = [
      input.context.hydrationGoal > 0 ? `Hydration is ${input.context.hydrationGlasses}/${input.context.hydrationGoal} glasses` : "",
      lowDays >= 2 ? `${lowDays} recent low hydration days` : "",
      trend?.reason ?? "",
      prediction?.explanation.summary ?? "",
    ].filter(Boolean);

    return this.makeRisk(input, generatedAt, {
      id: "preventive-risk-hydration-decline",
      category: "hydration",
      severity: severityFromScore(score),
      confidence: confidenceFrom(trend?.confidence, prediction?.confidence, hydrationValues.length >= 4 ? "medium" : undefined),
      title: "Hydration decline",
      summary: "your recent hydration trend has declined.",
      explanation: "Hydration risk is based on current progress against goal, recent logged hydration, trend drift, and predictive wellness signals.",
      suggestedAction: "Add two simple hydration check-ins today if that fits your usual guidance.",
      supportingSignals: signals,
      source: trend ? "trend" : prediction ? "prediction" : "device",
      safetyLevel: "normal",
      score,
    });
  }

  private activityRisk(input: PreventiveInput, generatedAt: string): RiskCandidate | undefined {
    const trend = trendFor(input.trendIntelligence, "activity");
    const prediction = predictionFor(input.predictions, "activity");
    const stepPercent = input.context.stepGoal > 0 ? input.context.steps / input.context.stepGoal : 0;
    const activityValues = recentNumericValues(input.summaries, (summary) => summary.metrics.steps);
    const lowStepDays = input.context.stepGoal > 0 ? countBelow(activityValues, input.context.stepGoal * 0.55) : 0;
    const score = trendScore(trend) +
      riskLevelScore(prediction?.riskLevel) +
      (stepPercent > 0 && stepPercent < 0.5 ? 24 : 0) +
      (typeof input.context.activeMinutes === "number" && input.context.activeMinutes < 15 ? 12 : 0) +
      (input.context.weeklyActivityMinutes > 0 && input.context.weeklyActivityMinutes < 105 ? 14 : 0) +
      (lowStepDays >= 3 ? 14 : 0);

    if (score < 22) return undefined;

    const signals = [
      input.context.stepGoal > 0 ? `Steps are ${input.context.steps}/${input.context.stepGoal}` : "",
      typeof input.context.activeMinutes === "number" ? `Active minutes today are ${input.context.activeMinutes}` : "",
      lowStepDays >= 2 ? `${lowStepDays} recent low-step days` : "",
      trend?.reason ?? "",
      prediction?.explanation.summary ?? "",
    ].filter(Boolean);

    return this.makeRisk(input, generatedAt, {
      id: "preventive-risk-activity-decline",
      category: "activity",
      severity: severityFromScore(score),
      confidence: confidenceFrom(trend?.confidence, prediction?.confidence, activityValues.length >= 4 ? "medium" : undefined),
      title: "Activity consistency loss",
      summary: "activity consistency may be drifting below your recent pattern.",
      explanation: "Activity risk is based on step progress, active minutes, recent trend duration, and predictive wellness support.",
      suggestedAction: "Use a short gentle movement block today if you feel well.",
      supportingSignals: signals,
      source: trend ? "trend" : prediction ? "prediction" : "device",
      safetyLevel: "normal",
      score,
    });
  }

  private habitRisk(input: PreventiveInput, generatedAt: string): RiskCandidate | undefined {
    const slippingHabit = input.goalHabitCoaching.habits.find((habit) => habit.status === "slipping");
    const atRiskGoal = input.goalHabitCoaching.goals.find((goal) => goal.status === "at_risk");
    if (!slippingHabit && !atRiskGoal && input.goalHabitCoaching.atRiskCount === 0) return undefined;

    const domain = slippingHabit?.domain ?? atRiskGoal?.domain ?? "general_wellness";
    const score = 36 +
      input.goalHabitCoaching.atRiskCount * 10 +
      (slippingHabit && slippingHabit.completionRate < 45 ? 14 : 0) +
      (atRiskGoal && atRiskGoal.progressPercent < 50 ? 12 : 0);
    const medication = domain === "medication_adherence";
    const action = medication
      ? "Use reminders and follow your clinician's medication instructions."
      : slippingHabit?.suggestedNextAction ?? input.goalHabitCoaching.suggestedNextAction ?? "Restart one small habit step today.";
    const signals = [
      slippingHabit ? `${slippingHabit.title} completion is ${slippingHabit.completionRate}%` : "",
      atRiskGoal ? `${atRiskGoal.title} is ${atRiskGoal.progressPercent}% complete` : "",
      `At-risk goals or habits: ${input.goalHabitCoaching.atRiskCount}`,
    ].filter(Boolean);

    return this.makeRisk(input, generatedAt, {
      id: `preventive-risk-habit-${domain}`,
      category: "habit",
      severity: severityFromScore(score),
      confidence: input.goalHabitCoaching.confidence,
      title: medication ? "Medication reminder consistency" : "Habit relapse risk",
      summary: medication ? "a reminder routine may support prescribed medication consistency." : "one routine may be slipping.",
      explanation: medication
        ? "Medication-related prevention is limited to reminders, adherence, and following clinician instructions."
        : "Habit risk is based on broken streaks, at-risk goals, completion rate, and coaching confidence.",
      suggestedAction: action,
      supportingSignals: signals,
      source: slippingHabit ? "habit" : "goal",
      safetyLevel: medication ? "caution" : "normal",
      score,
    });
  }

  private deviceRisk(input: PreventiveInput, generatedAt: string, now: Date): RiskCandidate | undefined {
    const prediction = predictionFor(input.predictions, "device_quality");
    const cloudOnly = input.summaries.length > 0 &&
      input.summaries.every((summary) => summary.deviceSource === "cloud_summary");
    const lastSyncAge = daysSince(now, input.context.lastDeviceSyncAt);
    const stale = typeof lastSyncAge === "number" && lastSyncAge > 2;
    const statusRisk = input.context.deviceDataSource === "no_data" ||
      input.context.deviceDataSource === "demo" ||
      input.context.deviceDataSource === "fallback" ||
      input.context.deviceDataSource === "unavailable" ||
      input.context.deviceDataSource === "cache";
    const score = riskLevelScore(prediction?.riskLevel) +
      (input.context.deviceDataSource === "no_data" ? 34 : 0) +
      (input.context.deviceDataSource === "demo" || input.context.deviceDataSource === "fallback" ? 28 : 0) +
      (cloudOnly ? 24 : 0) +
      (stale ? 22 : 0) +
      (input.context.deviceDataSource === "cache" ? 12 : 0);

    if (!statusRisk && !cloudOnly && !stale && score < 20) return undefined;

    const title = input.context.deviceDataSource === "no_data"
      ? "Health Connect has no recent records"
      : input.context.deviceDataSource === "demo" || input.context.deviceDataSource === "fallback"
        ? "Demo data quality warning"
        : cloudOnly
          ? "Cloud-only health summary"
          : stale
            ? "Stale device sync"
            : "Device data quality warning";
    const signals = [
      `Device source is ${input.context.deviceDataSource}`,
      `Device status is ${input.context.deviceDataStatus}`,
      stale ? `Last sync is ${Math.round(lastSyncAge ?? 0)} days old` : "",
      cloudOnly ? "Recent summaries are cloud-only" : "",
      prediction?.explanation.summary ?? "",
    ].filter(Boolean);

    return this.makeRisk(input, generatedAt, {
      id: "preventive-risk-device-quality",
      category: "device_quality",
      severity: severityFromScore(score),
      confidence: prediction?.confidence ?? (cloudOnly || stale || input.context.deviceDataSource === "no_data" ? "medium" : "low"),
      title,
      summary: "some wellness guidance may be less precise until device data refreshes.",
      explanation: "Device-quality risk is based on sync freshness, Health Connect availability, demo data, cloud-only summaries, and predictive data quality.",
      suggestedAction: "Refresh Health Connect or confirm device permissions when available.",
      supportingSignals: signals,
      source: "device",
      safetyLevel: "normal",
      score,
    });
  }

  private generalRisk(input: PreventiveInput, risks: RiskCandidate[], generatedAt: string): RiskCandidate | undefined {
    const moderateCount = risks.filter((risk) => risk.severity === "medium" || risk.severity === "high").length;
    const decliningCount = input.trendIntelligence.metrics.filter((item) => item.direction === "declining").length;
    const lowConsistency = input.goalHabitCoaching.atRiskCount >= 2 || decliningCount >= 3;

    if (moderateCount < 2 && !lowConsistency) return undefined;

    const primarySignals = risks.slice(0, 4).map((risk) => risk.title);
    const score = 40 + moderateCount * 12 + decliningCount * 4;

    return this.makeRisk(input, generatedAt, {
      id: "preventive-risk-general-wellness",
      category: "general",
      severity: severityFromScore(score),
      confidence: confidenceFrom(input.trendIntelligence.confidence, input.goalHabitCoaching.confidence),
      title: "Elevated wellness risk pattern",
      summary: "multiple moderate wellness signals are active at the same time.",
      explanation: "General wellness risk is raised when several non-urgent risk patterns overlap across sleep, activity, hydration, recovery, habits, or data quality.",
      suggestedAction: "Choose recovery, hydration, and one routine anchor as today's focus.",
      supportingSignals: unique([
        ...primarySignals,
        `${decliningCount} declining trend signals`,
        input.dailyBriefing?.focusArea ? `Briefing focus is ${input.dailyBriefing.focusArea}` : "",
        input.recommendationDecision?.primary.category ? `Recommendation focus is ${input.recommendationDecision.primary.category}` : "",
      ].filter(Boolean)),
      source: input.dailyBriefing ? "briefing" : "trend",
      safetyLevel: "caution",
      score,
    });
  }

  private dedupe(risks: RiskCandidate[]): RiskCandidate[] {
    const seen = new Map<string, RiskCandidate>();

    for (const risk of risks) {
      const key = `${risk.category}:${normalizeKey(risk.suggestedAction)}`;
      const current = seen.get(key);
      if (!current || risk.score > current.score) {
        seen.set(key, risk);
      }
    }

    return [...seen.values()];
  }

  private summaryConfidence(
    risks: PreventiveRisk[],
    input: PreventiveInput,
  ): PreventiveRiskConfidence {
    if (risks.length === 0) return input.trendIntelligence.dataQuality === "insufficient" ? "low" : "medium";
    if (input.trendIntelligence.dataQuality === "insufficient" || input.context.deviceDataSource === "no_data") {
      return risks.some((risk) => risk.confidence === "medium" || risk.confidence === "high") ? "medium" : "low";
    }

    const average = risks.reduce((sum, risk) =>
      sum + severityRank[risk.severity] + confidenceRank[risk.confidence], 0) / Math.max(risks.length, 1);

    if (average >= 5) return "high";
    if (average >= 3.5) return "medium";

    return "low";
  }
}

export const preventiveHealthEngine = new PreventiveHealthEngine();
