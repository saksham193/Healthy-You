import type { AIContext, HealthTrend, MemoryRecord } from "../../types";
import type { PredictionCategory, PredictiveSignal } from "./PredictionTypes";

const lastValues = (trend: HealthTrend | undefined, count = 3): number[] =>
  trend?.points.slice(-count).map((point) => point.value) ?? [];

const countBelow = (values: number[], threshold: number): number =>
  values.filter((value) => value < threshold).length;

const trendFor = (context: AIContext, metric: HealthTrend["metric"]): HealthTrend | undefined =>
  context.trends.find((trend) => trend.metric === metric);

const hasMemory = (memory: MemoryRecord[], pattern: RegExp): boolean =>
  memory.some((item) => pattern.test(`${item.category} ${item.value} ${item.sourceMessage}`));

const signal = (
  id: string,
  category: PredictionCategory,
  label: string,
  input: Pick<PredictiveSignal, "severity" | "repeatedCount" | "source"> & { value?: number | string },
): PredictiveSignal => ({
  id,
  category,
  label,
  value: input.value,
  severity: input.severity,
  repeatedCount: input.repeatedCount,
  source: input.source,
});

const hoursSince = (iso: string | null): number | undefined => {
  if (!iso) return undefined;
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return undefined;

  return (Date.now() - timestamp) / (60 * 60 * 1000);
};

