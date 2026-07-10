import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PersonalHealthProfile } from "../../types";
import { fetchProfile, syncProfile } from "../api/ProfileApi";
import { connectivityService } from "../connectivity/ConnectivityService";
import { getStoredTokens } from "../secure/TokenStorage";
import { isCloudSyncEnabled } from "../sync/syncFeatureFlags";

const LOCAL_PROFILE_KEY = "healthy-you.profile.local";
const PROFILE_QUEUE_KEY = "healthy-you.profile.sync-queue";
const QUEUE_LIMIT = 10;

export type QueuedProfileUpdate = {
  profile: PersonalHealthProfile;
  updatedAt: string;
  attemptCount: number;
  queuedAt: string;
};

export type ProfileSyncOutcome =
  | { status: "synced"; profile: PersonalHealthProfile; queuedCount: number }
  | { status: "pending" | "offline"; profile: PersonalHealthProfile | null; queuedCount: number; error?: string }
  | { status: "skipped"; profile: PersonalHealthProfile | null; queuedCount: number; reason: "unauthenticated" | "cloud_sync_disabled" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const getString = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;
const getNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const getUpdatedAtTime = (value: string | undefined): number => {
  const time = value ? Date.parse(value) : Number.NaN;

  return Number.isNaN(time) ? 0 : time;
};

const normalizeProfile = (value: unknown, fallback?: PersonalHealthProfile | null): PersonalHealthProfile | null => {
  if (!isRecord(value)) return fallback ?? null;

  const demographics = isRecord(value.demographics) ? value.demographics : {};
  const bodyMetrics = isRecord(value.bodyMetrics) ? value.bodyMetrics : {};

  return {
    name: getString(value.name) ?? fallback?.name,
    email: getString(value.email) ?? fallback?.email,
    dateOfBirth: getString(value.dateOfBirth) ?? fallback?.dateOfBirth,
    demographics: {
      age: getNumber(demographics.age) ?? fallback?.demographics.age,
      gender: getString(demographics.gender) ?? fallback?.demographics.gender,
    },
    bodyMetrics: {
      height: getNumber(bodyMetrics.height) ?? fallback?.bodyMetrics.height,
      weight: getNumber(bodyMetrics.weight) ?? fallback?.bodyMetrics.weight,
      bmi: getNumber(bodyMetrics.bmi) ?? fallback?.bodyMetrics.bmi,
    },
    goals: isStringArray(value.goals) ? value.goals : fallback?.goals ?? [],
    dietaryPreferences: isStringArray(value.dietaryPreferences)
      ? value.dietaryPreferences
      : fallback?.dietaryPreferences ?? [],
    allergies: isStringArray(value.allergies) ? value.allergies : fallback?.allergies ?? [],
    chronicConditions: isStringArray(value.chronicConditions)
      ? value.chronicConditions
      : fallback?.chronicConditions ?? [],
    medications: isStringArray(value.medications) ? value.medications : fallback?.medications,
    preferences: isRecord(value.preferences) ? value.preferences : fallback?.preferences,
    activityLevel: getString(value.activityLevel) ?? fallback?.activityLevel,
    averageSleepHours: getNumber(value.averageSleepHours) ?? fallback?.averageSleepHours,
    medicationAdherence: getNumber(value.medicationAdherence) ?? fallback?.medicationAdherence,
    wearableMetadata: isRecord(value.wearableMetadata)
      ? value.wearableMetadata as PersonalHealthProfile["wearableMetadata"]
      : fallback?.wearableMetadata,
    activityProfile: isRecord(value.activityProfile)
      ? value.activityProfile as PersonalHealthProfile["activityProfile"]
      : fallback?.activityProfile,
    restProfile: isRecord(value.restProfile)
      ? value.restProfile as PersonalHealthProfile["restProfile"]
      : fallback?.restProfile,
    recoveryProfile: isRecord(value.recoveryProfile)
      ? value.recoveryProfile as PersonalHealthProfile["recoveryProfile"]
      : fallback?.recoveryProfile,
    profileCompletenessScore: getNumber(value.profileCompletenessScore) ?? fallback?.profileCompletenessScore ?? 0,
    updatedAt: getString(value.updatedAt) ?? fallback?.updatedAt ?? new Date().toISOString(),
    source: getString(value.source) as PersonalHealthProfile["source"] | undefined ?? fallback?.source ?? "store",
  };
};

const mergeSparseRecord = <T extends Record<string, unknown>>(base: T, incoming: Record<string, unknown>): T => {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;

    const baseValue = merged[key];

    if (isRecord(baseValue) && isRecord(value)) {
      merged[key] = mergeSparseRecord(baseValue, value);
    } else {
      merged[key] = value;
    }
  }

  return merged as T;
};

