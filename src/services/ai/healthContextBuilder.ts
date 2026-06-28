import { useHealthStore } from "../../store/healthStore";
import type { AIContext, AIOrchestrationContext } from "../../types";
import { predictionOrchestrator } from "../prediction/PredictionOrchestrator";
import { buildProfile } from "./profile/ProfileBuilder";

const fallbackCurrentHealthData: AIContext["currentHealthData"] = {
  healthScore: 0,
  nutritionScore: 0,
  fitnessScore: 0,
  sleepScore: 0,
  medicationAdherence: 0,
  hydrationGlasses: 0,
  hydrationGoal: 0,
  steps: 0,
  stepGoal: 0,
  weeklyActivityMinutes: 0,
  caloriesBurned: 0,
  activeMinutes: 0,
  stepPercent: 0,
};

const getFallbackContext = (): AIContext => ({
  ...fallbackCurrentHealthData,
  adherenceScore: fallbackCurrentHealthData.medicationAdherence,
  nutritionStatus: "Unavailable",
  fitnessStatus: "Unavailable",
  sleepStatus: "Unavailable",
  medicationAdherenceStatus: "Unavailable",
  hydrationStatus: "Unavailable",
  deviceDataSource: "unavailable",
  deviceDataStatus: "unavailable",
  lastDeviceSyncAt: null,
  currentHealthData: fallbackCurrentHealthData,
  profile: buildProfile(),
  memory: [],
  trends: [],
  insights: [],
  personalizedRecommendations: [],
  predictions: {
    topPredictions: [],
    allPredictions: [],
    insights: [],
    summary: "No predictive wellness signals available.",
    generatedAt: new Date().toISOString(),
    metrics: {
      predictionCount: 0,
      highRiskCount: 0,
      predictionCategories: [],
      averageConfidence: 0,
      dataQualityIssues: 1,
    },
  },
});

const getScoreStatus = (score: number): string => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs attention";

  return "Low";
};

const getHydrationStatus = (glasses: number, goal: number): string => {
  if (goal === 0) return "Unavailable";

  const percent = Math.round((glasses / goal) * 100);

  if (percent >= 100) return "On target";
  if (percent >= 70) return "Near target";

  return "Below target";
};

const getDeviceDataSource = (state: ReturnType<typeof useHealthStore.getState>): AIContext["deviceDataSource"] => {
  if (state.deviceDataSource === "fallback" && state.devices.some((device) => device.provider === "Mock Health")) {
    return "demo";
  }

  return state.deviceDataSource;
};

const getDeviceDataStatus = (
  source: AIContext["deviceDataSource"],
  syncStatus: ReturnType<typeof useHealthStore.getState>["deviceSyncStatus"],
): AIContext["deviceDataStatus"] => {
  if (source === "live") return "connected_live";
  if (source === "cache") return "connected_cached";
  if (source === "no_data") return "connected_no_data";
  if (source === "demo") return "demo";
  if (source === "fallback") return "fallback";
  if (syncStatus === "synced") return "connected_no_data";

  return "unavailable";
};

const calculateAdherenceScore = (): number => {
  const schedule = useHealthStore.getState().schedule;

  if (!schedule) return fallbackCurrentHealthData.medicationAdherence;
  if (schedule.medications.length === 0) return 100;

  const completed = schedule.medications.filter((medication) => medication.status === "completed").length;

  return Math.round((completed / schedule.medications.length) * 100);
};

