import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type {
  HabitCompletionEntry,
  MedicationLogEntry,
  MedicationLogStatus,
} from "../types";

type HabitCompletionInput = {
  habitId: string;
  habitTitle: string;
  category?: string;
  completedAt?: string;
  streakLabel?: string;
};

type MedicationLogInput = {
  medicationId: string;
  medicationName: string;
  dosage?: string;
  scheduledTime?: string;
  status: MedicationLogStatus;
  loggedAt?: string;
};

type ScheduleStoreState = {
  habitCompletions: HabitCompletionEntry[];
  medicationLogs: MedicationLogEntry[];
  hydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  completeHabit: (completion: HabitCompletionInput) => Promise<HabitCompletionEntry>;
  uncompleteHabit: (habitId: string, dateKey?: string) => Promise<void>;
  logMedication: (log: MedicationLogInput) => Promise<MedicationLogEntry>;
  clearMedicationLog: (medicationId: string, dateKey?: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

type PersistedScheduleState = {
  habitCompletions: HabitCompletionEntry[];
  medicationLogs: MedicationLogEntry[];
};

const STORAGE_KEY = "healthy-you.schedule.local-v1";

export const getLocalDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isMedicationLogStatus = (value: unknown): value is MedicationLogStatus =>
  value === "taken" || value === "skipped";

const isHabitCompletion = (value: unknown): value is HabitCompletionEntry =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.habitId === "string" &&
  typeof value.habitTitle === "string" &&
  typeof value.completedAt === "string" &&
  typeof value.dateKey === "string";

const isMedicationLog = (value: unknown): value is MedicationLogEntry =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.medicationId === "string" &&
  typeof value.medicationName === "string" &&
  isMedicationLogStatus(value.status) &&
  typeof value.loggedAt === "string" &&
  typeof value.dateKey === "string";

const normalizeHabitCompletion = (
  completion: HabitCompletionInput,
  existingId?: string,
): HabitCompletionEntry => {
  const completedAt = completion.completedAt ?? new Date().toISOString();
  const completedDate = new Date(completedAt);

  return {
    id: existingId ?? createId("habit"),
    habitId: completion.habitId,
    habitTitle: completion.habitTitle.trim(),
    category: completion.category?.trim() || undefined,
    completedAt,
    dateKey: getLocalDateKey(Number.isNaN(completedDate.getTime()) ? new Date() : completedDate),
    streakLabel: completion.streakLabel?.trim() || undefined,
  };
};

const normalizeMedicationLog = (
  log: MedicationLogInput,
  existingId?: string,
): MedicationLogEntry => {
  const loggedAt = log.loggedAt ?? new Date().toISOString();
  const loggedDate = new Date(loggedAt);

  return {
    id: existingId ?? createId("medication"),
    medicationId: log.medicationId,
    medicationName: log.medicationName.trim(),
    dosage: log.dosage?.trim() || undefined,
    scheduledTime: log.scheduledTime?.trim() || undefined,
    status: log.status,
    loggedAt,
    dateKey: getLocalDateKey(Number.isNaN(loggedDate.getTime()) ? new Date() : loggedDate),
  };
};

const loadPersistedState = async (): Promise<PersistedScheduleState> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) return { habitCompletions: [], medicationLogs: [] };

  const parsed: unknown = JSON.parse(raw);

  if (!isRecord(parsed)) return { habitCompletions: [], medicationLogs: [] };

  return {
    habitCompletions: Array.isArray(parsed.habitCompletions)
      ? parsed.habitCompletions.filter(isHabitCompletion)
      : [],
    medicationLogs: Array.isArray(parsed.medicationLogs)
      ? parsed.medicationLogs.filter(isMedicationLog)
      : [],
  };
};

const savePersistedState = async (state: PersistedScheduleState): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const useScheduleStore = create<ScheduleStoreState>((set, get) => ({
  habitCompletions: [],
  medicationLogs: [],
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
        error: error instanceof Error ? error.message : "Unable to load local schedule data.",
      });
    }
  },
  completeHabit: async (completion) => {
    const dateKey = getLocalDateKey();
    const existing = get().habitCompletions.find(
      (item) => item.habitId === completion.habitId && item.dateKey === dateKey,
    );
    const nextCompletion = normalizeHabitCompletion(completion, existing?.id);
    const next = {
      habitCompletions: [
        nextCompletion,
        ...get().habitCompletions.filter((item) => item.id !== existing?.id),
      ],
      medicationLogs: get().medicationLogs,
    };

    set({ habitCompletions: next.habitCompletions, error: null });
    await savePersistedState(next);
    return nextCompletion;
  },
  uncompleteHabit: async (habitId, dateKey = getLocalDateKey()) => {
    const next = {
      habitCompletions: get().habitCompletions.filter(
        (completion) => completion.habitId !== habitId || completion.dateKey !== dateKey,
      ),
      medicationLogs: get().medicationLogs,
    };

    set({ habitCompletions: next.habitCompletions, error: null });
    await savePersistedState(next);
  },
  logMedication: async (log) => {
    const dateKey = getLocalDateKey();
    const existing = get().medicationLogs.find(
      (item) => item.medicationId === log.medicationId && item.dateKey === dateKey,
    );
    const nextLog = normalizeMedicationLog(log, existing?.id);
    const next = {
      habitCompletions: get().habitCompletions,
      medicationLogs: [
        nextLog,
        ...get().medicationLogs.filter((item) => item.id !== existing?.id),
      ],
    };

    set({ medicationLogs: next.medicationLogs, error: null });
    await savePersistedState(next);
    return nextLog;
  },
  clearMedicationLog: async (medicationId, dateKey = getLocalDateKey()) => {
    const next = {
      habitCompletions: get().habitCompletions,
      medicationLogs: get().medicationLogs.filter(
        (log) => log.medicationId !== medicationId || log.dateKey !== dateKey,
      ),
    };

    set({ medicationLogs: next.medicationLogs, error: null });
    await savePersistedState(next);
  },
  clearAll: async () => {
    const next = { habitCompletions: [], medicationLogs: [] };

    set({ ...next, error: null });
    await savePersistedState(next);
  },
}));
