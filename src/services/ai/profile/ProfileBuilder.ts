import { useHealthStore } from "../../../store/healthStore";
import type { BodyMetric, HealthGoal, MedicalInfo } from "../../../types";
import type { PartialPersonalHealthProfile, PersonalHealthProfile } from "../types";
import { calculateProfileCompletenessScore } from "./ProfileScoring";

const emptyProfile = (): Omit<PersonalHealthProfile, "profileCompletenessScore"> => ({
  demographics: {},
  bodyMetrics: {},
  goals: [],
  dietaryPreferences: [],
  allergies: [],
  chronicConditions: [],
  updatedAt: new Date().toISOString(),
  source: "store",
});

const parseNumber = (value: string | undefined): number | undefined => {
  if (!value) return undefined;

  const parsed = Number.parseFloat(value.replace(/,/g, ""));

  return Number.isFinite(parsed) ? parsed : undefined;
};

const findBodyMetric = (metrics: BodyMetric[], id: string): number | undefined =>
  parseNumber(metrics.find((metric) => metric.id === id)?.value);

const getMedicalValue = (medicalInfo: MedicalInfo[], id: string): string | undefined => {
  const value = medicalInfo.find((item) => item.id === id)?.value.trim();

  if (!value || value.toLowerCase() === "none") return undefined;

  return value;
};

const splitMedicalList = (value: string | undefined): string[] =>
  value
    ? value
        .split(/,|;/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

const getGoals = (goals: HealthGoal[]): string[] =>
  goals.map((goal) => `${goal.title}: ${goal.current}/${goal.target} ${goal.unit}`);

const dedupe = (items: string[]): string[] => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

export function mergeProfileData(
  baseProfile: PersonalHealthProfile,
  updates: PartialPersonalHealthProfile,
): PersonalHealthProfile {
  const mergedWithoutScore: Omit<PersonalHealthProfile, "profileCompletenessScore"> = {
    demographics: {
      ...baseProfile.demographics,
      ...updates.demographics,
    },
    bodyMetrics: {
      ...baseProfile.bodyMetrics,
      ...updates.bodyMetrics,
    },
    goals: dedupe([...(baseProfile.goals ?? []), ...(updates.goals ?? [])]),
    dietaryPreferences: dedupe([
      ...(baseProfile.dietaryPreferences ?? []),
      ...(updates.dietaryPreferences ?? []),
    ]),
    allergies: dedupe([...(baseProfile.allergies ?? []), ...(updates.allergies ?? [])]),
    chronicConditions: dedupe([
      ...(baseProfile.chronicConditions ?? []),
      ...(updates.chronicConditions ?? []),
    ]),
    medications: updates.medications ?? baseProfile.medications,
    preferences: updates.preferences ?? baseProfile.preferences,
    activityLevel: updates.activityLevel ?? baseProfile.activityLevel,
    averageSleepHours: updates.averageSleepHours ?? baseProfile.averageSleepHours,
    medicationAdherence: updates.medicationAdherence ?? baseProfile.medicationAdherence,
    wearableMetadata: updates.wearableMetadata ?? baseProfile.wearableMetadata,
    activityProfile: {
      ...baseProfile.activityProfile,
      ...updates.activityProfile,
    },
    restProfile: {
      ...baseProfile.restProfile,
      ...updates.restProfile,
    },
    recoveryProfile: {
      ...baseProfile.recoveryProfile,
      ...updates.recoveryProfile,
    },
    updatedAt: new Date().toISOString(),
    source: updates.source ?? baseProfile.source,
  };

  return {
    ...mergedWithoutScore,
    profileCompletenessScore: calculateProfileCompletenessScore(mergedWithoutScore),
  };
}

export function buildProfile(): PersonalHealthProfile {
  const state = useHealthStore.getState();
  const base = emptyProfile();
  const medications = state.schedule?.medications ?? [];
  const completedMedications = medications.filter((medication) => medication.status === "completed").length;
  const medicationAdherence = medications.length === 0
    ? undefined
    : Math.round((completedMedications / medications.length) * 100);
  const connectedDevices = state.devices.filter((device) => device.status === "Connected");
  const primaryDevice = connectedDevices[0] ?? state.devices[0];
  const heartRate = parseNumber(
    state.vitals?.vitalMetrics.find((metric) => metric.id === "heart-rate")?.value,
  );
  const latestExerciseMinutes = state.fitness?.weeklyActivity[state.fitness.weeklyActivity.length - 1]?.minutes;

  const profileWithoutScore: Omit<PersonalHealthProfile, "profileCompletenessScore"> = {
    ...base,
    demographics: {
      age: state.profile?.summary.age,
      gender: state.profile?.summary.gender,
    },
    bodyMetrics: {
      height: findBodyMetric(state.profile?.bodyMetrics ?? [], "height") ?? parseNumber(state.fitness?.summary.height),
      weight: findBodyMetric(state.profile?.bodyMetrics ?? [], "weight") ?? parseNumber(state.fitness?.summary.weight),
      bmi: findBodyMetric(state.profile?.bodyMetrics ?? [], "bmi") ?? state.fitness?.summary.bmi,
    },
    goals: getGoals(state.profile?.healthGoals ?? []),
    allergies: splitMedicalList(getMedicalValue(state.profile?.medicalInfo ?? [], "allergies")),
    chronicConditions: splitMedicalList(getMedicalValue(state.profile?.medicalInfo ?? [], "conditions")),
    activityLevel: state.fitness?.summary.scoreLabel,
    averageSleepHours: state.sleep?.schedule.plannedHours,
    medicationAdherence,
    wearableMetadata: {
      primaryProvider: primaryDevice?.provider,
      connectedDeviceCount: connectedDevices.length,
      capabilities: primaryDevice
        ? ["steps", "distance", "calories", "heartRate", "sleep", "weight", "hydration", "exercise"]
        : [],
      lastSyncedAt: state.lastHealthSyncAt,
      syncStatus: state.deviceSyncStatus,
    },
    activityProfile: {
      dailySteps: state.fitness?.summary.steps,
      stepGoal: state.fitness?.summary.stepGoal,
      weeklyActivityMinutes: state.fitness?.summary.weeklyActivityMinutes,
      exerciseMinutes: latestExerciseMinutes,
      caloriesBurned: state.fitness?.summary.caloriesBurned,
    },
    restProfile: {
      sleepMinutes: state.sleep?.schedule.plannedHours
        ? Math.round(state.sleep.schedule.plannedHours * 60)
        : undefined,
      sleepScore: state.sleep?.schedule.progressPercent,
      plannedSleepHours: state.sleep?.schedule.plannedHours,
    },
    recoveryProfile: {
      heartRateBpm: heartRate,
      recoveryStatus: state.fitness?.recoveryInsights[0]?.status,
    },
  };

  return {
    ...profileWithoutScore,
    profileCompletenessScore: calculateProfileCompletenessScore(profileWithoutScore),
  };
}

export function updateProfile(updates: PartialPersonalHealthProfile): PersonalHealthProfile {
  return mergeProfileData(buildProfile(), updates);
}
