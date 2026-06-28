import type { PersonalHealthProfile } from "../types";

const hasText = (value: string | undefined): boolean => Boolean(value && value.trim().length > 0);
const hasNumber = (value: number | undefined): boolean => typeof value === "number" && Number.isFinite(value);

export function calculateProfileCompletenessScore(profile: Omit<PersonalHealthProfile, "profileCompletenessScore">): number {
  const checks = [
    hasNumber(profile.demographics.age),
    hasText(profile.demographics.gender),
    hasNumber(profile.bodyMetrics.height),
    hasNumber(profile.bodyMetrics.weight),
    hasNumber(profile.bodyMetrics.bmi),
    profile.goals.length > 0,
    profile.dietaryPreferences.length > 0,
    profile.allergies.length > 0,
    profile.chronicConditions.length > 0,
    hasText(profile.activityLevel),
    hasNumber(profile.averageSleepHours),
    hasNumber(profile.medicationAdherence),
    Boolean(profile.wearableMetadata?.primaryProvider),
    hasNumber(profile.activityProfile?.dailySteps),
    hasNumber(profile.restProfile?.sleepMinutes),
    hasNumber(profile.recoveryProfile?.heartRateBpm),
  ];

  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}
