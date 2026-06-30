import type {
  HabitDriftType,
  HealthSummaryBackup,
  TrendIntelligenceConfidence,
  TrendIntelligenceDataQuality,
  TrendIntelligenceDirection,
  TrendIntelligenceItem,
  TrendIntelligenceMetric,
  TrendIntelligenceSummary,
  UserIntelligenceProfile,
} from "../../types";

type TrendContext = {
  healthScore: number;
  steps: number;
  stepGoal: number;
  weeklyActivityMinutes: number;
  sleepMinutes?: number;
  hydrationGlasses: number;
  hydrationGoal: number;
  caloriesBurned?: number;
  heartRateBpm?: number;
  deviceDataSource: string;
  lastDeviceSyncAt: string | null;
  profile: {
    goals: string[];
  };
};

type TrendInput = {
  summaries: HealthSummaryBackup[];
  context: TrendContext;
  intelligenceProfile: UserIntelligenceProfile;
  now?: Date;
};

type MetricPoint = {
  date: string;
  value: number;
  source: TrendIntelligenceItem["source"];
  syncedAt: string | null;
};

const metricLabels: Record<TrendIntelligenceMetric, string> = {
  steps: "Steps",
  activity_minutes: "Activity minutes",
  calories_burned: "Calories burned",
  sleep_minutes: "Sleep",
  hydration_ml: "Hydration",
  heart_rate_avg: "Heart rate average",
  health_score: "Health score",
};

