import {
  adherenceData,
  appointments,
  bodyMetrics,
  exerciseCategories,
  fitnessActions,
  fitnessSummary,
  habits,
  healthGoals,
  healthSummaries,
  homeFeatures,
  macroNutrients,
  medicalInfo,
  medications,
  nutritionActions,
  nutritionInsights,
  nutritionMeals,
  nutritionSummary,
  profileActions,
  profileSummary,
  recoveryInsights,
  scheduleActions,
  scheduleSummary,
  sleepInsights,
  sleepSchedule,
  timelineEvents,
  vitalMetrics,
  weeklyActivity,
  workoutPlans,
  achievements,
  emergencyContacts,
} from "../../constants/mockData";
import type {
  FitnessData,
  HealthScore,
  HealthServiceResponse,
  MedicationData,
  NutritionData,
  ProfileData,
  ScheduleData,
  SleepData,
  VitalsData,
} from "../../types";
import { calculateHealthScore } from "./healthAggregator";

const createResponse = async <T>(data: T): Promise<HealthServiceResponse<T>> => ({
  data,
  fetchedAt: new Date().toISOString(),
});

export async function fetchNutritionData(): Promise<HealthServiceResponse<NutritionData>> {
  return createResponse({
    summary: nutritionSummary,
    macros: macroNutrients,
    meals: nutritionMeals,
    insights: nutritionInsights,
    actions: nutritionActions,
  });
}

export async function fetchFitnessData(): Promise<HealthServiceResponse<FitnessData>> {
  return createResponse({
    summary: fitnessSummary,
    weeklyActivity,
    workoutPlans,
    exerciseCategories,
    recoveryInsights,
    actions: fitnessActions,
  });
}

export async function fetchSleepData(): Promise<HealthServiceResponse<SleepData>> {
  return createResponse({
    insights: sleepInsights,
    schedule: sleepSchedule,
  });
}

export async function fetchMedicationData(): Promise<HealthServiceResponse<MedicationData>> {
  return createResponse({
    reminders: medications,
    adherence: adherenceData,
  });
}

export async function fetchVitalsData(): Promise<HealthServiceResponse<VitalsData>> {
  return createResponse({
    healthSummaries,
    homeFeatures,
    bodyMetrics,
    vitalMetrics,
    bloodPressurePoints: [88, 100, 92, 106, 97, 112, 100],
    glucosePoints: [20, 34, 22, 58, 28, 52, 29],
    labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  });
}

export async function fetchScheduleData(): Promise<HealthServiceResponse<ScheduleData>> {
  return createResponse({
    summary: scheduleSummary,
    timelineEvents,
    medications,
    appointments,
    habits,
    sleepSchedule,
    adherenceData,
    actions: scheduleActions,
  });
}

export async function fetchProfileData(): Promise<HealthServiceResponse<ProfileData>> {
  return createResponse({
    summary: profileSummary,
    bodyMetrics,
    vitalMetrics,
    healthGoals,
    medicalInfo,
    emergencyContacts,
    achievements,
    actions: profileActions,
  });
}

export async function fetchHealthScore(): Promise<HealthServiceResponse<HealthScore>> {
  const [fitness, nutrition, sleep, schedule, profile] = await Promise.all([
    fetchFitnessData(),
    fetchNutritionData(),
    fetchSleepData(),
    fetchScheduleData(),
    fetchProfileData(),
  ]);

  return createResponse(
    calculateHealthScore({
      fitness: fitness.data,
      nutrition: nutrition.data,
      sleep: sleep.data,
      medication: schedule.data,
      profile: profile.data,
    }),
  );
}
