import type {
  FitnessData,
  HealthScore,
  HealthScoreStatus,
  NutritionData,
  ProfileData,
  ScheduleData,
  SleepData,
} from "../../types";

type AggregateHealthInput = {
  fitness: FitnessData;
  nutrition: NutritionData;
  sleep: SleepData;
  medication: ScheduleData;
  profile: ProfileData;
};

const getStatus = (score: number): HealthScoreStatus => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Needs Improvement";
};

const getSleepScore = (sleep: SleepData): number => sleep.schedule.progressPercent;

const getMedicationAdherence = (schedule: ScheduleData): number => {
  const completed = schedule.medications.filter((medication) => medication.status === "completed").length;

  if (schedule.medications.length === 0) return 100;

  return Math.round((completed / schedule.medications.length) * 100);
};

const getProfileCompletion = (profile: ProfileData): number => {
  const sections = [
    profile.summary.name,
    profile.bodyMetrics.length > 0,
    profile.vitalMetrics.length > 0,
    profile.healthGoals.length > 0,
    profile.medicalInfo.length > 0,
    profile.emergencyContacts.length > 0,
  ];
  const completedSections = sections.filter(Boolean).length;

  return Math.round((completedSections / sections.length) * 100);
};

export function calculateHealthScore(input: AggregateHealthInput): HealthScore {
  const score = Math.round(
    input.fitness.summary.score * 0.4 +
      input.nutrition.summary.score * 0.25 +
      getSleepScore(input.sleep) * 0.2 +
      getMedicationAdherence(input.medication) * 0.1 +
      getProfileCompletion(input.profile) * 0.05,
  );

  return {
    score,
    status: getStatus(score),
    change: "+4%",
  };
}
