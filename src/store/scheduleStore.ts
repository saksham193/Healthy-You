import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  queueHabitCompletionSync,
  queueMedicationLogSync,
  queueScheduleRoutineSync,
} from "../services/sync/syncPayloads";
import type {
  CustomHealthRoutine,
  CustomHealthRoutineType,
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

export type CustomRoutineInput = {
  type: CustomHealthRoutineType;
  name: string;
  notes?: string;
  doseLabel?: string;
  reminderEnabled: boolean;
  reminderTime?: string;
  reminderNotificationId?: string;
};

type ScheduleStoreState = {
  habitCompletions: HabitCompletionEntry[];
  medicationLogs: MedicationLogEntry[];
  customRoutines: CustomHealthRoutine[];
  hydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  completeHabit: (completion: HabitCompletionInput) => Promise<HabitCompletionEntry>;
  uncompleteHabit: (habitId: string, dateKey?: string) => Promise<void>;
  logMedication: (log: MedicationLogInput) => Promise<MedicationLogEntry>;
  clearMedicationLog: (medicationId: string, dateKey?: string) => Promise<void>;
  addCustomRoutine: (routine: CustomRoutineInput) => Promise<CustomHealthRoutine>;
  updateCustomRoutine: (id: string, routine: CustomRoutineInput) => Promise<CustomHealthRoutine | null>;
  deleteCustomRoutine: (id: string) => Promise<void>;
  disableAllCustomRoutineReminders: () => Promise<void>;
  clearAll: () => Promise<void>;
};

type PersistedScheduleState = {
  habitCompletions: HabitCompletionEntry[];
  medicationLogs: MedicationLogEntry[];
  customRoutines: CustomHealthRoutine[];
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

const isCustomRoutineType = (value: unknown): value is CustomHealthRoutineType =>
  value === "medication" || value === "habit";

const isCustomHealthRoutine = (value: unknown): value is CustomHealthRoutine =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isCustomRoutineType(value.type) &&
  typeof value.name === "string" &&
  typeof value.reminderEnabled === "boolean" &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string" &&
  (value.notes === undefined || typeof value.notes === "string") &&
  (value.doseLabel === undefined || typeof value.doseLabel === "string") &&
  (value.reminderTime === undefined || typeof value.reminderTime === "string") &&
  (value.reminderNotificationId === undefined || typeof value.reminderNotificationId === "string");

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

const normalizeCustomRoutine = (
  routine: CustomRoutineInput,
  existing?: CustomHealthRoutine,
): CustomHealthRoutine => {
  const now = new Date().toISOString();

  return {
    id: existing?.id ?? createId("routine"),
    type: routine.type,
    name: routine.name.trim(),
    notes: routine.notes?.trim() || undefined,
    doseLabel: routine.type === "medication" ? routine.doseLabel?.trim() || undefined : undefined,
    reminderEnabled: routine.reminderEnabled,
    reminderTime: routine.reminderTime?.trim() || undefined,
    reminderNotificationId: routine.reminderEnabled
      ? routine.reminderNotificationId?.trim() || undefined
      : undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
};

const loadPersistedState = async (): Promise<PersistedScheduleState> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) return { habitCompletions: [], medicationLogs: [], customRoutines: [] };

  const parsed: unknown = JSON.parse(raw);

  if (!isRecord(parsed)) return { habitCompletions: [], medicationLogs: [], customRoutines: [] };

  return {
    habitCompletions: Array.isArray(parsed.habitCompletions)
      ? parsed.habitCompletions.filter(isHabitCompletion)
      : [],
    medicationLogs: Array.isArray(parsed.medicationLogs)
      ? parsed.medicationLogs.filter(isMedicationLog)
      : [],
    customRoutines: Array.isArray(parsed.customRoutines)
      ? parsed.customRoutines.filter(isCustomHealthRoutine)
      : [],
  };
};

const savePersistedState = async (state: PersistedScheduleState): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const useScheduleStore = create<ScheduleStoreState>((set, get) => ({
  habitCompletions: [],
  medicationLogs: [],
  customRoutines: [],
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
      customRoutines: get().customRoutines,
    };

    set({ habitCompletions: next.habitCompletions, error: null });
    await savePersistedState(next);
    await queueHabitCompletionSync(nextCompletion, existing ? "update" : "create");
    return nextCompletion;
  },
  uncompleteHabit: async (habitId, dateKey = getLocalDateKey()) => {
    const current = get().habitCompletions.find(
      (completion) => completion.habitId === habitId && completion.dateKey === dateKey,
    );
    const next = {
      habitCompletions: get().habitCompletions.filter(
        (completion) => completion.habitId !== habitId || completion.dateKey !== dateKey,
      ),
      medicationLogs: get().medicationLogs,
      customRoutines: get().customRoutines,
    };

    set({ habitCompletions: next.habitCompletions, error: null });
    await savePersistedState(next);
    if (current) await queueHabitCompletionSync(current, "delete");
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
      customRoutines: get().customRoutines,
    };

    set({ medicationLogs: next.medicationLogs, error: null });
    await savePersistedState(next);
    await queueMedicationLogSync(nextLog, existing ? "update" : "create");
    return nextLog;
  },
  clearMedicationLog: async (medicationId, dateKey = getLocalDateKey()) => {
    const current = get().medicationLogs.find(
      (log) => log.medicationId === medicationId && log.dateKey === dateKey,
    );
    const next = {
      habitCompletions: get().habitCompletions,
      medicationLogs: get().medicationLogs.filter(
        (log) => log.medicationId !== medicationId || log.dateKey !== dateKey,
      ),
      customRoutines: get().customRoutines,
    };

    set({ medicationLogs: next.medicationLogs, error: null });
    await savePersistedState(next);
    if (current) await queueMedicationLogSync(current, "delete");
  },
  addCustomRoutine: async (routine) => {
    const nextRoutine = normalizeCustomRoutine(routine);
    const next = {
      habitCompletions: get().habitCompletions,
      medicationLogs: get().medicationLogs,
      customRoutines: [nextRoutine, ...get().customRoutines],
    };

    set({ customRoutines: next.customRoutines, error: null });
    await savePersistedState(next);
    await queueScheduleRoutineSync(nextRoutine, "create");
    return nextRoutine;
  },
  updateCustomRoutine: async (id, routine) => {
    const existing = get().customRoutines.find((item) => item.id === id);
    if (!existing) return null;

    const nextRoutine = normalizeCustomRoutine(routine, existing);
    const next = {
      habitCompletions: get().habitCompletions,
      medicationLogs: get().medicationLogs,
      customRoutines: get().customRoutines.map((item) => item.id === id ? nextRoutine : item),
    };

    set({ customRoutines: next.customRoutines, error: null });
    await savePersistedState(next);
    await queueScheduleRoutineSync(nextRoutine, "update");
    return nextRoutine;
  },
  deleteCustomRoutine: async (id) => {
    const current = get().customRoutines.find((item) => item.id === id);
    const next = {
      habitCompletions: get().habitCompletions,
      medicationLogs: get().medicationLogs,
      customRoutines: get().customRoutines.filter((item) => item.id !== id),
    };

    set({ customRoutines: next.customRoutines, error: null });
    await savePersistedState(next);
    if (current) await queueScheduleRoutineSync(current, "delete");
  },
  disableAllCustomRoutineReminders: async () => {
    const now = new Date().toISOString();
    const next = {
      habitCompletions: get().habitCompletions,
      medicationLogs: get().medicationLogs,
      customRoutines: get().customRoutines.map((routine) => routine.reminderEnabled
        ? {
            ...routine,
            reminderEnabled: false,
            reminderNotificationId: undefined,
            updatedAt: now,
          }
        : routine),
    };

    set({ customRoutines: next.customRoutines, error: null });
    await savePersistedState(next);
  },
  clearAll: async () => {
    const next = {
      habitCompletions: [],
      medicationLogs: [],
      customRoutines: get().customRoutines,
    };

    set({ habitCompletions: [], medicationLogs: [], error: null });
    await savePersistedState(next);
  },
}));
