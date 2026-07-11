import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { queueFitnessCompletionSync } from "../services/sync/syncPayloads";
import type { FitnessPreferences, FitnessWorkoutCompletionEntry, WorkoutPlan } from "../types";

type FitnessCompletionInput = {
  workoutId: string;
  workoutName: string;
  categoryId: string;
  categoryTitle: string;
  durationMinutes: number;
  estimatedCalories: number;
  difficulty: string;
  completedAt?: string;
  notes?: string;
};

type FitnessStoreState = {
  completions: FitnessWorkoutCompletionEntry[];
  customWorkoutPlans: WorkoutPlan[];
  preferences: FitnessPreferences;
  hydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  completeWorkout: (completion: FitnessCompletionInput) => Promise<FitnessWorkoutCompletionEntry>;
  deleteCompletion: (id: string) => Promise<void>;
  deleteTodayWorkoutCompletion: (workoutId: string, dateKey?: string) => Promise<void>;
  addCustomWorkoutPlan: (plan: WorkoutPlanInput) => Promise<WorkoutPlan>;
  updateCustomWorkoutPlan: (id: string, plan: WorkoutPlanInput) => Promise<WorkoutPlan | null>;
  deleteCustomWorkoutPlan: (id: string) => Promise<void>;
  updatePreferences: (preferences: FitnessPreferencesInput) => Promise<void>;
  clearAll: () => Promise<void>;
};

type PersistedFitnessState = {
  completions: FitnessWorkoutCompletionEntry[];
  customWorkoutPlans: WorkoutPlan[];
  preferences: FitnessPreferences;
};

type WorkoutPlanInput = {
  name: string;
  category: NonNullable<WorkoutPlan["category"]>;
  durationMinutes: number;
  intensity: NonNullable<WorkoutPlan["intensity"]>;
  bodyFocus?: string[];
  equipment?: string;
  notes?: string;
  userRestrictions?: string[];
};

type FitnessPreferencesInput = Omit<FitnessPreferences, "updatedAt">;

const STORAGE_KEY = "healthy-you.fitness.local-v1";

const emptyPreferences: FitnessPreferences = {
  bodyType: "",
  goals: [],
  limitations: [],
  restrictionNotes: "",
  hideRestrictedWorkouts: false,
  updatedAt: new Date(0).toISOString(),
};

export const getLocalDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getWeekStartDateKey = (date = new Date()): string => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);

  return getLocalDateKey(start);
};

const createId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCompletion = (value: unknown): value is FitnessWorkoutCompletionEntry =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.workoutId === "string" &&
  typeof value.workoutName === "string" &&
  typeof value.categoryId === "string" &&
  typeof value.categoryTitle === "string" &&
  typeof value.durationMinutes === "number" &&
  typeof value.estimatedCalories === "number" &&
  typeof value.difficulty === "string" &&
  typeof value.completedAt === "string" &&
  typeof value.dateKey === "string";

const isWorkoutPlan = (value: unknown): value is WorkoutPlan =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.duration === "string" &&
  typeof value.difficulty === "string" &&
  typeof value.status === "string" &&
  typeof value.iconName === "string" &&
  typeof value.tone === "string";

const isFitnessPreferences = (value: unknown): value is FitnessPreferences =>
  isRecord(value) &&
  typeof value.hideRestrictedWorkouts === "boolean" &&
  typeof value.updatedAt === "string";

const normalizeCompletion = (
  completion: FitnessCompletionInput,
  existingId?: string,
): FitnessWorkoutCompletionEntry => {
  const completedAt = completion.completedAt ?? new Date().toISOString();
  const completedDate = new Date(completedAt);

  return {
    id: existingId ?? createId("workout"),
    workoutId: completion.workoutId,
    workoutName: completion.workoutName.trim(),
    categoryId: completion.categoryId,
    categoryTitle: completion.categoryTitle,
    durationMinutes: Math.max(0, Math.round(completion.durationMinutes)),
    estimatedCalories: Math.max(0, Math.round(completion.estimatedCalories)),
    difficulty: completion.difficulty,
    completedAt,
    dateKey: getLocalDateKey(Number.isNaN(completedDate.getTime()) ? new Date() : completedDate),
    notes: completion.notes?.trim() || undefined,
  };
};