export function buildHealthContext(orchestration?: Partial<AIOrchestrationContext>): AIContext {
  const state = useHealthStore.getState();
  const fallbackContext = getFallbackContext();
  const nutritionScore = state.nutrition?.summary.score ?? fallbackCurrentHealthData.nutritionScore;
  const fitnessScore = state.fitness?.summary.score ?? fallbackCurrentHealthData.fitnessScore;
  const sleepScore = state.sleep?.schedule.progressPercent ?? fallbackCurrentHealthData.sleepScore;
  const adherenceScore = calculateAdherenceScore();
  const hydrationGlasses = state.nutrition?.summary.waterGlasses ?? fallbackCurrentHealthData.hydrationGlasses;
  const hydrationGoal = state.nutrition?.summary.waterGoal ?? fallbackCurrentHealthData.hydrationGoal;
  const healthScore = state.healthScore?.score ?? fallbackCurrentHealthData.healthScore;
  const steps = state.fitness?.summary.steps ?? fallbackCurrentHealthData.steps;
  const stepGoal = state.fitness?.summary.stepGoal ?? fallbackCurrentHealthData.stepGoal;
  const stepPercent = stepGoal > 0 ? Math.round((steps / stepGoal) * 100) : undefined;
  const weeklyActivityMinutes =
    state.fitness?.summary.weeklyActivityMinutes ?? fallbackCurrentHealthData.weeklyActivityMinutes;
  const caloriesBurned = state.fitness?.summary.caloriesBurned ?? fallbackCurrentHealthData.caloriesBurned;
  const activeMinutes = state.fitness?.weeklyActivity.at(-1)?.minutes ?? weeklyActivityMinutes;
  const heartRateValue = state.vitals?.vitalMetrics.find((metric) => metric.id === "heart-rate")?.value;
  const parsedHeartRate = Number.parseFloat(heartRateValue ?? "");
  const heartRateBpm = Number.isFinite(parsedHeartRate) ? parsedHeartRate : undefined;
  const sleepMinutes = state.sleep?.schedule.plannedHours
    ? Math.round(state.sleep.schedule.plannedHours * 60)
    : undefined;
  const sleepQuality = getScoreStatus(sleepScore);
  const deviceDataSource = getDeviceDataSource(state);
  const deviceDataStatus = getDeviceDataStatus(deviceDataSource, state.deviceSyncStatus);
  const devicePermissionStatus = deviceDataSource === "live" || deviceDataSource === "no_data"
    ? "granted"
    : deviceDataSource === "unavailable"
      ? "unknown"
      : undefined;
  const currentHealthData: AIContext["currentHealthData"] = {
    healthScore,
    nutritionScore,
    fitnessScore,
    sleepScore,
    medicationAdherence: adherenceScore,
    hydrationGlasses,
    hydrationGoal,
    steps,
    stepGoal,
    weeklyActivityMinutes,
    heartRateBpm,
    sleepMinutes,
    caloriesBurned,
    activeMinutes,
    sleepQuality,
    stepPercent,
  };

  const baseContext: AIContext = {
    healthScore,
    nutritionScore,
    fitnessScore,
    sleepScore,
    adherenceScore,
    nutritionStatus: state.nutrition?.summary.scoreLabel ?? getScoreStatus(nutritionScore),
    fitnessStatus: state.fitness?.summary.scoreLabel ?? getScoreStatus(fitnessScore),
    sleepStatus: getScoreStatus(sleepScore),
    medicationAdherenceStatus: getScoreStatus(adherenceScore),
    hydrationStatus: getHydrationStatus(hydrationGlasses, hydrationGoal),
    hydrationGlasses,
    hydrationGoal,
    steps,
    stepGoal,
    weeklyActivityMinutes,
    heartRateBpm,
    sleepMinutes,
    caloriesBurned,
    activeMinutes,
    sleepQuality,
    stepPercent,
    deviceDataSource,
    deviceDataStatus,
    devicePermissionStatus,
    lastDeviceSyncAt: state.lastHealthSyncAt,
    currentHealthData,
    profile: orchestration?.profile ?? fallbackContext.profile,
    memory: orchestration?.memories ?? fallbackContext.memory,
    trends: orchestration?.trends ?? fallbackContext.trends,
    insights: orchestration?.insights ?? fallbackContext.insights,
    personalizedRecommendations: orchestration?.recommendations ?? fallbackContext.personalizedRecommendations,
    predictions: fallbackContext.predictions,
  };

  return {
    ...baseContext,
    predictions: predictionOrchestrator.run(baseContext),
  };
}
