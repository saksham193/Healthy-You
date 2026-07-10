import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cancelHealthNotification,
  ensureNotificationReadiness,
  getNotificationPermissionStatus,
  listNativeScheduledNotifications,
  scheduleDailyHealthNotification,
} from "./notificationService";
import type {
  HealthReminderKind,
  HealthReminderRecord,
  ReminderScheduleResult,
  ScheduleReminderInput,
} from "./reminderTypes";
import type { CustomHealthRoutine, Habit, MedicationReminder } from "../../types";

const REMINDER_STORAGE_KEY = "healthy-you.health-reminders.v1";
const HYDRATION_SOURCE_ID = "daily-hydration";

const padTime = (value: number): string => `${value}`.padStart(2, "0");

const formatReminderTime = (hour: number, minute: number): string => {
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${padTime(minute)} ${suffix}`;
};

export const getReminderKey = (kind: HealthReminderKind, sourceId: string): string =>
  `healthy-you:${kind}:${sourceId}`;

export const getHydrationReminderKey = (): string => getReminderKey("hydration", HYDRATION_SOURCE_ID);

const safeJsonParse = (value: string | null): HealthReminderRecord[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((record): record is HealthReminderRecord =>
      typeof record?.key === "string" &&
      typeof record?.notificationId === "string" &&
      typeof record?.sourceId === "string" &&
      typeof record?.kind === "string" &&
      typeof record?.hour === "number" &&
      typeof record?.minute === "number",
    );
  } catch {
    return [];
  }
};

const persistReminderRecords = async (records: HealthReminderRecord[]): Promise<void> => {
  await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(records));
};

export const listScheduledReminders = async (): Promise<HealthReminderRecord[]> => {
  const stored = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
  return safeJsonParse(stored);
};

const cancelExistingReminder = async (key: string, records: HealthReminderRecord[]): Promise<void> => {
  const existing = records.find((record) => record.key === key);
  if (existing) {
    try {
      await cancelHealthNotification(existing.notificationId);
    } catch {
      // Native notification state may already be cleared after reinstall; storage is still repaired below.
    }
  }
};

const createPermissionMessage = (status: string): string => {
  if (status === "denied") {
    return "Notifications are disabled. Enable notifications in Android settings to use reminders.";
  }

  return "Healthy You could not enable notifications on this device.";
};

const isHealthyYouReminderRequest = (
  request: Awaited<ReturnType<typeof listNativeScheduledNotifications>>[number],
): boolean => {
  const kind = request.content.data?.kind;

  return kind === "medication" || kind === "habit" || kind === "hydration";
};

const scheduleReminder = async (
  input: ScheduleReminderInput,
): Promise<ReminderScheduleResult> => {
  const readiness = await ensureNotificationReadiness();
  if (!readiness.granted) {
    return {
      ok: false,
      status: readiness.status,
      message: createPermissionMessage(readiness.status),
    };
  }

  try {
    const key = getReminderKey(input.kind, input.sourceId);
    const currentRecords = await listScheduledReminders();
    const notificationId = await scheduleDailyHealthNotification(input);
    const now = new Date().toISOString();
    const record: HealthReminderRecord = {
      key,
      kind: input.kind,
      sourceId: input.sourceId,
      notificationId,
      title: input.title,
      timeLabel: formatReminderTime(input.hour, input.minute),
      hour: input.hour,
      minute: input.minute,
      enabled: true,
      createdAt: currentRecords.find((item) => item.key === key)?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      await persistReminderRecords([
        ...currentRecords.filter((item) => item.key !== key),
        record,
      ]);
    } catch (persistError) {
      await cancelHealthNotification(notificationId).catch(() => undefined);
      throw persistError;
    }

    await cancelExistingReminder(key, currentRecords);

    return { ok: true, record };
  } catch {
    return {
      ok: false,
      status: "error",
      message: "Healthy You could not schedule this local reminder right now.",
    };
  }
};

export const parseMedicationReminderTime = (time: string): { hour: number; minute: number } | null => {
  const normalized = time.trim().toUpperCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;

  const hourPart = Number.parseInt(match[1], 10);
  const minute = match[2] ? Number.parseInt(match[2], 10) : 0;
  const period = match[3];
  if (!Number.isFinite(hourPart) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  if (period && (hourPart < 1 || hourPart > 12)) return null;
  if (!period && (hourPart < 0 || hourPart > 23)) return null;

  let hour = hourPart;
  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour !== 12) hour += 12;

  return { hour, minute };
};

const habitPresetTime = (habit: Habit): { hour: number; minute: number } => {
  const normalized = `${habit.id} ${habit.title}`.toLowerCase();

  if (normalized.includes("water") || normalized.includes("hydration")) return { hour: 15, minute: 0 };
  if (normalized.includes("vitamin") || normalized.includes("morning")) return { hour: 8, minute: 30 };
  if (normalized.includes("walk") || normalized.includes("step") || normalized.includes("stretch")) {
    return { hour: 18, minute: 0 };
  }
  if (normalized.includes("meditat") || normalized.includes("sleep")) return { hour: 20, minute: 30 };

  return { hour: 19, minute: 0 };
};

export const scheduleMedicationReminder = async (
  medication: MedicationReminder,
): Promise<ReminderScheduleResult> => {
  const parsed = parseMedicationReminderTime(medication.time);
  if (!parsed) {
    return {
      ok: false,
      status: "error",
      message: "Healthy You could not read this medication time.",
    };
  }

  return scheduleReminder({
    kind: "medication",
    sourceId: medication.id,
    title: "Medication reminder",
    hour: parsed.hour,
    minute: parsed.minute,
  });
};

export const scheduleHabitReminder = async (habit: Habit): Promise<ReminderScheduleResult> => {
  const preset = habitPresetTime(habit);

  return scheduleReminder({
    kind: "habit",
    sourceId: habit.id,
    title: "Habit reminder",
    hour: preset.hour,
    minute: preset.minute,
  });
};

export const scheduleCustomRoutineReminder = async (
  routine: CustomHealthRoutine,
): Promise<ReminderScheduleResult> => {
  const parsed = routine.reminderTime ? parseMedicationReminderTime(routine.reminderTime) : null;
  if (!parsed) {
    return {
      ok: false,
      status: "error",
      message: "Please choose a valid reminder time.",
    };
  }

  const result = await scheduleReminder({
    kind: routine.type,
    sourceId: routine.id,
    title: "Custom wellness routine",
    hour: parsed.hour,
    minute: parsed.minute,
  });

  if (
    result.ok &&
    routine.reminderNotificationId &&
    routine.reminderNotificationId !== result.record.notificationId
  ) {
    await cancelHealthNotification(routine.reminderNotificationId).catch(() => undefined);
  }

  return result;
};

export const scheduleHydrationReminder = async (): Promise<ReminderScheduleResult> =>
  scheduleReminder({
    kind: "hydration",
    sourceId: HYDRATION_SOURCE_ID,
    title: "Hydration reminder",
    hour: 15,
    minute: 0,
  });

export const cancelScheduledReminder = async (key: string): Promise<void> => {
  const records = await listScheduledReminders();
  const existing = records.find((record) => record.key === key);

  if (existing) {
    try {
      await cancelHealthNotification(existing.notificationId);
    } catch {
      // Storage remains the source of truth for the in-app toggle after reinstall or manual OS cleanup.
    }
  }

  await persistReminderRecords(records.filter((record) => record.key !== key));
};

export const cancelCustomRoutineReminder = async (routine: CustomHealthRoutine): Promise<void> => {
  const key = getReminderKey(routine.type, routine.id);
  const records = await listScheduledReminders();
  const storedRecord = records.find((record) => record.key === key);
  const notificationIds = Array.from(new Set([
    storedRecord?.notificationId,
    routine.reminderNotificationId,
  ].filter((value): value is string => Boolean(value))));

  await Promise.all(notificationIds.map(async (notificationId) => {
    await cancelHealthNotification(notificationId).catch(() => undefined);
  }));
  await persistReminderRecords(records.filter((record) => record.key !== key));
};

export const cancelAllHealthReminders = async (): Promise<number> => {
  const records = await listScheduledReminders();
  const nativeNotifications = await listNativeScheduledNotifications().catch(() => []);
  const storedNotificationIds = new Set(records.map((record) => record.notificationId));
  const nativeHealthNotificationIds = nativeNotifications
    .filter((request) => isHealthyYouReminderRequest(request) && !storedNotificationIds.has(request.identifier))
    .map((request) => request.identifier);
  const notificationIds = Array.from(new Set([
    ...records.map((record) => record.notificationId),
    ...nativeHealthNotificationIds,
  ]));

  await Promise.all(notificationIds.map(async (notificationId) => {
    try {
      await cancelHealthNotification(notificationId);
    } catch {
      // Continue clearing local reminder records even if native state was already removed.
    }
  }));
  await AsyncStorage.removeItem(REMINDER_STORAGE_KEY);

  return notificationIds.length;
};

export const getStoredNotificationStatus = getNotificationPermissionStatus;
