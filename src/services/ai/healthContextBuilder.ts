import { useHealthStore } from "../../store/healthStore";
import type { AIContext, AIOrchestrationContext } from "../../types";
import { dailyHealthBriefingEngine } from "../briefing/DailyHealthBriefingEngine";
import { goalHabitCoachingEngine } from "../coaching/GoalHabitCoachingEngine";
import { aiInsightEngine } from "../insights/AIInsightEngine";
import { predictionOrchestrator } from "../prediction/PredictionOrchestrator";
import { trendIntelligenceEngine } from "../prediction/TrendIntelligenceEngine";
import { preventiveHealthEngine } from "../prevention/PreventiveHealthEngine";
import { buildUserIntelligenceProfile } from "./personalization/PersonalizationEngine";
import { buildProfile } from "./profile/ProfileBuilder";
import { recommendationDecisionOrchestrator } from "./recommendation/RecommendationDecisionOrchestrator";

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

const emptyPredictions = (): AIContext["predictions"] => ({
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
});

const emptyAIInsights = (): AIContext["aiInsights"] => ({
  generatedAt: new Date().toISOString(),
  source: "local",
  topInsights: [],
  allInsights: [],
  compactSummary: [],
  confidence: "low",
  dataQuality: "insufficient",
});

const emptyDailyBriefing = (): AIContext["dailyBriefing"] => ({
  id: "daily-briefing-unavailable",
  date: new Date().toISOString().slice(0, 10),
  title: "Daily health briefing",
  greeting: "Today's briefing.",
  summary: "Not enough local health context is available yet. Refresh Health Connect or add recent summaries to improve this briefing.",
  recommendedActions: ["Refresh Health Connect when available."],
  dataSourceNote: "This briefing uses the latest local Healthy You context available.",
  confidence: "low",
  safetyLevel: "normal",
  generatedAt: new Date().toISOString(),
});

const emptyRecommendationDecision = (): AIContext["recommendationDecision"] => {
  const generatedAt = new Date().toISOString();
  const primary = {
    id: "recommendation-fallback-unavailable",
    title: "Refresh health context",
    summary: "Not enough local context is available for a ranked recommendation yet.",
    category: "general_wellness" as const,
    source: "fallback" as const,
    supportingSources: ["fallback" as const],
    priority: "low" as const,
    confidence: "low" as const,
    action: "Refresh Health Connect or add recent summaries when available.",
    reason: "Recommendation decision is waiting for fresh local health context.",
    safetyLevel: "normal" as const,
    dedupeKey: "general_wellness:refresh health context",
    createdAt: generatedAt,
  };

  return {
    id: "recommendation-decision-unavailable",
    primary,
    alternatives: [],
    suppressed: [],
    rankingReason: "No ranked recommendation could be generated from the current local context.",
    confidence: "low",
    generatedAt,
  };
};

const emptyPreventiveSummary = (): AIContext["preventiveSummary"] => ({
  generatedAt: new Date().toISOString(),
  overallRisk: "low",
  focus: "none",
  confidence: "low",
  topActions: [],
  risks: [],
  compactSummary: [
    "Overall Wellness Risk: low",
    "Primary Risk: No strong preventive wellness risk",
    "Confidence: low",
    "Suggested Focus: General wellness",
  ],
  safetyLevel: "normal",
});