const categoryTitleFor = (category: NonNullable<WorkoutPlan["category"]>): string => {
  switch (category) {
    case "strength":
      return "Strength Training";
    case "cardio":
      return "Cardio";
    case "mobility":
      return "Mobility";
    case "recovery":
      return "Recovery";
    case "custom":
    default:
      return "Custom";
  }
};

const iconForCategory = (category: NonNullable<WorkoutPlan["category"]>): WorkoutPlan["iconName"] => {
  switch (category) {
    case "strength":
      return "barbell-outline";
    case "cardio":
      return "heart-outline";
    case "mobility":
      return "accessibility-outline";
    case "recovery":
      return "leaf-outline";
    case "custom":
    default:
      return "fitness-outline";
  }
};

const toneForIntensity = (intensity: NonNullable<WorkoutPlan["intensity"]>): WorkoutPlan["tone"] => {
  switch (intensity) {
    case "high":
      return "warning";
    case "moderate":
      return "primary";
    case "low":
    default:
      return "accent";
  }
};

const difficultyForIntensity = (intensity: NonNullable<WorkoutPlan["intensity"]>): string => {
  switch (intensity) {
    case "high":
      return "High";
    case "moderate":
      return "Moderate";
    case "low":
    default:
      return "Low";
  }
};

const normalizeWorkoutPlan = (
  plan: WorkoutPlanInput,
  existing?: WorkoutPlan,
): WorkoutPlan => {
  const now = new Date().toISOString();
  const category = plan.category;
  const intensity = plan.intensity;
  const durationMinutes = Math.max(1, Math.round(plan.durationMinutes));

  return {
    id: existing?.id ?? createId("custom-workout"),
    name: plan.name.trim(),
    category,
    duration: `${durationMinutes} min`,
    durationMinutes,
    difficulty: difficultyForIntensity(intensity),
    intensity,
    status: "pending",
    iconName: iconForCategory(category),
    tone: toneForIntensity(intensity),
    bodyFocus: plan.bodyFocus?.map((item) => item.trim()).filter(Boolean),
    equipment: plan.equipment?.trim() || undefined,
    notes: plan.notes?.trim() || undefined,
    userRestrictions: plan.userRestrictions?.map((item) => item.trim()).filter(Boolean),
    isCustom: true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
};

const loadPersistedState = async (): Promise<PersistedFitnessState> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) return { completions: [], customWorkoutPlans: [], preferences: emptyPreferences };

  const parsed: unknown = JSON.parse(raw);

  if (!isRecord(parsed)) return { completions: [], customWorkoutPlans: [], preferences: emptyPreferences };

  return {
    completions: Array.isArray(parsed.completions) ? parsed.completions.filter(isCompletion) : [],
    customWorkoutPlans: Array.isArray(parsed.customWorkoutPlans)
      ? parsed.customWorkoutPlans.filter(isWorkoutPlan)
      : [],
    preferences: isFitnessPreferences(parsed.preferences)
      ? {
          ...emptyPreferences,
          ...parsed.preferences,
          goals: Array.isArray(parsed.preferences.goals) ? parsed.preferences.goals.filter((item): item is string => typeof item === "string") : [],
          limitations: Array.isArray(parsed.preferences.limitations) ? parsed.preferences.limitations.filter((item): item is string => typeof item === "string") : [],
        }
      : emptyPreferences,
  };
};

