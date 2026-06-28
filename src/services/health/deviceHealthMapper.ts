import type {
  FitnessData,
  HealthScore,
  NutritionData,
  ProfileData,
  ScheduleData,
  SleepData,
  VitalsData,
} from "../../types";
import type { DeviceHealthMetrics } from "../device/providers/DeviceProvider";
import { calculateHealthScore } from "./healthAggregator";

type HealthDataForDeviceMerge = {
  fitness: FitnessData;
  nutrition: NutritionData;
  sleep: SleepData;
  schedule: ScheduleData;
  profile: ProfileData;
  vitals: VitalsData;
};

type DeviceMergedHealthData = HealthDataForDeviceMerge & {
  healthScore: HealthScore;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const formatNumber = (value: number): string => value.toLocaleString("en-US");

const getScoreLabel = (score: number): FitnessData["summary"]["scoreLabel"] => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";

  return "Needs Improvement";
};

const getBmiStatus = (bmi: number): string => {
  if (bmi < 18.5) return "Low Weight";
  if (bmi < 25) return "Healthy Weight";
  if (bmi < 30) return "Above Healthy Range";

  return "High Range";
};

const parseHeightCm = (height: string): number | undefined => {
  const parsed = Number.parseFloat(height);

  return Number.isFinite(parsed) ? parsed : undefined;
};

const updateWeeklyActivity = (
  weeklyActivity: FitnessData["weeklyActivity"],
  exerciseMinutes: number | undefined,
): FitnessData["weeklyActivity"] => {
  if (typeof exerciseMinutes !== "number" || weeklyActivity.length === 0) return weeklyActivity;

  return weeklyActivity.map((point, index) =>
    index === weeklyActivity.length - 1 ? { ...point, minutes: exerciseMinutes } : point,
  );
};