const getFallbackContext = (): AIContext => {
  const profile = buildProfile();
  const baseContext = {
    ...fallbackCurrentHealthData,
    adherenceScore: fallbackCurrentHealthData.medicationAdherence,
    nutritionStatus: "Unavailable",
    fitnessStatus: "Unavailable",
    sleepStatus: "Unavailable",
    medicationAdherenceStatus: "Unavailable",
    hydrationStatus: "Unavailable",
    deviceDataSource: "unavailable" as const,
    deviceDataStatus: "unavailable" as const,
    lastDeviceSyncAt: null,
    currentHealthData: fallbackCurrentHealthData,
    profile,
    memory: [],
    trends: [],
    insights: [],
    personalizedRecommendations: [],
  };

  const intelligenceProfile = buildUserIntelligenceProfile({
    profile,
    context: baseContext,
    memories: [],
  });
  const trendIntelligence = trendIntelligenceEngine.analyze({
    summaries: [],
    context: baseContext,
    intelligenceProfile,
  });
  const goalHabitCoaching = goalHabitCoachingEngine.generate({
    summaries: [],
    context: baseContext,
    trendIntelligence,
    intelligenceProfile,
    memories: [],
  });
  const predictions = emptyPredictions();
  const aiInsights = aiInsightEngine.generate({
    summaries: [],
    context: baseContext,
    trendIntelligence,
    goalHabitCoaching,
    predictions,
    intelligenceProfile,
    memories: [],
  });
  const preventiveSummary = preventiveHealthEngine.generate({
    summaries: [],
    context: baseContext,
    trendIntelligence,
    goalHabitCoaching,
    aiInsights,
    predictions,
    intelligenceProfile,
  });
  const dailyBriefing = dailyHealthBriefingEngine.generate({
    summaries: [],
    context: baseContext,
    trendIntelligence,
    goalHabitCoaching,
    aiInsights,
    predictions,
    intelligenceProfile,
    preventiveSummary,
    memories: [],
  });
  const recommendationDecision = recommendationDecisionOrchestrator.generate({
    context: {
      ...baseContext,
      intelligenceProfile,
      trendIntelligence,
      goalHabitCoaching,
      aiInsights,
      dailyBriefing,
      recommendationDecision: emptyRecommendationDecision(),
      preventiveSummary,
      predictions,
    },
  });
  const finalPreventiveSummary = preventiveHealthEngine.generate({
    summaries: [],
    context: baseContext,
    trendIntelligence,
    goalHabitCoaching,
    aiInsights,
    predictions,
    intelligenceProfile,
    dailyBriefing,
    recommendationDecision,
  });

  return {
    ...baseContext,
    intelligenceProfile,
    trendIntelligence,
    goalHabitCoaching,
    aiInsights,
    dailyBriefing,
    recommendationDecision,
    preventiveSummary: finalPreventiveSummary,
    predictions,
  };
};

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
  const devicePermissionStatus: AIContext["devicePermissionStatus"] =
    deviceDataSource === "live" || deviceDataSource === "no_data"
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

  const baseContextWithoutIntelligence = {
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
  };
  const intelligenceProfile = buildUserIntelligenceProfile({
    profile: baseContextWithoutIntelligence.profile,
    context: baseContextWithoutIntelligence,
    memories: baseContextWithoutIntelligence.memory,
    conversation: orchestration?.conversation,
  });
  const summaries = state.healthSummaries.length > 0
    ? state.healthSummaries
    : state.latestHealthSummary
      ? [state.latestHealthSummary]
      : [];
  const trendIntelligence = trendIntelligenceEngine.analyze({
    summaries,
    context: baseContextWithoutIntelligence,
    intelligenceProfile,
  });
  const goalHabitCoaching = goalHabitCoachingEngine.generate({
    summaries,
    context: baseContextWithoutIntelligence,
    trendIntelligence,
    intelligenceProfile,
    memories: baseContextWithoutIntelligence.memory,
  });
  const baseContext: AIContext = {
    ...baseContextWithoutIntelligence,
    intelligenceProfile,
    trendIntelligence,
    goalHabitCoaching,
    aiInsights: fallbackContext.aiInsights ?? emptyAIInsights(),
    dailyBriefing: fallbackContext.dailyBriefing ?? emptyDailyBriefing(),
    recommendationDecision: fallbackContext.recommendationDecision ?? emptyRecommendationDecision(),
    preventiveSummary: fallbackContext.preventiveSummary ?? emptyPreventiveSummary(),
    predictions: fallbackContext.predictions,
  };
  const predictions = predictionOrchestrator.run(baseContext);
  const aiInsights = aiInsightEngine.generate({
    summaries,
    context: baseContext,
    trendIntelligence,
    goalHabitCoaching,
    predictions,
    intelligenceProfile,
    memories: baseContext.memory,
  });
  const preventiveSummaryForBriefing = preventiveHealthEngine.generate({
    summaries,
    context: baseContext,
    trendIntelligence,
    goalHabitCoaching,
    aiInsights,
    predictions,
    intelligenceProfile,
  });
  const dailyBriefing = dailyHealthBriefingEngine.generate({
    summaries,
    context: baseContext,
    trendIntelligence,
    goalHabitCoaching,
    aiInsights,
    predictions,
    intelligenceProfile,
    preventiveSummary: preventiveSummaryForBriefing,
    memories: baseContext.memory,
  });
  const contextBeforeDecision: AIContext = {
    ...baseContext,
    predictions,
    aiInsights,
    dailyBriefing,
    preventiveSummary: preventiveSummaryForBriefing,
  };
  const recommendationDecision = recommendationDecisionOrchestrator.generate({
    context: contextBeforeDecision,
  });
  const preventiveSummary = preventiveHealthEngine.generate({
    summaries,
    context: contextBeforeDecision,
    trendIntelligence,
    goalHabitCoaching,
    aiInsights,
    predictions,
    intelligenceProfile,
    dailyBriefing,
    recommendationDecision,
  });

  return {
    ...baseContext,
    predictions,
    aiInsights,
    dailyBriefing,
    recommendationDecision,
    preventiveSummary,
  };
}
