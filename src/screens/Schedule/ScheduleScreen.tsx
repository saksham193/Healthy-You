import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppointmentCard from "../../components/schedule/AppointmentCard";
import HabitTrackerCard from "../../components/schedule/HabitTrackerCard";
import MedicationReminderCard from "../../components/schedule/MedicationReminderCard";
import SleepScheduleCard from "../../components/schedule/SleepScheduleCard";
import TimelineEventCard from "../../components/schedule/TimelineEventCard";
import ActionCard from "../../components/layout/ActionCard";
import ActivityChart from "../../components/layout/ActivityChart";
import AppHeader from "../../components/layout/AppHeader";
import DashboardSection from "../../components/layout/DashboardSection";
import EmptyState from "../../components/layout/EmptyState";
import ProgressRing from "../../components/layout/ProgressRing";
import ReminderCard from "../../components/layout/ReminderCard";
import ScreenSheet from "../../components/layout/ScreenSheet";
import StatsCard from "../../components/layout/StatsCard";
import CustomCard from "../../components/common/CustomCard";
import ScreenContainer from "../../components/common/ScreenContainer";
import { useHealthData } from "../../hooks/useHealthData";
import { addAppointmentToDeviceCalendar } from "../../services/calendar/calendarService";
import { getLocalDateKey, useScheduleStore } from "../../store/scheduleStore";
import { requestNotificationPermission } from "../../services/notifications/notificationService";
import {
  cancelScheduledReminder,
  getHydrationReminderKey,
  getReminderKey,
  getStoredNotificationStatus,
  listScheduledReminders,
  scheduleHabitReminder,
  scheduleHydrationReminder,
  scheduleMedicationReminder,
} from "../../services/notifications/reminderScheduler";
import { COLORS, SCHEDULE_COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getScheduleHabitToneColors, getScheduleToneColors } from "../../utils/tone";
import type { Appointment, Habit, HabitCompletionEntry, MedicationLogEntry, MedicationReminder } from "../../types";
import type {
  HealthReminderRecord,
  NotificationPermissionStatus,
} from "../../services/notifications/reminderTypes";

const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));

