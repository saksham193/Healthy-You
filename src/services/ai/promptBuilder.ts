import type { AIContext, AIRequest } from "../../types";
import { getIntentDomain } from "./intentClassifier";

export const MEDIBOT_SYSTEM_PROMPT = [
  "You are Medibot, a health and wellness assistant inside Healthy You.",
  "Give concise, medically safe, educational wellness guidance only.",
  "Do not diagnose conditions, claim treatment outcomes, prescribe medication, or replace professional medical advice.",
  "For urgent symptoms, self-harm, medication dosage, or diagnosis requests, direct the user to appropriate professional or emergency support.",
].join(" ");

const compactList = (items: string[], limit: number): string =>
  items.slice(0, limit).join("; ") || "None recorded";

const compactProfile = (context: AIContext): string =>
  [
    `Age: ${context.profile.demographics.age ?? "unknown"}`,
    `Goals: ${compactList(context.profile.goals, 3)}`,
    `Preferences: ${compactList(context.profile.dietaryPreferences, 3)}`,
    `Allergies: ${compactList(context.profile.allergies, 3)}`,
    `Conditions: ${compactList(context.profile.chronicConditions, 3)}`,
    `Activity: ${context.profile.activityLevel ?? "unknown"}`,
  ].join(" | ");

const compactMemory = (context: AIContext): string =>
  context.memory
    .slice(0, 5)
    .map((memory) => `${memory.category}: ${memory.value}`)
    .join("; ") || "None relevant";

const compactTrends = (context: AIContext): string =>
  context.trends
    .slice(0, 5)
    .map((trend) => `${trend.metric} ${trend.direction} (${trend.percentageChange}%, latest ${trend.latestValue})`)
    .join("; ") || "No trend signals";

const compactInsights = (context: AIContext): string =>
  context.insights
    .slice(0, 4)
    .map((insight) => `${insight.priority}: ${insight.message}`)
    .join("; ") || "No recent insights";

const compactRecommendations = (context: AIContext): string =>
  context.personalizedRecommendations
    .slice(0, 4)
    .map((recommendation) => `${recommendation.priority}: ${recommendation.message}`)
    .join("; ") || "No personalized recommendations";

const compactPredictions = (context: AIContext): string =>
  context.predictions.topPredictions
    .slice(0, 3)
    .map((prediction) =>
      `${prediction.category}: ${prediction.riskLevel} risk, ${prediction.confidence} confidence, ${prediction.horizon}; ${prediction.explanation.summary}`,
    )
    .join("; ") || "No predictive wellness signals";

const compactRelevantDeviceData = (message: string, context: AIContext): string => {
  const normalized = message.toLowerCase();
  const rows = [
    `Device Source: ${context.deviceDataSource}`,
    `Device Status: ${context.deviceDataStatus}`,
    `Last Device Sync: ${context.lastDeviceSyncAt ?? "never"}`,
  ];

  if (/\bstep|walk|activity|fitness|progress\b/.test(normalized)) {
    rows.push(`Steps Today: ${context.steps}/${context.stepGoal} (${context.stepPercent ?? 0}%)`);
    rows.push(`Active Minutes: ${context.activeMinutes ?? context.weeklyActivityMinutes}`);
  }

  if (/\bheart|pulse\b/.test(normalized)) {
    rows.push(`Heart Rate Latest/Average: ${context.heartRateBpm ? `${context.heartRateBpm} bpm` : "unavailable"}`);
  }

  if (/\bsleep|slept|tired|fatigue|rest\b/.test(normalized)) {
    rows.push(`Synced Sleep Minutes: ${context.sleepMinutes ?? "unavailable"}`);
    rows.push(`Sleep Quality: ${context.sleepQuality ?? context.sleepStatus}`);
  }

  if (/\bcalorie|burn\b/.test(normalized)) {
    rows.push(`Calories Burned: ${context.caloriesBurned ?? "unavailable"}`);
  }

  if (/\bhydration|water|drink\b/.test(normalized)) {
    rows.push(`Hydration: ${context.hydrationGlasses}/${context.hydrationGoal} glasses (${context.hydrationStatus})`);
  }

  return rows.join("\n");
};