export function applyDeviceMetricsToHealthData(
  data: HealthDataForDeviceMerge,
  metrics: DeviceHealthMetrics | null,
): DeviceMergedHealthData {
  if (!metrics) {
    return {
      ...data,
      healthScore: calculateHealthScore({
        fitness: data.fitness,
        nutrition: data.nutrition,
        sleep: data.sleep,
        medication: data.schedule,
        profile: data.profile,
      }),
    };
  }

  const steps = metrics.steps ?? data.fitness.summary.steps;
  const stepGoal = data.fitness.summary.stepGoal;
  const stepProgress = stepGoal === 0 ? 0 : clamp(Math.round((steps / stepGoal) * 100), 0, 100);
  const caloriesBurned = metrics.caloriesKcal ?? data.fitness.summary.caloriesBurned;
  const caloriesRemaining = Math.max(0, data.fitness.summary.calorieGoal - caloriesBurned);
  const exerciseMinutes = metrics.exerciseMinutes ?? data.fitness.weeklyActivity.at(-1)?.minutes;
  const weeklyActivity = updateWeeklyActivity(data.fitness.weeklyActivity, exerciseMinutes);
  const weeklyActivityMinutes = weeklyActivity.reduce((sum, point) => sum + point.minutes, 0);
  const workoutProgress = clamp(Math.round(((exerciseMinutes ?? 0) / 45) * 100), 0, 100);
  const fitnessScore = Math.round(
    stepProgress * 0.45 +
      clamp(Math.round((weeklyActivityMinutes / 420) * 100), 0, 100) * 0.35 +
      clamp(Math.round((caloriesBurned / data.fitness.summary.calorieGoal) * 100), 0, 100) * 0.2,
  );
  const weightKg = metrics.weightKg ?? Number.parseFloat(data.fitness.summary.weight);
  const heightCm = parseHeightCm(data.fitness.summary.height);
  const bmi = heightCm && Number.isFinite(weightKg)
    ? Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10
    : data.fitness.summary.bmi;
  const hydrationGlasses = metrics.hydrationMl
    ? Math.round(metrics.hydrationMl / 250)
    : data.nutrition.summary.waterGlasses;
  const waterGoal = data.nutrition.summary.waterGoal;
  const sleepHours = metrics.sleepMinutes ? Math.round((metrics.sleepMinutes / 60) * 10) / 10 : data.sleep.schedule.plannedHours;
  const sleepProgress = clamp(Math.round((sleepHours / data.sleep.schedule.goalHours) * 100), 0, 100);

  const fitness: FitnessData = {
    ...data.fitness,
    summary: {
      ...data.fitness.summary,
      score: fitnessScore,
      scoreLabel: getScoreLabel(fitnessScore),
      weeklyActivityMinutes,
      weeklyTrend: metrics.source === "live" ? `Updated from ${metrics.providerName}` : data.fitness.summary.weeklyTrend,
      caloriesBurned,
      caloriesRemaining,
      workoutProgress,
      height: data.fitness.summary.height,
      weight: `${Math.round(weightKg * 10) / 10} kg`,
      bmi,
      bmiStatus: getBmiStatus(bmi),
      steps,
      stepProgress,
    },
    weeklyActivity,
    recoveryInsights: data.fitness.recoveryInsights.map((insight) =>
      insight.id === "heart-rate"
        ? {
            ...insight,
            status: metrics.heartRateBpm ? `${metrics.heartRateBpm} bpm` : insight.status,
            detail: metrics.heartRateBpm
              ? "Updated from connected device heart rate data."
              : insight.detail,
          }
        : insight,
    ),
  };
  const nutrition: NutritionData = {
    ...data.nutrition,
    summary: {
      ...data.nutrition.summary,
      waterGlasses: hydrationGlasses,
      waterGoalAchieved: hydrationGlasses >= waterGoal,
    },
  };
  const sleep: SleepData = {
    ...data.sleep,
    schedule: {
      ...data.sleep.schedule,
      plannedHours: sleepHours,
      progressPercent: sleepProgress,
    },
  };
  const schedule: ScheduleData = {
    ...data.schedule,
    summary: {
      ...data.schedule.summary,
      waterGlasses: hydrationGlasses,
    },
    sleepSchedule: sleep.schedule,
  };
  const profile: ProfileData = {
    ...data.profile,
    bodyMetrics: data.profile.bodyMetrics.map((metric) => {
      if (metric.id === "weight") {
        return { ...metric, value: `${Math.round(weightKg * 10) / 10} kg`, subtitle: `Synced ${metrics.source}` };
      }

      if (metric.id === "bmi") {
        return { ...metric, value: `${bmi}`, subtitle: getBmiStatus(bmi) };
      }

      return metric;
    }),
    vitalMetrics: data.profile.vitalMetrics.map((metric) =>
      metric.id === "heart-rate" && metrics.heartRateBpm
        ? { ...metric, value: `${metrics.heartRateBpm} bpm`, subtitle: "Synced from device" }
        : metric,
    ),
    healthGoals: data.profile.healthGoals.map((goal) => {
      if (goal.id === "daily-steps") {
        return { ...goal, current: steps };
      }

      if (goal.id === "water-intake") {
        return { ...goal, current: Math.round((hydrationGlasses * 0.25) * 10) / 10 };
      }

      if (goal.id === "sleep-goal") {
        return { ...goal, current: sleepHours };
      }

      return goal;
    }),
  };
  const vitals: VitalsData = {
    ...data.vitals,
    healthSummaries: data.vitals.healthSummaries.map((summary) => {
      if (summary.id === "steps") {
        return { ...summary, value: formatNumber(steps), suffix: `/${formatNumber(stepGoal)}` };
      }

      if (summary.id === "calories") {
        return { ...summary, value: formatNumber(caloriesBurned) };
      }

      return summary;
    }),
    bodyMetrics: profile.bodyMetrics,
    vitalMetrics: data.vitals.vitalMetrics.map((metric) =>
      metric.id === "heart-rate" && metrics.heartRateBpm
        ? { ...metric, value: `${metrics.heartRateBpm} bpm`, subtitle: "Synced from device" }
        : metric,
    ),
  };

  return {
    fitness,
    nutrition,
    sleep,
    schedule,
    profile,
    vitals,
    healthScore: calculateHealthScore({
      fitness,
      nutrition,
      sleep,
      medication: schedule,
      profile,
    }),
  };
}
