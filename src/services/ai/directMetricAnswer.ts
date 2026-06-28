import type { AIContext, AIIntent, ProviderResponse } from "../../types";

const formatNumber = (value: number): string => value.toLocaleString("en-US");

const hasNumber = (value: number | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const sourcePrefix = (context: AIContext): string => {
  if (context.deviceDataSource === "live" || context.deviceDataSource === "no_data") {
    return "According to Health Connect, ";
  }

  if (context.deviceDataSource === "cache") {
    return "Using your cached device data, ";
  }

  if (context.deviceDataSource === "demo" || context.deviceDataSource === "fallback") {
    return "Using the current fallback health data, ";
  }

  return "";
};

const noRecordsMessage = (metric: string): string =>
  `I do not see Health Connect ${metric} records for today yet. Try syncing again after your fitness app writes data to Health Connect.`;

const createResponse = (
  intent: AIIntent,
  response: string,
  suggestions: string[] = ["Refresh device sync.", "Ask about another health metric."],
): ProviderResponse => ({
  id: `direct-metric-${Date.now()}`,
  intent,
  response,
  suggestions,
  provider: "mock",
  metadata: {
    source: "mock",
    safetyLevel: "routine",
    confidence: "high",
    metricDirectAnswerUsed: true,
  },
});

const shouldTreatAsNoData = (context: AIContext, value?: number): boolean =>
  context.deviceDataStatus === "connected_no_data" ||
  !hasNumber(value) ||
  (context.deviceDataSource === "unavailable" && value <= 0);

const userReportedSleepHours = (message: string): number | undefined => {
  const match = message.match(/\b(?:slept|sleep|got)\s+(?:only\s+)?(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);

  if (!match) return undefined;

  const hours = Number.parseFloat(match[1]);

  return Number.isFinite(hours) ? hours : undefined;
};

export function buildDirectMetricAnswer(message: string, intent: AIIntent, context: AIContext): ProviderResponse | null {
  const prefix = sourcePrefix(context);
  const selfReportedSleep = userReportedSleepHours(message);

  if (hasNumber(selfReportedSleep) && /\btired|fatigue|exhausted|sleepy\b/i.test(message)) {
    const syncedHours = hasNumber(context.sleepMinutes) ? Math.round((context.sleepMinutes / 60) * 10) / 10 : undefined;
    const mismatch = hasNumber(syncedHours) && Math.abs(syncedHours - selfReportedSleep) >= 0.75
      ? ` Your latest synced sleep record shows about ${syncedHours} hours, so there may be a mismatch between your wearable data and what you remember.`
      : "";

    return createResponse(
      "sleep_query",
      `You mentioned sleeping only ${selfReportedSleep} hours yesterday, so treat that as important.${mismatch} If you feel tired today, keep activity lighter and prioritize a steady wind-down tonight.`,
      ["Keep activity light today.", "Sync sleep again.", "Review your sleep trend."],
    );
  }

  if (intent === "steps_query") {
    if (shouldTreatAsNoData(context, context.steps)) {
      return createResponse(intent, noRecordsMessage("step"));
    }

    if (hasNumber(context.stepGoal) && context.stepGoal > 0) {
      const percent = context.stepPercent ?? Math.round((context.steps / context.stepGoal) * 100);

      return createResponse(
        intent,
        `${prefix}you have ${formatNumber(context.steps)} steps today. Your goal is ${formatNumber(context.stepGoal)}, so you are ${percent}% complete.`,
        ["View activity progress.", "Refresh Health Connect sync."],
      );
    }

    return createResponse(intent, `${prefix}you have ${formatNumber(context.steps)} steps today.`);
  }

  if (intent === "heart_rate_query") {
    const heartRate = context.heartRateBpm;

    if (shouldTreatAsNoData(context, heartRate) || !hasNumber(heartRate)) {
      return createResponse(intent, noRecordsMessage("heart-rate"));
    }

    return createResponse(intent, `${prefix}your latest heart-rate reading is ${heartRate} bpm.`);
  }

  if (intent === "sleep_query") {
    const sleepMinutes = context.sleepMinutes;

    if (shouldTreatAsNoData(context, sleepMinutes) || !hasNumber(sleepMinutes)) {
      return createResponse(intent, noRecordsMessage("sleep"));
    }

    const hours = Math.round((sleepMinutes / 60) * 10) / 10;

    return createResponse(
      intent,
      `${prefix}your latest sleep data shows ${sleepMinutes} minutes, about ${hours} hours.`,
    );
  }

  if (intent === "calories_query") {
    const caloriesBurned = context.caloriesBurned;

    if (shouldTreatAsNoData(context, caloriesBurned) || !hasNumber(caloriesBurned)) {
      return createResponse(intent, noRecordsMessage("calorie"));
    }

    return createResponse(intent, `${prefix}you have burned about ${formatNumber(caloriesBurned)} calories today.`);
  }

  if (intent === "hydration_query") {
    if (context.deviceDataStatus === "connected_no_data") {
      return createResponse(intent, noRecordsMessage("hydration"));
    }

    if (!hasNumber(context.hydrationGlasses) || context.hydrationGoal === 0) {
      return createResponse(intent, "I do not see hydration records for today yet.");
    }

    return createResponse(
      intent,
      `You have logged ${context.hydrationGlasses} of ${context.hydrationGoal} water glasses today. Hydration is ${context.hydrationStatus.toLowerCase()}.`,
    );
  }

  if (intent === "activity_query") {
    if (context.deviceDataStatus === "connected_no_data" || (shouldTreatAsNoData(context, context.steps) && !hasNumber(context.activeMinutes))) {
      return createResponse(intent, noRecordsMessage("activity"));
    }

    return createResponse(
      intent,
      `${prefix}you have ${formatNumber(context.steps)} steps and ${context.activeMinutes ?? context.weeklyActivityMinutes} active minutes in the current activity snapshot.`,
      ["View fitness progress.", "Refresh Health Connect sync."],
    );
  }

  if (intent === "device_sync_query") {
    return createResponse(
      intent,
      `Your device data status is ${context.deviceDataStatus.replace(/_/g, " ")}. Last sync: ${context.lastDeviceSyncAt ?? "not available"}.`,
      ["Retry Sync.", "Check Health Connect permissions."],
    );
  }

  if (intent === "health_score_query") {
    return createResponse(intent, `Your current health score is ${context.healthScore}.`);
  }

  return null;
}
