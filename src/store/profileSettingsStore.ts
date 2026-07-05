import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type LocalProfileDisplay = {
  name?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  primaryGoal?: string;
  updatedAt?: string;
};

type ProfileSettingsStoreState = {
  profile: LocalProfileDisplay | null;
  hydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  saveProfile: (profile: LocalProfileDisplay) => Promise<void>;
  clearProfile: () => Promise<void>;
};

const STORAGE_KEY = "healthy-you.profile.display-v1";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getSafeString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const getSafeNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;

const normalizeProfile = (value: unknown): LocalProfileDisplay | null => {
  if (!isRecord(value)) return null;

  const profile: LocalProfileDisplay = {
    name: getSafeString(value.name),
    age: getSafeNumber(value.age),
    heightCm: getSafeNumber(value.heightCm),
    weightKg: getSafeNumber(value.weightKg),
    primaryGoal: getSafeString(value.primaryGoal),
    updatedAt: getSafeString(value.updatedAt),
  };

  return Object.values(profile).some((entry) => entry !== undefined) ? profile : null;
};

const loadPersistedProfile = async (): Promise<LocalProfileDisplay | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) return null;

  return normalizeProfile(JSON.parse(raw));
};

const savePersistedProfile = async (profile: LocalProfileDisplay | null): Promise<void> => {
  if (!profile) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

export const useProfileSettingsStore = create<ProfileSettingsStoreState>((set, get) => ({
  profile: null,
  hydrated: false,
  error: null,
  hydrate: async () => {
    if (get().hydrated) return;

    try {
      const profile = await loadPersistedProfile();

      set({ profile, hydrated: true, error: null });
    } catch (error) {
      set({
        hydrated: true,
        error: error instanceof Error ? error.message : "Unable to load local profile settings.",
      });
    }
  },
  saveProfile: async (profile) => {
    const normalized = normalizeProfile({
      ...profile,
      updatedAt: profile.updatedAt ?? new Date().toISOString(),
    });

    set({ profile: normalized, error: null });
    await savePersistedProfile(normalized);
  },
  clearProfile: async () => {
    set({ profile: null, error: null });
    await savePersistedProfile(null);
  },
}));
