import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { HydrationLogEntry, NutritionLogEntry, NutritionMealType } from "../types";

type NutritionMealInput = {
  mealType: NutritionMealType;
  title: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  notes?: string;
  loggedAt?: string;
};

type NutritionStoreState = {
  meals: NutritionLogEntry[];
  hydration: HydrationLogEntry[];
  hydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addMeal: (meal: NutritionMealInput) => Promise<NutritionLogEntry>;
  updateMeal: (id: string, meal: NutritionMealInput) => Promise<NutritionLogEntry | null>;
  deleteMeal: (id: string) => Promise<void>;
  addWater: (amountMl?: number) => Promise<HydrationLogEntry>;
  resetTodayHydration: () => Promise<void>;
};

type PersistedNutritionState = {
  meals: NutritionLogEntry[];
  hydration: HydrationLogEntry[];
};

const STORAGE_KEY = "healthy-you.nutrition.local-v1";
const DEFAULT_WATER_INCREMENT_ML = 250;

export const getLocalDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const finiteNumber = (value: number | undefined): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;

const normalizeMeal = (meal: NutritionMealInput, existingId?: string): NutritionLogEntry => {
  const loggedAt = meal.loggedAt ?? new Date().toISOString();
  const loggedDate = new Date(loggedAt);

  return {
    id: existingId ?? createId("meal"),
    mealType: meal.mealType,
    title: meal.title.trim(),
    calories: Math.max(0, Math.round(meal.calories)),
    protein: finiteNumber(meal.protein),
    carbs: finiteNumber(meal.carbs),
    fat: finiteNumber(meal.fat),
    notes: meal.notes?.trim() || undefined,
    loggedAt,
    dateKey: getLocalDateKey(Number.isNaN(loggedDate.getTime()) ? new Date() : loggedDate),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isMeal = (value: unknown): value is NutritionLogEntry =>
  isRecord(value) &&
  typeof value.id === "string" &&
  (value.mealType === "breakfast" || value.mealType === "lunch" || value.mealType === "dinner" || value.mealType === "snack") &&
  typeof value.title === "string" &&
  typeof value.calories === "number" &&
  typeof value.loggedAt === "string" &&
  typeof value.dateKey === "string";

const isHydration = (value: unknown): value is HydrationLogEntry =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.amountMl === "number" &&
  typeof value.loggedAt === "string" &&
  typeof value.dateKey === "string";

const loadPersistedState = async (): Promise<PersistedNutritionState> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) return { meals: [], hydration: [] };

  const parsed: unknown = JSON.parse(raw);

  if (!isRecord(parsed)) return { meals: [], hydration: [] };

  return {
    meals: Array.isArray(parsed.meals) ? parsed.meals.filter(isMeal) : [],
    hydration: Array.isArray(parsed.hydration) ? parsed.hydration.filter(isHydration) : [],
  };
};

const savePersistedState = async (state: PersistedNutritionState): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const useNutritionStore = create<NutritionStoreState>((set, get) => ({
  meals: [],
  hydration: [],
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
        error: error instanceof Error ? error.message : "Unable to load local nutrition data.",
      });
    }
  },
  addMeal: async (meal) => {
    const nextMeal = normalizeMeal(meal);
    const next = {
      meals: [nextMeal, ...get().meals],
      hydration: get().hydration,
    };

    set({ meals: next.meals, error: null });
    await savePersistedState(next);
    return nextMeal;
  },
  updateMeal: async (id, meal) => {
    const current = get().meals.find((item) => item.id === id);
    if (!current) return null;

    const nextMeal = normalizeMeal({ ...meal, loggedAt: meal.loggedAt ?? current.loggedAt }, id);
    const next = {
      meals: get().meals.map((item) => item.id === id ? nextMeal : item),
      hydration: get().hydration,
    };

    set({ meals: next.meals, error: null });
    await savePersistedState(next);
    return nextMeal;
  },
  deleteMeal: async (id) => {
    const next = {
      meals: get().meals.filter((meal) => meal.id !== id),
      hydration: get().hydration,
    };

    set({ meals: next.meals, error: null });
    await savePersistedState(next);
  },
  addWater: async (amountMl = DEFAULT_WATER_INCREMENT_ML) => {
    const loggedAt = new Date().toISOString();
    const nextEntry: HydrationLogEntry = {
      id: createId("water"),
      amountMl: Math.max(0, Math.round(amountMl)),
      loggedAt,
      dateKey: getLocalDateKey(new Date(loggedAt)),
    };
    const next = {
      meals: get().meals,
      hydration: [nextEntry, ...get().hydration],
    };

    set({ hydration: next.hydration, error: null });
    await savePersistedState(next);
    return nextEntry;
  },
  resetTodayHydration: async () => {
    const today = getLocalDateKey();
    const next = {
      meals: get().meals,
      hydration: get().hydration.filter((entry) => entry.dateKey !== today),
    };

    set({ hydration: next.hydration, error: null });
    await savePersistedState(next);
  },
}));
