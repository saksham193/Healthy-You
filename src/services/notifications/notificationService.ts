import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type {
  HealthReminderKind,
  NotificationPermissionStatus,
  ScheduleReminderInput,
} from "./reminderTypes";

export const HEALTH_REMINDER_CHANNEL_ID = "health-reminders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const normalizePermissionStatus = (
  response: Notifications.NotificationPermissionsStatus,
): NotificationPermissionStatus => {
  if (response.granted) return "granted";
  if (response.status === "denied") return "denied";
  if (response.status === "undetermined") return "undetermined";

  return "unavailable";
};

export const configureHealthReminderChannel = async (): Promise<void> => {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(HEALTH_REMINDER_CHANNEL_ID, {
    name: "Health reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#20D6D2",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};

export const getNotificationPermissionStatus = async (): Promise<NotificationPermissionStatus> => {
  if (Platform.OS === "web") return "unavailable";

  try {
    const response = await Notifications.getPermissionsAsync();
    return normalizePermissionStatus(response);
  } catch {
    return "unavailable";
  }
};

export const requestNotificationPermission = async (): Promise<NotificationPermissionStatus> => {
  if (Platform.OS === "web") return "unavailable";

  try {
    await configureHealthReminderChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return "granted";

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: false,
      },
    });

    return normalizePermissionStatus(requested);
  } catch {
    return "unavailable";
  }
};

export const ensureNotificationReadiness = async (): Promise<{
  granted: boolean;
  status: NotificationPermissionStatus;
}> => {
  const status = await requestNotificationPermission();
  return { granted: status === "granted", status };
};

const bodyForReminderKind = (kind: HealthReminderKind): string => {
  if (kind === "hydration") return "Time to check your wellness routine.";
  if (kind === "habit") return "Time to check your wellness routine.";

  return "Time to check your wellness routine.";
};

export const scheduleDailyHealthNotification = async (
  input: ScheduleReminderInput,
): Promise<string> => {
  await configureHealthReminderChannel();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Healthy You reminder",
      body: bodyForReminderKind(input.kind),
      data: {
        kind: input.kind,
        sourceId: input.sourceId,
        reminderTitle: input.title,
      },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: HEALTH_REMINDER_CHANNEL_ID,
      hour: input.hour,
      minute: input.minute,
    },
  });
};

export const cancelHealthNotification = async (notificationId: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

export const listNativeScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  return Notifications.getAllScheduledNotificationsAsync();
};