export function reconcileProfiles(
  localProfile: PersonalHealthProfile | null,
  remoteProfile: PersonalHealthProfile | null,
): { profile: PersonalHealthProfile | null; winner: "local" | "remote" | "none" } {
  if (!localProfile) return { profile: remoteProfile, winner: remoteProfile ? "remote" : "none" };
  if (!remoteProfile) return { profile: localProfile, winner: "local" };

  const localTime = getUpdatedAtTime(localProfile.updatedAt);
  const remoteTime = getUpdatedAtTime(remoteProfile.updatedAt);

  if (remoteTime > localTime) {
    return {
      profile: normalizeProfile(mergeSparseRecord(localProfile, remoteProfile as unknown as Record<string, unknown>), localProfile),
      winner: "remote",
    };
  }

  if (localTime > remoteTime) {
    return { profile: localProfile, winner: "local" };
  }

  return {
    profile: normalizeProfile(mergeSparseRecord(remoteProfile, localProfile as unknown as Record<string, unknown>), remoteProfile),
    winner: "local",
  };
}

export async function getCachedProfile(): Promise<PersonalHealthProfile | null> {
  const raw = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);

  if (!raw) return null;

  try {
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveCachedProfile(profile: PersonalHealthProfile): Promise<void> {
  await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
}

export async function getQueuedProfileUpdates(): Promise<QueuedProfileUpdate[]> {
  const raw = await AsyncStorage.getItem(PROFILE_QUEUE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!isRecord(item)) return null;
        const profile = normalizeProfile(item.profile);
        const updatedAt = getString(item.updatedAt) ?? profile?.updatedAt;

        if (!profile || !updatedAt) return null;

        return {
          profile,
          updatedAt,
          attemptCount: getNumber(item.attemptCount) ?? 0,
          queuedAt: getString(item.queuedAt) ?? updatedAt,
        };
      })
      .filter((item): item is QueuedProfileUpdate => Boolean(item));
  } catch {
    return [];
  }
}

const saveQueuedProfileUpdates = async (updates: QueuedProfileUpdate[]): Promise<void> => {
  const capped = updates
    .sort((left, right) => getUpdatedAtTime(left.updatedAt) - getUpdatedAtTime(right.updatedAt))
    .slice(-QUEUE_LIMIT);

  await AsyncStorage.setItem(PROFILE_QUEUE_KEY, JSON.stringify(capped));
};

export async function queueProfileUpdateWhenOffline(profile: PersonalHealthProfile): Promise<number> {
  await saveCachedProfile(profile);
  if (!isCloudSyncEnabled()) return 0;

  const existing = await getQueuedProfileUpdates();
  const withoutSameTimestamp = existing.filter((item) => item.updatedAt !== profile.updatedAt);

  await saveQueuedProfileUpdates([
    ...withoutSameTimestamp,
    {
      profile,
      updatedAt: profile.updatedAt,
      attemptCount: 0,
      queuedAt: new Date().toISOString(),
    },
  ]);

  return (await getQueuedProfileUpdates()).length;
}

export async function flushQueuedProfileUpdates(): Promise<{ profile: PersonalHealthProfile | null; queuedCount: number }> {
  if (!isCloudSyncEnabled()) {
    return { profile: await getCachedProfile(), queuedCount: 0 };
  }

  const tokens = await getStoredTokens();
  let queue = await getQueuedProfileUpdates();

  if (!tokens || queue.length === 0 || !(await connectivityService.isOnline())) {
    return { profile: await getCachedProfile(), queuedCount: queue.length };
  }

  let latestProfile = await getCachedProfile();
  const remaining: QueuedProfileUpdate[] = [];

  for (const item of queue) {
    try {
      const response = await syncProfile(item.profile);
      const remoteProfile = normalizeProfile(response.profile ?? JSON.parse(response.profileJson), item.profile);
      const reconciled = reconcileProfiles(latestProfile, remoteProfile).profile;

      latestProfile = reconciled ?? latestProfile;
      if (latestProfile) await saveCachedProfile(latestProfile);
    } catch {
      remaining.push({
        ...item,
        attemptCount: item.attemptCount + 1,
      });
    }
  }

  await saveQueuedProfileUpdates(remaining);
  queue = await getQueuedProfileUpdates();

  return { profile: latestProfile, queuedCount: queue.length };
}