const basePrompt = (label: string, message: string, context: AIContext): string =>
  [
    MEDIBOT_SYSTEM_PROMPT,
    "Answer the current user message first. If the user reports a value that conflicts with synced device data, acknowledge the user-reported value before explaining the device mismatch.",
    "Use directly relevant live device data before profile, trends, predictions, or general knowledge. Prefer short, actionable guidance and avoid repeating every data point.",
    "",
    `Focus: ${label}`,
    `Current User Message: ${message}`,
    "",
    "Directly Relevant Device Data:",
    compactRelevantDeviceData(message, context),
    "",
    "Health Snapshot:",
    `Health Score: ${context.healthScore}`,
    `Nutrition Status: ${context.nutritionStatus} (${context.nutritionScore})`,
    `Fitness Status: ${context.fitnessStatus} (${context.fitnessScore})`,
    `Sleep Status: ${context.sleepStatus} (${context.sleepScore})`,
    `Medication Adherence: ${context.medicationAdherenceStatus} (${context.adherenceScore})`,
    `Hydration Status: ${context.hydrationStatus} (${context.hydrationGlasses}/${context.hydrationGoal} glasses)`,
    `Steps: ${context.steps}/${context.stepGoal} (${context.stepPercent ?? 0}%)`,
    `Weekly Activity Minutes: ${context.weeklyActivityMinutes}; Active Minutes: ${context.activeMinutes ?? "unavailable"}`,
    `Calories Burned: ${context.caloriesBurned ?? "unavailable"}`,
    `Heart Rate: ${context.heartRateBpm ? `${context.heartRateBpm} bpm` : "unavailable"}`,
    `Sleep Minutes: ${context.sleepMinutes ?? "unavailable"}; Sleep Quality: ${context.sleepQuality ?? "unavailable"}`,
    `Device Source: ${context.deviceDataSource}; Device Status: ${context.deviceDataStatus}; Last Device Sync: ${context.lastDeviceSyncAt ?? "never"}`,
    "",
    "Personal Context:",
    compactProfile(context),
    `Memory: ${compactMemory(context)}`,
    `Trends: ${compactTrends(context)}`,
    `Recent Insights: ${compactInsights(context)}`,
    `Personalized Recommendations: ${compactRecommendations(context)}`,
    `Predictive Wellness Signals: ${compactPredictions(context)}`,
    "Prediction Safety: Treat predictions as wellness trend signals, not diagnosis, certainty, or treatment instructions.",
    "",
    `Question: ${message}`,
  ].join("\n");

export function buildNutritionPrompt(message: string, context: AIContext): string {
  return basePrompt("Nutrition", message, context);
}

export function buildFitnessPrompt(message: string, context: AIContext): string {
  return basePrompt("Fitness", message, context);
}

export function buildSleepPrompt(message: string, context: AIContext): string {
  return basePrompt("Sleep", message, context);
}

export function buildMedicationPrompt(message: string, context: AIContext): string {
  return basePrompt("Medication", message, context);
}

export function buildGeneralPrompt(message: string, context: AIContext): string {
  return basePrompt("General Health", message, context);
}

export function buildPrompt(request: AIRequest): string {
  const domain = getIntentDomain(request.intent);

  if (domain === "nutrition" || domain === "hydration") {
    return buildNutritionPrompt(request.message, request.context);
  }

  if (domain === "fitness") {
    return buildFitnessPrompt(request.message, request.context);
  }

  if (domain === "sleep") {
    return buildSleepPrompt(request.message, request.context);
  }

  if (domain === "medication") {
    return buildMedicationPrompt(request.message, request.context);
  }

  return buildGeneralPrompt(request.message, request.context);
}