const savePersistedState = async (state: PersistedFitnessState): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const useFitnessStore = create<FitnessStoreState>((set, get) => ({
  completions: [],
  customWorkoutPlans: [],
  preferences: emptyPreferences,
  hydrated: false,
  error: null,
  hydrate: async () => {
    if (get().hydrated) return;

    try {
      const persisted = await loadPersistedState();

      set({ ...persisted, hydrated: true, error: null });
    } catch (error) {
      set({
        hydrated: true,
        error: error instanceof Error ? error.message : "Unable to load local fitness data.",
      });
    }
  },
  completeWorkout: async (completion) => {
    const nextCompletion = normalizeCompletion(completion);
    const next = {
      completions: [nextCompletion, ...get().completions],
      customWorkoutPlans: get().customWorkoutPlans,
      preferences: get().preferences,
    };

    set({ completions: next.completions, error: null });
    await savePersistedState(next);
    await queueFitnessCompletionSync(nextCompletion, "create");
    return nextCompletion;
  },
  deleteCompletion: async (id) => {
    const current = get().completions.find((completion) => completion.id === id);
    const next = {
      completions: get().completions.filter((completion) => completion.id !== id),
      customWorkoutPlans: get().customWorkoutPlans,
      preferences: get().preferences,
    };

    set({ completions: next.completions, error: null });
    await savePersistedState(next);
    if (current) await queueFitnessCompletionSync(current, "delete");
  },
  deleteTodayWorkoutCompletion: async (workoutId, dateKey = getLocalDateKey()) => {
    const current = get().completions.find(
      (completion) => completion.workoutId === workoutId && completion.dateKey === dateKey,
    );
    const next = {
      completions: get().completions.filter(
        (completion) => completion.workoutId !== workoutId || completion.dateKey !== dateKey,
      ),
      customWorkoutPlans: get().customWorkoutPlans,
      preferences: get().preferences,
    };

    set({ completions: next.completions, error: null });
    await savePersistedState(next);
    if (current) await queueFitnessCompletionSync(current, "delete");
  },
  addCustomWorkoutPlan: async (plan) => {
    const nextPlan = normalizeWorkoutPlan(plan);
    const next = {
      completions: get().completions,
      customWorkoutPlans: [nextPlan, ...get().customWorkoutPlans],
      preferences: get().preferences,
    };

    set({ customWorkoutPlans: next.customWorkoutPlans, error: null });
    await savePersistedState(next);
    return nextPlan;
  },
  updateCustomWorkoutPlan: async (id, plan) => {
    const current = get().customWorkoutPlans.find((workout) => workout.id === id);

    if (!current) return null;

    const nextPlan = normalizeWorkoutPlan(plan, current);
    const next = {
      completions: get().completions,
      customWorkoutPlans: get().customWorkoutPlans.map((workout) =>
        workout.id === id ? nextPlan : workout,
      ),
      preferences: get().preferences,
    };

    set({ customWorkoutPlans: next.customWorkoutPlans, error: null });
    await savePersistedState(next);
    return nextPlan;
  },
  deleteCustomWorkoutPlan: async (id) => {
    const next = {
      completions: get().completions,
      customWorkoutPlans: get().customWorkoutPlans.filter((workout) => workout.id !== id),
      preferences: get().preferences,
    };

    set({ customWorkoutPlans: next.customWorkoutPlans, error: null });
    await savePersistedState(next);
  },
  updatePreferences: async (preferences) => {
    const nextPreferences: FitnessPreferences = {
      bodyType: preferences.bodyType?.trim() || "",
      goals: preferences.goals.map((item) => item.trim()).filter(Boolean),
      limitations: preferences.limitations.map((item) => item.trim()).filter(Boolean),
      restrictionNotes: preferences.restrictionNotes?.trim() || "",
      hideRestrictedWorkouts: preferences.hideRestrictedWorkouts,
      updatedAt: new Date().toISOString(),
    };
    const next = {
      completions: get().completions,
      customWorkoutPlans: get().customWorkoutPlans,
      preferences: nextPreferences,
    };

    set({ preferences: nextPreferences, error: null });
    await savePersistedState(next);
  },
  clearAll: async () => {
    const next = { completions: [], customWorkoutPlans: [], preferences: emptyPreferences };

    set({
      completions: next.completions,
      customWorkoutPlans: next.customWorkoutPlans,
      preferences: next.preferences,
      error: null,
    });
    await savePersistedState(next);
  },
}));