const metricUnits: Record<TrendIntelligenceMetric, string> = {
  steps: "steps",
  activity_minutes: "minutes",
  calories_burned: "calories",
  sleep_minutes: "minutes",
  hydration_ml: "ml",
  heart_rate_avg: "bpm",
  health_score: "score",
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const average = (values: number[]): number => {
  if (values.length === 0) return 0;

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
};

const percentChange = (baseline: number, latest: number): number => {
  if (baseline === 0) return latest === 0 ? 0 : 100;

  return Math.round(((latest - baseline) / baseline) * 100);
};

const safeDate = (date: Date): string => date.toISOString().slice(0, 10);

const getDaysAgo = (now: Date, iso: string | null): number | undefined => {
  if (!iso) return undefined;
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return undefined;

  return (now.getTime() - timestamp) / (24 * 60 * 60 * 1000);
};

const getMetricValue = (summary: HealthSummaryBackup, metric: TrendIntelligenceMetric): number | undefined => {
  if (metric === "steps") return summary.metrics.steps;
  if (metric === "activity_minutes") return summary.metrics.activeMinutes;
  if (metric === "calories_burned") return summary.metrics.caloriesBurned;
  if (metric === "sleep_minutes") return summary.metrics.sleepMinutes;
  if (metric === "hydration_ml") return summary.metrics.hydrationMl;
  if (metric === "heart_rate_avg") return summary.metrics.heartRateAvg;

  return summary.scores.healthScore;
};

const getCurrentMetricValue = (context: TrendContext, metric: TrendIntelligenceMetric): number | undefined => {
  if (metric === "steps") return context.steps;
  if (metric === "activity_minutes") return context.weeklyActivityMinutes > 0 ? Math.round(context.weeklyActivityMinutes / 7) : undefined;
  if (metric === "calories_burned") return context.caloriesBurned;
  if (metric === "sleep_minutes") return context.sleepMinutes;
  if (metric === "hydration_ml") return context.hydrationGlasses > 0 ? context.hydrationGlasses * 250 : undefined;
  if (metric === "heart_rate_avg") return context.heartRateBpm;

  return context.healthScore;
};

const sourceFromSummary = (summary: HealthSummaryBackup): TrendIntelligenceItem["source"] =>
  summary.deviceSource === "cloud_summary" || summary.deviceSource === "cache"
    ? "device_cache"
    : "local_summary";

const sourceForPoints = (points: MetricPoint[]): TrendIntelligenceItem["source"] => {
  const sources = new Set(points.map((point) => point.source));

  return sources.size > 1 ? "mixed" : points[0]?.source ?? "current_context";
};

const dataQualityFor = (
  points: MetricPoint[],
  now: Date,
  context: TrendContext,
): TrendIntelligenceDataQuality => {
  if (points.length < 3) return "insufficient";
  if (context.deviceDataSource === "unavailable" || context.deviceDataSource === "no_data") return "limited";
  if (context.deviceDataSource === "fallback" || context.deviceDataSource === "demo") return "limited";

  const latestSync = points
    .map((point) => point.syncedAt)
    .filter((syncedAt): syncedAt is string => Boolean(syncedAt))
    .sort()
    .at(-1) ?? context.lastDeviceSyncAt;
  const syncAge = getDaysAgo(now, latestSync);
  const latestDateAge = getDaysAgo(now, `${points[points.length - 1]?.date}T12:00:00.000Z`);

  if ((typeof syncAge === "number" && syncAge > 2) || (typeof latestDateAge === "number" && latestDateAge > 2)) {
    return "stale";
  }

  return "fresh";
};

const confidenceFor = (
  dataPointsUsed: number,
  dataQuality: TrendIntelligenceDataQuality,
  abnormalChange: boolean,
  habitDrift: boolean,
): TrendIntelligenceConfidence => {
  if (dataQuality === "insufficient" || dataPointsUsed < 3) return "low";
  if (dataQuality === "stale" || dataQuality === "limited") return dataPointsUsed >= 5 && (abnormalChange || habitDrift) ? "medium" : "low";
  if (dataPointsUsed >= 6 && (abnormalChange || habitDrift)) return "high";
  if (dataPointsUsed >= 5) return "medium";

  return "low";
};

const directionFor = (
  metric: TrendIntelligenceMetric,
  change: number,
  dataPointsUsed: number,
): TrendIntelligenceDirection => {
  if (dataPointsUsed < 3) return "insufficient_data";
  if (Math.abs(change) < 5) return "stable";

  const higherIsBetter = metric !== "heart_rate_avg";
  if (higherIsBetter) return change > 0 ? "improving" : "declining";

  return change > 0 ? "declining" : "improving";
};

const isAbnormalChange = (metric: TrendIntelligenceMetric, change: number): boolean => {
  const threshold = metric === "heart_rate_avg" ? 8 : metric === "health_score" ? 10 : 15;

  return Math.abs(change) >= threshold;
};

const isBelowBaseline = (latest: number, baseline: number, percent = 0.85): boolean =>
  baseline > 0 && latest < baseline * percent;

const lastValues = (points: MetricPoint[], count: number): number[] => points.slice(-count).map((point) => point.value);

const isThreeDayDecline = (points: MetricPoint[]): boolean => {
  const values = lastValues(points, 4);
  if (values.length < 4) return false;

  return values[1] < values[0] && values[2] < values[1] && values[3] < values[2];
};

const primaryGoal = (input: TrendInput): string | undefined =>
  input.intelligenceProfile.healthGoals[0] ?? input.context.profile.goals[0];

const coachVerb = (style: UserIntelligenceProfile["preferredCoachingStyle"]): string => {
  if (style === "motivational") return "a small challenge";
  if (style === "scientific") return "a low-risk adjustment";
  if (style === "minimal") return "one small step";
  if (style === "professional") return "a steady next step";

  return "a gentle next step";
};

const interpretationFor = (
  input: TrendInput,
  metric: TrendIntelligenceMetric,
  direction: TrendIntelligenceDirection,
  latest: number | undefined,
  baseline: number | undefined,
): string => {
  const goal = primaryGoal(input);
  const styleAction = coachVerb(input.intelligenceProfile.preferredCoachingStyle);
  const goalText = goal ? `Because your goal is ${goal.toLowerCase()}, ` : "";

  if (direction === "insufficient_data") {
    return `${goalText}I need a few more days of saved summaries before making a strong trend call.`;
  }

  if (metric === "steps" && direction === "declining") {
    return `${goalText}${styleAction} like a short walk may fit better than trying to make up the full step gap at once.`;
  }

  if (metric === "activity_minutes" && direction === "declining") {
    return `${goalText}keep activity easy and repeatable while the weekly activity pattern rebuilds.`;
  }

  if (metric === "sleep_minutes" && (direction === "declining" || (latest && baseline && latest < baseline))) {
    return `${goalText}protecting bedtime may support energy better than adding intensity today.`;
  }

  if (metric === "hydration_ml" && direction === "declining") {
    return `${goalText}scheduled hydration check-ins are likely more useful than a large late catch-up.`;
  }

  if (metric === "heart_rate_avg" && direction === "declining") {
    return `${goalText}use recovery-first guidance and avoid treating this as a diagnosis.`;
  }

  if (direction === "improving") {
    return `${goalText}the current pattern is moving in a helpful direction, so keep the routine simple and repeatable.`;
  }

  return `${goalText}the pattern looks steady, so focus on the lowest current wellness gap.`;
};

export class TrendIntelligenceEngine {
  analyze(input: TrendInput): TrendIntelligenceSummary {
    const now = input.now ?? new Date();
    const metrics: TrendIntelligenceMetric[] = [
      "steps",
      "activity_minutes",
      "calories_burned",
      "sleep_minutes",
      "hydration_ml",
      "heart_rate_avg",
      "health_score",
    ];
    const items = metrics.map((metric) => this.analyzeMetric(metric, input, now));
    const habitDrifts = this.detectHabitDrifts(items, input);
    const withDrift = items.map((item) => ({
      ...item,
      habitDrift: item.habitDrift || habitDrifts.some((drift) => drift.metric === item.metric),
    }));
    const topTrends = [...withDrift]
      .sort((left, right) =>
        Number(right.habitDrift) - Number(left.habitDrift) ||
        Number(right.abnormalChange) - Number(left.abnormalChange) ||
        confidenceRank(right.confidence) - confidenceRank(left.confidence) ||
        Math.abs(right.percentageChange) - Math.abs(left.percentageChange),
      )
      .slice(0, 4);
    const dataQuality = summaryDataQuality(withDrift);
    const confidence = summaryConfidence(topTrends, dataQuality);
    const compactSummary = topTrends.map((trend) =>
      `${trend.label} ${trend.direction.replace(/_/g, " ")} over ${trend.dataPointsUsed} data points, confidence ${trend.confidence}.`,
    );

    return {
      generatedAt: now.toISOString(),
      source: input.context.deviceDataSource === "cache" || input.context.deviceDataSource === "fallback" ? "offline_cache" : "local",
      weeklySummary: compactSummary.length
        ? compactSummary.slice(0, 3).join(" ")
        : "Not enough recent local summary data for a weekly trend yet.",
      compactSummary,
      topTrends,
      metrics: withDrift,
      habitDrifts,
      confidence,
      dataQuality,
    };
  }

  private analyzeMetric(metric: TrendIntelligenceMetric, input: TrendInput, now: Date): TrendIntelligenceItem {
    const points = this.pointsFor(metric, input, now);
    const recent = points.slice(-7);
    const recentValues = recent.map((point) => point.value);
    const latest = recentValues.at(-1);
    const previousWindow = recentValues.length >= 6 ? recentValues.slice(0, Math.max(3, recentValues.length - 3)) : recentValues.slice(0, -1);
    const baseline = previousWindow.length > 0 ? average(previousWindow) : latest;
    const change = typeof latest === "number" && typeof baseline === "number" ? percentChange(baseline, latest) : 0;
    const dataQuality = dataQualityFor(recent, now, input.context);
    const direction = directionFor(metric, change, recent.length);
    const abnormalChange = direction !== "insufficient_data" && isAbnormalChange(metric, change);
    const baselineDrift = typeof latest === "number" && typeof baseline === "number"
      ? isBelowBaseline(latest, baseline, metric === "sleep_minutes" ? 0.9 : 0.82)
      : false;
    const habitDrift = baselineDrift || isThreeDayDecline(recent);
    const confidence = confidenceFor(recent.length, dataQuality, abnormalChange, habitDrift);
    const reason = this.reasonFor(metric, recent.length, dataQuality, direction, latest, baseline, change, habitDrift);

    return {
      id: `trend-intelligence-${metric}`,
      metric,
      label: metricLabels[metric],
      direction,
      period: "7d",
      latestValue: latest,
      baselineValue: baseline,
      percentageChange: change,
      confidence,
      dataPointsUsed: recent.length,
      dataQuality,
      source: sourceForPoints(recent),
      reason,
      interpretation: interpretationFor(input, metric, direction, latest, baseline),
      abnormalChange,
      habitDrift,
    };
  }

  private pointsFor(metric: TrendIntelligenceMetric, input: TrendInput, now: Date): MetricPoint[] {
    const byDate = new Map<string, MetricPoint>();

    for (const summary of input.summaries) {
      const value = getMetricValue(summary, metric);
      if (typeof value !== "number" || !Number.isFinite(value)) continue;

      byDate.set(summary.date, {
        date: summary.date,
        value,
        source: sourceFromSummary(summary),
        syncedAt: summary.syncMetadata.lastDeviceSyncAt,
      });
    }

    const currentValue = getCurrentMetricValue(input.context, metric);
    if (typeof currentValue === "number" && Number.isFinite(currentValue) && currentValue > 0) {
      const date = safeDate(now);
      const existing = byDate.get(date);

      byDate.set(date, {
        date,
        value: currentValue,
        source: existing ? "mixed" : "current_context",
        syncedAt: input.context.lastDeviceSyncAt,
      });
    }

    return Array.from(byDate.values()).sort((left, right) => left.date.localeCompare(right.date)).slice(-14);
  }

  private reasonFor(
    metric: TrendIntelligenceMetric,
    dataPointsUsed: number,
    dataQuality: TrendIntelligenceDataQuality,
    direction: TrendIntelligenceDirection,
    latest: number | undefined,
    baseline: number | undefined,
    change: number,
    habitDrift: boolean,
  ): string {
    if (dataPointsUsed < 3) return "Not enough recent data yet.";

    const unit = metricUnits[metric];
    const latestText = typeof latest === "number" ? `${latest} ${unit}` : "unknown latest value";
    const baselineText = typeof baseline === "number" ? `${baseline} ${unit}` : "unknown baseline";
    const qualityText = dataQuality === "stale"
      ? " Data is stale, so confidence is downgraded."
      : dataQuality === "limited"
        ? " Data quality is limited, so this is approximate."
        : "";
    const driftText = habitDrift ? " Habit drift was detected against your recent baseline." : "";

    return `${metricLabels[metric]} is ${direction.replace(/_/g, " ")}: latest ${latestText}, baseline ${baselineText}, change ${change}%.${driftText}${qualityText}`;
  }

  private detectHabitDrifts(items: TrendIntelligenceItem[], input: TrendInput) {
    const drift = (
      type: HabitDriftType,
      metric: TrendIntelligenceMetric,
      severity: "low" | "medium" | "high",
      message: string,
      item: TrendIntelligenceItem | undefined,
    ) => ({
      id: `habit-drift-${type}`,
      type,
      metric,
      severity,
      message,
      daysObserved: item?.dataPointsUsed ?? 0,
      confidence: item?.confidence ?? "low" as TrendIntelligenceConfidence,
      reason: item?.reason ?? "Not enough recent data yet.",
    });
    const byMetric = new Map(items.map((item) => [item.metric, item]));
    const drifts = [];
    const steps = byMetric.get("steps");
    const sleep = byMetric.get("sleep_minutes");
    const hydration = byMetric.get("hydration_ml");
    const activity = byMetric.get("activity_minutes");
    const heartRate = byMetric.get("heart_rate_avg");

    if (steps?.habitDrift && steps.direction === "declining") {
      drifts.push(drift(
        "activity_drop",
        "steps",
        Math.abs(steps.percentageChange) >= 25 ? "high" : "medium",
        "Steps are down against your recent pattern for multiple days.",
        steps,
      ));
    }

    if (sleep?.habitDrift || (sleep?.latestValue && sleep.baselineValue && sleep.latestValue < sleep.baselineValue * 0.9)) {
      drifts.push(drift(
        "sleep_below_baseline",
        "sleep_minutes",
        "medium",
        "Sleep is below your usual recent pattern.",
        sleep,
      ));
    }

    if (hydration?.habitDrift && hydration.direction === "declining") {
      drifts.push(drift(
        "hydration_below_baseline",
        "hydration_ml",
        "medium",
        "Hydration is below your recent baseline.",
        hydration,
      ));
    }

    if (activity?.habitDrift && activity.direction === "declining") {
      drifts.push(drift(
        "weekly_activity_drop",
        "activity_minutes",
        "medium",
        "Activity minutes have dropped compared with your earlier-week pattern.",
        activity,
      ));
    }

    if (
      heartRate?.direction === "declining" &&
      sleep?.direction === "declining" &&
      input.context.weeklyActivityMinutes >= 240
    ) {
      drifts.push(drift(
        "recovery_strain",
        "heart_rate_avg",
        "medium",
        "Heart-rate and sleep trends suggest a recovery-first wellness day.",
        heartRate,
      ));
    }

    return drifts.slice(0, 5);
  }
}

const confidenceRank = (confidence: TrendIntelligenceConfidence): number => {
  if (confidence === "high") return 3;
  if (confidence === "medium") return 2;

  return 1;
};

const dataQualityRank = (dataQuality: TrendIntelligenceDataQuality): number => {
  if (dataQuality === "fresh") return 4;
  if (dataQuality === "stale") return 3;
  if (dataQuality === "limited") return 2;

  return 1;
};

const summaryDataQuality = (items: TrendIntelligenceItem[]): TrendIntelligenceDataQuality => {
  if (items.length === 0) return "insufficient";
  const ranked = [...items].sort((left, right) => dataQualityRank(right.dataQuality) - dataQualityRank(left.dataQuality));

  return ranked[0]?.dataQuality ?? "insufficient";
};

const summaryConfidence = (
  topTrends: TrendIntelligenceItem[],
  dataQuality: TrendIntelligenceDataQuality,
): TrendIntelligenceConfidence => {
  if (dataQuality === "insufficient") return "low";
  if (topTrends.some((trend) => trend.confidence === "high")) return dataQuality === "fresh" ? "high" : "medium";
  if (topTrends.some((trend) => trend.confidence === "medium")) return "medium";

  return "low";
};

export const trendIntelligenceEngine = new TrendIntelligenceEngine();