const timeLabel = (timestamp: string): string => {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "Today";

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const notificationStatusLabel = (status: NotificationPermissionStatus): string => {
  if (status === "granted") return "Notifications enabled";
  if (status === "denied") return "Notifications disabled";
  if (status === "undetermined") return "Permission not requested";

  return "Notifications unavailable";
};

const notificationUnavailableMessage = (status: NotificationPermissionStatus): string => {
  if (status === "denied") {
    return "Notifications are disabled. Enable notifications in Android settings to use reminders.";
  }

  return "Healthy You could not enable notifications. You can still track habits and medication manually.";
};

export default function ScheduleScreen() {
  const { data, error, loading } = useHealthData();
  const schedule = data.schedule;
  const hydrateSchedule = useScheduleStore((state) => state.hydrate);
  const habitCompletions = useScheduleStore((state) => state.habitCompletions);
  const medicationLogs = useScheduleStore((state) => state.medicationLogs);
  const scheduleHydrated = useScheduleStore((state) => state.hydrated);
  const completeHabit = useScheduleStore((state) => state.completeHabit);
  const uncompleteHabit = useScheduleStore((state) => state.uncompleteHabit);
  const logMedication = useScheduleStore((state) => state.logMedication);
  const clearMedicationLog = useScheduleStore((state) => state.clearMedicationLog);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermissionStatus>("undetermined");
  const [scheduledReminders, setScheduledReminders] = useState<HealthReminderRecord[]>([]);
  const [reminderBusyKey, setReminderBusyKey] = useState<string | null>(null);

  const refreshReminderState = useCallback(async () => {
    const [status, reminders] = await Promise.all([
      getStoredNotificationStatus(),
      listScheduledReminders(),
    ]);

    setNotificationStatus(status);
    setScheduledReminders(reminders);
  }, []);

  useEffect(() => {
    void hydrateSchedule();
  }, [hydrateSchedule]);

  useEffect(() => {
    void refreshReminderState();
  }, [refreshReminderState]);

  const todayKey = getLocalDateKey();
  const todayHabitCompletions = useMemo(
    () => habitCompletions.filter((completion) => completion.dateKey === todayKey),
    [habitCompletions, todayKey],
  );
  const todayMedicationLogs = useMemo(
    () => medicationLogs.filter((log) => log.dateKey === todayKey),
    [medicationLogs, todayKey],
  );
  const habitCompletionById = useMemo(() => {
    const byHabit = new Map<string, HabitCompletionEntry>();

    todayHabitCompletions.forEach((completion) => {
      if (!byHabit.has(completion.habitId)) {
        byHabit.set(completion.habitId, completion);
      }
    });

    return byHabit;
  }, [todayHabitCompletions]);
  const medicationLogById = useMemo(() => {
    const byMedication = new Map<string, MedicationLogEntry>();

    todayMedicationLogs.forEach((log) => {
      if (!byMedication.has(log.medicationId)) {
        byMedication.set(log.medicationId, log);
      }
    });

    return byMedication;
  }, [todayMedicationLogs]);
  const reminderByKey = useMemo(() => {
    const byKey = new Map<string, HealthReminderRecord>();

    scheduledReminders.forEach((reminder) => {
      byKey.set(reminder.key, reminder);
    });

    return byKey;
  }, [scheduledReminders]);

  if (!schedule) {
    return (
      <ScreenContainer>
        <AppHeader
          subtitle="Stay on track with your daily goals"
          theme={{
            actionBackgroundColor: "rgba(97, 19, 58, 0.10)",
            backgroundColor: SCHEDULE_COLORS.secondary,
            foregroundColor: SCHEDULE_COLORS.ink,
            glowAccentColor: SCHEDULE_COLORS.primary,
            glowColor: SCHEDULE_COLORS.light,
            subtitleColor: SCHEDULE_COLORS.ink,
          }}
          title="Health Schedule"
        />
        <ScreenSheet>
          <CustomCard style={styles.emptyCard}>
            <EmptyState
              icon={error ? "alert-circle-outline" : "calendar-outline"}
              subtitle={error ?? (loading ? "Loading your schedule." : "Schedule data is unavailable.")}
              title={error ? "Unable to load schedule" : "Preparing schedule"}
            />
          </CustomCard>
        </ScreenSheet>
      </ScreenContainer>
    );
  }

  const { summary } = schedule;
  const hydrationRemaining = summary.waterGoal - summary.waterGlasses;
  const priorityReminder = schedule.timelineEvents.find((event) => event.status === "upcoming");
  const waterTone = getScheduleHabitToneColors("drink-water", "Drink Water");
  const habitsCompletedToday = habitCompletionById.size;
  const totalHabitsDue = schedule.habits.length;
  const medicationsTakenToday = todayMedicationLogs.filter((log) => log.status === "taken").length;
  const medicationsSkippedToday = todayMedicationLogs.filter((log) => log.status === "skipped").length;
  const totalMedicationsDue = schedule.medications.length;
  const remainingMedicationsToday = Math.max(
    0,
    totalMedicationsDue - medicationsTakenToday - medicationsSkippedToday,
  );
  const localTotalTasks = totalHabitsDue + totalMedicationsDue;
  const localCompletedTasks = habitsCompletedToday + medicationsTakenToday;
  const localRemainingTasks = Math.max(
    0,
    (totalHabitsDue - habitsCompletedToday) + remainingMedicationsToday,
  );
  const localCompletionPercent = localTotalTasks > 0
    ? clampPercent(Math.round((localCompletedTasks / localTotalTasks) * 100))
    : 0;
  const handleQuickAddWater = () => {
    Alert.alert(
      "Water tracking",
      "Hydration logging is available in Nutrition for this beta. Use the water buttons there to add 250 ml or 500 ml.",
    );
  };
  const handleEnableNotifications = () => {
    setReminderBusyKey("permission");
    void requestNotificationPermission()
      .then((status) => {
        setNotificationStatus(status);
        Alert.alert(
          status === "granted" ? "Notifications enabled" : "Notifications unavailable",
          status === "granted"
            ? "Healthy You can schedule local reminders on this device."
            : notificationUnavailableMessage(status),
        );
      })
      .finally(() => {
        setReminderBusyKey(null);
        void refreshReminderState();
      });
  };
  const handleScheduleMedicationReminder = (medication: MedicationReminder) => {
    const key = getReminderKey("medication", medication.id);

    setReminderBusyKey(key);
    void scheduleMedicationReminder(medication)
      .then((result) => {
        Alert.alert(
          result.ok ? "Reminder scheduled" : "Reminder unavailable",
          result.ok ? `Daily local reminder set for ${result.record.timeLabel}.` : result.message,
        );
      })
      .finally(() => {
        setReminderBusyKey(null);
        void refreshReminderState();
      });
  };
  const handleScheduleHabitReminder = (habit: Habit) => {
    const key = getReminderKey("habit", habit.id);

    setReminderBusyKey(key);
    void scheduleHabitReminder(habit)
      .then((result) => {
        Alert.alert(
          result.ok ? "Reminder scheduled" : "Reminder unavailable",
          result.ok ? `Daily local reminder set for ${result.record.timeLabel}.` : result.message,
        );
      })
      .finally(() => {
        setReminderBusyKey(null);
        void refreshReminderState();
      });
  };
  const handleScheduleHydrationReminder = () => {
    const key = getHydrationReminderKey();

    setReminderBusyKey(key);
    void scheduleHydrationReminder()
      .then((result) => {
        Alert.alert(
          result.ok ? "Reminder scheduled" : "Reminder unavailable",
          result.ok ? `Daily hydration reminder set for ${result.record.timeLabel}.` : result.message,
        );
      })
      .finally(() => {
        setReminderBusyKey(null);
        void refreshReminderState();
      });
  };
  const handleCancelReminder = (key: string) => {
    setReminderBusyKey(key);
    void cancelScheduledReminder(key)
      .then(() => {
        Alert.alert("Reminder removed", "This local reminder was cancelled on this device.");
      })
      .finally(() => {
        setReminderBusyKey(null);
        void refreshReminderState();
      });
  };
  const handleAddAppointmentToCalendar = (appointment: Appointment) => {
    Alert.alert(
      "Add to device calendar?",
      "Healthy You will add a generic wellness appointment title to your calendar to avoid exposing sensitive details.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add",
          onPress: () => {
            void addAppointmentToDeviceCalendar(appointment).then((result) => {
              Alert.alert(
                result.ok ? "Calendar event added" : "Calendar unavailable",
                result.ok
                  ? `A generic wellness event was added to ${result.calendarTitle}.`
                  : result.message,
              );
            });
          },
        },
      ],
    );
  };
  const renderReminderAction = (
    key: string,
    onSchedule: () => void,
    inactiveLabel: string,
  ) => {
    const reminder = reminderByKey.get(key);
    const isBusy = reminderBusyKey === key;

    return (
      <TouchableOpacity
        accessibilityLabel={reminder ? `Cancel ${inactiveLabel}` : inactiveLabel}
        accessibilityRole="button"
        activeOpacity={0.82}
        disabled={isBusy}
        onPress={reminder ? () => handleCancelReminder(key) : onSchedule}
        style={[styles.reminderActionButton, reminder && styles.reminderCancelButton, isBusy && styles.disabledAction]}
      >
        <Ionicons
          color={reminder ? COLORS.textMuted : COLORS.white}
          name={reminder ? "notifications-off-outline" : "notifications-outline"}
          size={15}
        />
        <Text style={[styles.reminderActionText, reminder && styles.reminderCancelText]}>
          {isBusy ? "Updating..." : reminder ? `On at ${reminder.timeLabel}` : "Daily reminder"}
        </Text>
      </TouchableOpacity>
    );
  };
  const handleScheduleAction = (title: string) => {
    if (title.toLowerCase().includes("medication")) {
      Alert.alert(
        "Medication tracking",
        "Use today's medication cards to mark taken or skipped. Use each Daily reminder button for local reminders. Custom medication setup is coming after beta.",
      );
      return;
    }

    if (title.toLowerCase().includes("habit")) {
      Alert.alert(
        "Habit tracking",
        "Use today's habit cards to mark completion. Use each Daily reminder button for local reminders. Custom habit setup is coming after beta.",
      );
      return;
    }

    Alert.alert(
      title,
      "Custom schedule creation is coming after beta. For now, use the visible habit and medication cards to track today's local progress.",
    );
  };
  const handleCompleteHabit = (habitId: string) => {
    const habit = schedule.habits.find((item) => item.id === habitId);
    if (!habit) return;

    void completeHabit({
      habitId: habit.id,
      habitTitle: habit.title,
      category: habit.tone,
      streakLabel: habit.streak,
    }).then(() => {
      Alert.alert("Habit complete", `${habit.title} was marked complete for today.`);
    });
  };
  const handleUndoHabit = (completion: HabitCompletionEntry) => {
    Alert.alert("Undo habit", `Mark ${completion.habitTitle} as due again for today?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Undo",
        style: "destructive",
        onPress: () => {
          void uncompleteHabit(completion.habitId).then(() => {
            Alert.alert("Habit updated", `${completion.habitTitle} is due again today.`);
          });
        },
      },
    ]);
  };
  const handleMedicationStatus = (medicationId: string, status: "taken" | "skipped") => {
    const medication = schedule.medications.find((item) => item.id === medicationId);
    if (!medication) return;

    void logMedication({
      medicationId: medication.id,
      medicationName: medication.name,
      dosage: medication.dosage,
      scheduledTime: medication.time,
      status,
    }).then(() => {
      Alert.alert(
        status === "taken" ? "Medication taken" : "Medication skipped",
        `${medication.name} was marked ${status} for today.`,
      );
    });
  };
  const handleClearMedication = (log: MedicationLogEntry) => {
    Alert.alert("Clear medication status", `Clear today's status for ${log.medicationName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          void clearMedicationLog(log.medicationId).then(() => {
            Alert.alert("Medication updated", `${log.medicationName} is pending again today.`);
          });
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <AppHeader
        subtitle="Stay on track with your daily goals"
        theme={{
          actionBackgroundColor: "rgba(97, 19, 58, 0.10)",
          backgroundColor: SCHEDULE_COLORS.secondary,
          foregroundColor: SCHEDULE_COLORS.ink,
          glowAccentColor: SCHEDULE_COLORS.primary,
          glowColor: SCHEDULE_COLORS.light,
          subtitleColor: SCHEDULE_COLORS.ink,
        }}
        title="Health Schedule"
      >
        <CustomCard style={styles.headerCard}>
          <ProgressRing
            backgroundColor={SCHEDULE_COLORS.light}
            color={SCHEDULE_COLORS.dark}
            max={100}
            size={76}
            value={localCompletionPercent}
          />
          <View style={styles.headerCopy}>
            <Text style={styles.headerMetric}>{localCompletionPercent}% Complete</Text>
            <Text style={styles.headerText}>
              {localCompletedTasks} of {localTotalTasks} habit and medication tasks done today
            </Text>
          </View>
        </CustomCard>
      </AppHeader>

      <ScreenSheet>
        <CustomCard style={styles.overviewCard}>
          <View style={styles.overviewFocus}>
            <ProgressRing
              backgroundColor={SCHEDULE_COLORS.light}
              color={SCHEDULE_COLORS.dark}
              max={Math.max(1, localTotalTasks)}
              size={112}
              value={localCompletedTasks}
            />
            <View style={styles.overviewCopy}>
              <Text style={styles.overviewTitle}>Today Overview</Text>
              <Text style={styles.overviewValue}>
                {localCompletedTasks} / {localTotalTasks} Completed
              </Text>
              <Text style={styles.overviewText}>
                {localRemainingTasks} habit and medication tasks remaining in your plan.
              </Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <StatsCard
              icon="checkmark-done-outline"
              subtitle="Tasks completed"
              title="Completed"
              tone="accent"
              toneColorsOverride={getScheduleToneColors("accent")}
              value={`${localCompletedTasks}`}
            />
            <StatsCard
              icon="time-outline"
              subtitle="Still scheduled"
              title="Remaining"
              tone="warning"
              toneColorsOverride={getScheduleToneColors("warning")}
              value={`${localRemainingTasks}`}
            />
          </View>
        </CustomCard>

        <DashboardSection title="Local Reminders" />
        <CustomCard style={styles.localReminderCard}>
          <View style={styles.localReminderHeader}>
            <View style={styles.localReminderIcon}>
              <Ionicons color={SCHEDULE_COLORS.dark} name="notifications-outline" size={20} />
            </View>
            <View style={styles.localReminderCopy}>
              <Text style={styles.localReminderTitle}>Device reminders</Text>
              <Text style={styles.localReminderText}>
                {notificationStatus === "granted"
                  ? `${scheduledReminders.length} local health reminder${scheduledReminders.length === 1 ? "" : "s"} scheduled.`
                  : `${notificationStatusLabel(notificationStatus)}. Enable notifications to schedule local habit, medication, and hydration reminders.`}
              </Text>
            </View>
          </View>
          <View style={styles.localReminderActions}>
            <TouchableOpacity
              accessibilityLabel="Enable local reminders"
              accessibilityRole="button"
              activeOpacity={0.82}
              disabled={reminderBusyKey === "permission"}
              onPress={handleEnableNotifications}
              style={[styles.reminderActionButton, reminderBusyKey === "permission" && styles.disabledAction]}
            >
              <Ionicons color={COLORS.white} name="shield-checkmark-outline" size={15} />
              <Text style={styles.reminderActionText}>
                {reminderBusyKey === "permission" ? "Checking..." : notificationStatus === "granted" ? "Enabled" : "Enable"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Refresh local reminder status"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => void refreshReminderState()}
              style={[styles.reminderActionButton, styles.reminderSecondaryButton]}
            >
              <Ionicons color={SCHEDULE_COLORS.dark} name="refresh-outline" size={15} />
              <Text style={[styles.reminderActionText, styles.reminderSecondaryText]}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </CustomCard>

        <DashboardSection title="Today's Timeline" />
        {schedule.timelineEvents.length > 0 ? (
          <View style={styles.timeline}>
            {schedule.timelineEvents.map((event, index) => (
              <TimelineEventCard
                event={event}
                isLast={index === schedule.timelineEvents.length - 1}
                key={event.id}
              />
            ))}
          </View>
        ) : (
          <CustomCard style={styles.emptyCard}>
            <EmptyState
              icon="calendar-outline"
              subtitle="Your timed health tasks will appear here."
              title="No timeline events"
            />
          </CustomCard>
        )}

        {priorityReminder ? (
          <ReminderCard
            icon={priorityReminder.iconName}
            accentColor={SCHEDULE_COLORS.dark}
            backgroundColor={SCHEDULE_COLORS.light}
            repeatLabel="Smart planner reminder"
            status={priorityReminder.subtitle}
            time={priorityReminder.time}
            title={priorityReminder.title}
          />
        ) : null}

        <DashboardSection title="Medication Reminders" />
        <View style={styles.statsGrid}>
          <StatsCard
            icon="checkmark-circle-outline"
            subtitle="logged today"
            title="Taken"
            tone="accent"
            toneColorsOverride={getScheduleToneColors("accent")}
            value={`${medicationsTakenToday}`}
          />
          <StatsCard
            icon="close-circle-outline"
            subtitle="logged today"
            title="Skipped"
            tone="danger"
            toneColorsOverride={getScheduleToneColors("danger")}
            value={`${medicationsSkippedToday}`}
          />
          <StatsCard
            icon="time-outline"
            subtitle="not logged"
            title="Remaining"
            tone="warning"
            toneColorsOverride={getScheduleToneColors("warning")}
            value={`${remainingMedicationsToday}`}
          />
        </View>
        {schedule.medications.length > 0 ? (
          <View style={[styles.list, styles.sectionGap]}>
            {schedule.medications.map((medication) => {
              const log = medicationLogById.get(medication.id);

              return (
                <MedicationReminderCard
                  key={medication.id}
                  localStatus={log?.status}
                  loggedAt={log ? timeLabel(log.loggedAt) : undefined}
                  medication={medication}
                  onClear={log ? () => handleClearMedication(log) : undefined}
                  reminderAction={renderReminderAction(
                    getReminderKey("medication", medication.id),
                    () => handleScheduleMedicationReminder(medication),
                    `${medication.name} reminder`,
                  )}
                  onSkip={() => handleMedicationStatus(medication.id, "skipped")}
                  onTaken={() => handleMedicationStatus(medication.id, "taken")}
                />
              );
            })}
          </View>
        ) : (
          <CustomCard style={styles.emptyCard}>
            <EmptyState
              icon="medkit-outline"
              subtitle="Add prescriptions, supplements, and refill reminders to your health planner."
              title="No medication reminders"
            />
          </CustomCard>
        )}

        <DashboardSection title="Water Tracking" />
        <CustomCard style={styles.hydrationCard}>
          <ProgressRing
            max={summary.waterGoal}
            backgroundColor={waterTone.background}
            color={waterTone.foreground}
            size={96}
            value={summary.waterGlasses}
          />
          <View style={styles.hydrationCopy}>
            <Text style={styles.sectionLabel}>Today's Water Intake</Text>
            <Text style={styles.hydrationValue}>
              {summary.waterGlasses} / {summary.waterGoal} Glasses
            </Text>
            <Text style={styles.helperText}>
              {hydrationRemaining} glasses remaining to meet your daily goal.
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Quick add water"
            accessibilityRole="button"
            activeOpacity={0.84}
            onPress={handleQuickAddWater}
            style={[styles.quickAddButton, { backgroundColor: waterTone.foreground }]}
          >
            <Ionicons color={COLORS.white} name="add" size={20} />
            <Text style={styles.quickAddText}>Quick Add</Text>
          </TouchableOpacity>
          {renderReminderAction(
            getHydrationReminderKey(),
            handleScheduleHydrationReminder,
            "hydration reminder",
          )}
        </CustomCard>

        <DashboardSection title="Sleep Schedule" />
        <SleepScheduleCard schedule={schedule.sleepSchedule} />

        <DashboardSection title="Appointments" />
        {schedule.appointments.length > 0 ? (
          <View style={styles.list}>
            {schedule.appointments.map((appointment) => (
              <AppointmentCard
                appointment={appointment}
                key={appointment.id}
                onAddToCalendar={() => handleAddAppointmentToCalendar(appointment)}
              />
            ))}
          </View>
        ) : (
          <CustomCard style={styles.emptyCard}>
            <EmptyState
              icon="calendar-outline"
              subtitle="Upcoming doctor visits and health checkups will appear here."
              title="No appointments scheduled"
            />
          </CustomCard>
        )}

        <DashboardSection title="Daily Habits" />
        <View style={styles.statsGrid}>
          <StatsCard
            icon="checkmark-done-outline"
            subtitle={scheduleHydrated ? "completed today" : "loading log"}
            title="Habits Done"
            tone="accent"
            toneColorsOverride={getScheduleToneColors("accent")}
            value={`${habitsCompletedToday}`}
          />
          <StatsCard
            icon="list-outline"
            subtitle="daily templates"
            title="Due Today"
            tone="primary"
            toneColorsOverride={getScheduleToneColors("primary")}
            value={`${totalHabitsDue}`}
          />
        </View>
        {schedule.habits.length > 0 ? (
          <View style={[styles.habitGrid, styles.sectionGap]}>
            {schedule.habits.map((habit) => {
              const completion = habitCompletionById.get(habit.id);

              return (
                <HabitTrackerCard
                  completedAt={completion ? timeLabel(completion.completedAt) : undefined}
                  habit={habit}
                  isCompletedToday={Boolean(completion)}
                  key={habit.id}
                  onComplete={() => handleCompleteHabit(habit.id)}
                  reminderAction={renderReminderAction(
                    getReminderKey("habit", habit.id),
                    () => handleScheduleHabitReminder(habit),
                    `${habit.title} reminder`,
                  )}
                  onUndoComplete={completion ? () => handleUndoHabit(completion) : undefined}
                />
              );
            })}
          </View>
        ) : (
          <CustomCard style={styles.emptyCard}>
            <EmptyState
              icon="checkmark-circle-outline"
              subtitle="Daily habits will appear after you create a routine."
              title="No daily habits"
            />
          </CustomCard>
        )}

        <DashboardSection title="Weekly Adherence" />
        <ActivityChart
          accentColor={SCHEDULE_COLORS.dark}
          labels={schedule.adherenceData.labels}
          subtitle="Health routine consistency"
          title="Medication Adherence"
          trackColor={SCHEDULE_COLORS.light}
          values={schedule.adherenceData.values}
        />

        <DashboardSection title="Quick Actions" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionRail}
        >
          {schedule.actions.map((action) => (
            <View key={action.id} style={styles.actionItem}>
              <ActionCard
                iconName={action.iconName}
                onPress={() => handleScheduleAction(action.title)}
                title={action.title}
                tone={action.tone}
                toneColorsOverride={getScheduleToneColors(action.tone)}
              />
            </View>
          ))}
        </ScrollView>
      </ScreenSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    flexDirection: "row",
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  headerCopy: {
    flex: 1,
  },
  headerMetric: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  headerText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
  overviewCard: {
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  overviewFocus: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
  },
  overviewCopy: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  overviewTitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  overviewValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
  },
  overviewText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  localReminderCard: {
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  localReminderHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
  },
  localReminderIcon: {
    alignItems: "center",
    backgroundColor: SCHEDULE_COLORS.light,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  localReminderCopy: {
    flex: 1,
    minWidth: 0,
  },
  localReminderTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  localReminderText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
    marginTop: SPACING.xs,
  },
  localReminderActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  reminderActionButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: SCHEDULE_COLORS.dark,
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.xs,
    minHeight: 34,
    paddingHorizontal: SPACING.md,
  },
  reminderActionText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  reminderCancelButton: {
    backgroundColor: COLORS.surfaceMuted,
  },
  reminderCancelText: {
    color: COLORS.textMuted,
  },
  reminderSecondaryButton: {
    backgroundColor: SCHEDULE_COLORS.light,
  },
  reminderSecondaryText: {
    color: SCHEDULE_COLORS.dark,
  },
  disabledAction: {
    opacity: 0.58,
  },
  timeline: {
    marginTop: SPACING.xs,
  },
  list: {
    gap: SPACING.md,
  },
  sectionGap: {
    marginTop: SPACING.md,
  },
  emptyCard: {
    padding: 0,
  },
  hydrationCard: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  hydrationCopy: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  hydrationValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
  quickAddButton: {
    alignItems: "center",
    backgroundColor: SCHEDULE_COLORS.dark,
    borderRadius: SPACING.xl,
    flexDirection: "row",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.soft,
  },
  quickAddText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  habitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  actionRail: {
    gap: SPACING.md,
    paddingRight: SPACING.lg,
  },
  actionItem: {
    minWidth: SPACING.cardMinWidth,
  },
});
