export type HealthReminderKind = "medication" | "habit" | "hydration";

export type NotificationPermissionStatus = "granted" | "denied" | "undetermined" | "unavailable";

export type ReminderScheduleStatus = NotificationPermissionStatus | "scheduled" | "error";

export type HealthReminderRecord = {
  key: string;
  kind: HealthReminderKind;
  sourceId: string;
  notificationId: string;
  title: string;
  timeLabel: string;
  hour: number;
  minute: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleReminderInput = {
  kind: HealthReminderKind;
  sourceId: string;
  title: string;
  hour: number;
  minute: number;
};

export type ReminderScheduleResult =
  | { ok: true; record: HealthReminderRecord }
  | { ok: false; status: ReminderScheduleStatus; message: string };