export class PredictiveSignalEngine {
  extract(context: AIContext): PredictiveSignal[] {
    const signals: PredictiveSignal[] = [];
    const sleepTrend = trendFor(context, "sleep");
    const waterTrend = trendFor(context, "water");
    const stepsTrend = trendFor(context, "steps");
    const caloriesTrend = trendFor(context, "calories");
    const adherenceTrend = trendFor(context, "medicationAdherence");
    const sleepLowCount = countBelow(lastValues(sleepTrend), 70);
    const waterLowCount = countBelow(lastValues(waterTrend), Math.max(1, context.hydrationGoal * 0.75 || 6));
    const stepsLowCount = countBelow(lastValues(stepsTrend), Math.max(1, context.stepGoal * 0.65 || 7000));
    const adherenceLowCount = countBelow(lastValues(adherenceTrend), 85);
    const calories = lastValues(caloriesTrend, 5);
    const calorieSwing = calories.length >= 2 ? Math.max(...calories) - Math.min(...calories) : 0;
    const hydrationPercent = context.hydrationGoal > 0 ? context.hydrationGlasses / context.hydrationGoal : 0;
    const stepsPercent = context.stepGoal > 0 ? context.steps / context.stepGoal : 0;
    const syncAgeHours = hoursSince(context.lastDeviceSyncAt);

    if (sleepLowCount >= 2 || context.sleepScore < 70) {
      signals.push(signal("sleep-low-streak", "sleep", "Sleep has been below target recently.", {
        value: context.sleepScore,
        severity: sleepLowCount >= 3 || context.sleepScore < 60 ? "strong" : "moderate",
        repeatedCount: Math.max(sleepLowCount, context.sleepScore < 70 ? 1 : 0),
        source: "trend",
      }));
    }

    if (context.weeklyActivityMinutes >= 300 && context.sleepScore < 70) {
      signals.push(signal("sleep-activity-load", "sleep", "High activity load is paired with lower sleep recovery.", {
        value: context.weeklyActivityMinutes,
        severity: "moderate",
        repeatedCount: 2,
        source: "device",
      }));
    }

    if (waterLowCount >= 2 || (hydrationPercent > 0 && hydrationPercent < 0.75)) {
      signals.push(signal("hydration-low-streak", "hydration", "Hydration has been below target recently.", {
        value: `${context.hydrationGlasses}/${context.hydrationGoal}`,
        severity: waterLowCount >= 3 || hydrationPercent < 0.5 ? "strong" : "moderate",
        repeatedCount: Math.max(waterLowCount, hydrationPercent < 0.75 ? 1 : 0),
        source: "trend",
      }));
    }

    if (context.weeklyActivityMinutes >= 240 && hydrationPercent > 0 && hydrationPercent < 0.85) {
      signals.push(signal("hydration-activity-load", "hydration", "Activity load may make hydration consistency more important today.", {
        value: context.weeklyActivityMinutes,
        severity: "moderate",
        repeatedCount: 2,
        source: "device",
      }));
    }

    if (typeof context.heartRateBpm === "number" && context.heartRateBpm >= 100) {
      signals.push(signal("recovery-heart-rate", "recovery", "Heart rate is above the usual wellness baseline saved in context.", {
        value: context.heartRateBpm,
        severity: context.heartRateBpm >= 110 ? "strong" : "moderate",
        repeatedCount: 1,
        source: "device",
      }));
    }

    if (context.sleepScore < 70 && context.weeklyActivityMinutes >= 240) {
      signals.push(signal("recovery-sleep-activity", "recovery", "Lower sleep recovery and higher activity suggest recovery strain risk.", {
        value: context.sleepScore,
        severity: "moderate",
        repeatedCount: 2,
        source: "trend",
      }));
    }

    if (hasMemory(context.memory, /\bfatigue|exhausted|tired|worn out\b/i)) {
      signals.push(signal("recovery-fatigue-memory", "recovery", "Recent memory mentions fatigue or low energy.", {
        severity: "minor",
        repeatedCount: 1,
        source: "memory",
      }));
    }

    if (adherenceLowCount >= 2 || context.adherenceScore < 85) {
      signals.push(signal("medication-adherence-drop", "medication", "Medication adherence may need a reminder routine.", {
        value: context.adherenceScore,
        severity: context.adherenceScore < 75 || adherenceLowCount >= 3 ? "strong" : "moderate",
        repeatedCount: Math.max(adherenceLowCount, context.adherenceScore < 85 ? 1 : 0),
        source: "schedule",
      }));
    }

    if (hasMemory(context.memory, /\bmissed|forgot|skip|late\b/i)) {
      signals.push(signal("medication-missed-memory", "medication", "Memory suggests a missed or inconsistent medication routine.", {
        severity: "moderate",
        repeatedCount: 2,
        source: "memory",
      }));
    }

    if (stepsLowCount >= 2 || (stepsPercent > 0 && stepsPercent < 0.65)) {
      signals.push(signal("activity-low-streak", "activity", "Activity has been below baseline recently.", {
        value: `${context.steps}/${context.stepGoal}`,
        severity: stepsLowCount >= 3 || stepsPercent < 0.45 ? "strong" : "moderate",
        repeatedCount: Math.max(stepsLowCount, stepsPercent < 0.65 ? 1 : 0),
        source: "trend",
      }));
    }

    if (context.weeklyActivityMinutes >= 300 && context.sleepScore < 70) {
      signals.push(signal("activity-overload-risk", "activity", "High activity plus lower sleep may call for gradual effort.", {
        value: context.weeklyActivityMinutes,
        severity: "moderate",
        repeatedCount: 2,
        source: "device",
      }));
    }

    if (calorieSwing >= 350 || context.nutritionScore < 70) {
      signals.push(signal("nutrition-inconsistency", "nutrition", "Nutrition consistency may need attention.", {
        value: calorieSwing || context.nutritionScore,
        severity: calorieSwing >= 600 || context.nutritionScore < 60 ? "strong" : "moderate",
        repeatedCount: calorieSwing >= 350 ? 2 : 1,
        source: "trend",
      }));
    }

    if (context.profile.allergies.length > 0 || context.profile.dietaryPreferences.length > 0) {
      signals.push(signal("nutrition-constraints", "nutrition", "Saved preferences or allergies affect meal planning.", {
        value: context.profile.allergies.length + context.profile.dietaryPreferences.length,
        severity: context.profile.allergies.length > 0 ? "moderate" : "minor",
        repeatedCount: 1,
        source: "profile",
      }));
    }

    if (
      context.deviceDataSource === "cache" ||
      context.deviceDataSource === "fallback" ||
      context.deviceDataSource === "demo" ||
      context.deviceDataSource === "no_data" ||
      context.deviceDataSource === "unavailable"
    ) {
      signals.push(signal("device-source-quality", "device_data", "Device data is cached, fallback, demo, no-data, or unavailable.", {
        value: context.deviceDataSource,
        severity: context.deviceDataSource === "unavailable" || context.deviceDataSource === "no_data" ? "strong" : "moderate",
        repeatedCount: 1,
        source: "data_quality",
      }));
    }

    if (typeof syncAgeHours === "number" && syncAgeHours > 24) {
      signals.push(signal("device-stale-sync", "device_data", "Device sync is more than 24 hours old.", {
        value: Math.round(syncAgeHours),
        severity: syncAgeHours > 72 ? "strong" : "moderate",
        repeatedCount: syncAgeHours > 72 ? 3 : 2,
        source: "data_quality",
      }));
    }

    return signals;
  }
}

export const predictiveSignalEngine = new PredictiveSignalEngine();
