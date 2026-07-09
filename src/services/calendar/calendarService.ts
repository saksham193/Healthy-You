import * as Calendar from "expo-calendar/legacy";
import { Platform } from "react-native";
import type { Appointment } from "../../types";

export type CalendarFoundationResult =
  | { ok: true; eventId: string; calendarTitle: string }
  | { ok: false; reason: "permission-denied" | "unavailable" | "no-calendar" | "invalid-date" | "error"; message: string };

const parseAppointmentDate = (appointment: Appointment): Date | null => {
  const currentYear = new Date().getFullYear();
  const normalized = `${appointment.date} ${currentYear} ${appointment.time}`;
  const parsed = new Date(normalized);

  if (!Number.isNaN(parsed.getTime())) return parsed;

  const fallback = new Date();
  fallback.setHours(9, 0, 0, 0);
  return fallback;
};

type DeviceCalendar = Awaited<ReturnType<typeof Calendar.getCalendarsAsync>>[number];

const findWritableCalendar = async (): Promise<DeviceCalendar | null> => {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((item) => item.allowsModifications && item.isPrimary)
    ?? calendars.find((item) => item.allowsModifications);

  if (writable) return writable;

  if (Platform.OS === "ios") {
    try {
      return Calendar.getDefaultCalendarAsync();
    } catch {
      return null;
    }
  }

  return null;
};

export const addAppointmentToDeviceCalendar = async (
  appointment: Appointment,
): Promise<CalendarFoundationResult> => {
  try {
    const available = await Calendar.isAvailableAsync();
    if (!available) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No writable device calendar found. You can add this appointment manually for now.",
      };
    }

    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (!permission.granted) {
      return {
        ok: false,
        reason: "permission-denied",
        message: "Calendar permission is required to add this event.",
      };
    }

    const calendar = await findWritableCalendar();
    if (!calendar) {
      return {
        ok: false,
        reason: "no-calendar",
        message: "No writable device calendar found. You can add this appointment manually for now.",
      };
    }

    const startDate = parseAppointmentDate(appointment);
    if (!startDate) {
      return {
        ok: false,
        reason: "invalid-date",
        message: "Healthy You could not read this appointment date.",
      };
    }

    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    const eventId = await Calendar.createEventAsync(calendar.id, {
      title: "Healthy You wellness appointment",
      location: appointment.location,
      notes: "Added from Healthy You. Review details in the app before making health decisions.",
      startDate,
      endDate,
      allDay: false,
      alarms: [{ relativeOffset: -30 }],
    });

    return { ok: true, eventId, calendarTitle: calendar.title };
  } catch {
    return {
      ok: false,
      reason: "error",
      message: "Healthy You could not add this event to your device calendar right now.",
    };
  }
};