export async function loadProfileFromCloud(localDraft?: PersonalHealthProfile | null): Promise<ProfileSyncOutcome> {
  const cachedProfile = await getCachedProfile();
  const localProfile = reconcileProfiles(localDraft ?? null, cachedProfile).profile;
  const queuedCount = (await getQueuedProfileUpdates()).length;

  if (!isCloudSyncEnabled()) {
    return { status: "skipped", profile: localProfile, queuedCount: 0, reason: "cloud_sync_disabled" };
  }

  const tokens = await getStoredTokens();

  if (!tokens) {
    return { status: "skipped", profile: localProfile, queuedCount, reason: "unauthenticated" };
  }

  if (!(await connectivityService.isOnline())) {
    return {
      status: "offline",
      profile: localProfile ?? localDraft ?? cachedProfile,
      queuedCount,
    };
  }

  const flushed = await flushQueuedProfileUpdates();
  const afterFlush = reconcileProfiles(localProfile, flushed.profile).profile;

  try {
    const response = await fetchProfile();
    const remoteProfile = response ? normalizeProfile(response.profile ?? JSON.parse(response.profileJson), afterFlush) : null;
    const reconciled = reconcileProfiles(afterFlush, remoteProfile);

    if (reconciled.profile) {
      await saveCachedProfile(reconciled.profile);
    }

    if (reconciled.winner === "local" && reconciled.profile) {
      return syncProfileToCloud(reconciled.profile);
    }

    if (flushed.queuedCount > 0 || !reconciled.profile) {
      return {
        status: "pending",
        profile: reconciled.profile,
        queuedCount: flushed.queuedCount,
      };
    }

    return {
      status: "synced",
      profile: reconciled.profile,
      queuedCount: flushed.queuedCount,
    };
  } catch (error) {
    if (afterFlush) {
      const count = await queueProfileUpdateWhenOffline(afterFlush);

      return {
        status: "pending",
        profile: afterFlush,
        queuedCount: count,
        error: error instanceof Error ? error.message : "Profile sync failed.",
      };
    }

    return {
      status: "pending",
      profile: null,
      queuedCount: flushed.queuedCount,
      error: error instanceof Error ? error.message : "Profile sync failed.",
    };
  }
}

export async function syncProfileToCloud(profile: PersonalHealthProfile): Promise<ProfileSyncOutcome> {
  await saveCachedProfile(profile);

  if (!isCloudSyncEnabled()) {
    return { status: "skipped", profile, queuedCount: 0, reason: "cloud_sync_disabled" };
  }

  const tokens = await getStoredTokens();
  const queuedCount = (await getQueuedProfileUpdates()).length;

  if (!tokens) {
    return { status: "skipped", profile, queuedCount, reason: "unauthenticated" };
  }

  if (!(await connectivityService.isOnline())) {
    const count = await queueProfileUpdateWhenOffline(profile);

    return { status: "offline", profile, queuedCount: count };
  }

  const flushed = await flushQueuedProfileUpdates();

  try {
    const response = await syncProfile(profile);
    const remoteProfile = normalizeProfile(response.profile ?? JSON.parse(response.profileJson), profile);
    const reconciledProfile = reconcileProfiles(profile, remoteProfile).profile ?? profile;

    await saveCachedProfile(reconciledProfile);

    return {
      status: flushed.queuedCount > 0 ? "pending" : "synced",
      profile: reconciledProfile,
      queuedCount: flushed.queuedCount,
    };
  } catch (error) {
    const count = await queueProfileUpdateWhenOffline(profile);

    return {
      status: "pending",
      profile,
      queuedCount: count,
      error: error instanceof Error ? error.message : "Profile sync failed.",
    };
  }
}
