import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { FitnessWorkoutCompletionEntry } from "../types";

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
  hydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  completeWorkout: (completion: FitnessCompletionInput) => Promise<FitnessWorkoutCompletionEntry>;
  deleteCompletion: (id: string) => Promise<void>;
  deleteTodayWorkoutCompletion: (workoutId: string, dateKey?: string) => Promise<void>;
};

type PersistedFitnessState = {
  completions: FitnessWorkoutCompletionEntry[];
};

const STORAGE_KEY = "healthy-you.fitness.local-v1";

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

const loadPersistedState = async (): Promise<PersistedFitnessState> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) return { completions: [] };

  const parsed: unknown = JSON.parse(raw);

  if (!isRecord(parsed)) return { completions: [] };

  return {
    completions: Array.isArray(parsed.completions) ? parsed.completions.filter(isCompletion) : [],
  };
};

const savePersistedState = async (state: PersistedFitnessState): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const useFitnessStore = create<FitnessStoreState>((set, get) => ({
  completions: [],
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
    };

    set({ completions: next.completions, error: null });
    await savePersistedState(next);
    return nextCompletion;
  },
  deleteCompletion: async (id) => {
    const next = {
      completions: get().completions.filter((completion) => completion.id !== id),
    };

    set({ completions: next.completions, error: null });
    await savePersistedState(next);
  },
  deleteTodayWorkoutCompletion: async (workoutId, dateKey = getLocalDateKey()) => {
    const next = {
      completions: get().completions.filter(
        (completion) => completion.workoutId !== workoutId || completion.dateKey !== dateKey,
      ),
    };

    set({ completions: next.completions, error: null });
    await savePersistedState(next);
  },
}));
