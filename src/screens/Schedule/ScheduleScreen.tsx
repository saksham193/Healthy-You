import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppointmentCard from "../../components/schedule/AppointmentCard";
import CustomRoutineCard from "../../components/schedule/CustomRoutineCard";
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
  cancelCustomRoutineReminder,
  cancelScheduledReminder,
  getHydrationReminderKey,
  getReminderKey,
  getStoredNotificationStatus,
  listScheduledReminders,
  parseMedicationReminderTime,
  scheduleCustomRoutineReminder,
  scheduleHabitReminder,
  scheduleHydrationReminder,
  scheduleMedicationReminder,
} from "../../services/notifications/reminderScheduler";
import { COLORS, SCHEDULE_COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getScheduleHabitToneColors, getScheduleToneColors } from "../../utils/tone";
import type {
  Appointment,
  CustomHealthRoutine,
  CustomHealthRoutineType,
  Habit,
  HabitCompletionEntry,
  MedicationLogEntry,
  MedicationReminder,
} from "../../types";
import type {
  HealthReminderRecord,
  NotificationPermissionStatus,
} from "../../services/notifications/reminderTypes";

type CustomRoutineDraft = {
  type: CustomHealthRoutineType;
  name: string;
  notes: string;
  doseLabel: string;
  reminderEnabled: boolean;
  reminderTime: string;
};

const createRoutineDraft = (type: CustomHealthRoutineType): CustomRoutineDraft => ({
  type,
  name: "",
  notes: "",
  doseLabel: "",
  reminderEnabled: false,
  reminderTime: "09:00",
});

const normalizeReminderTime = (value: string): string | null => {
  const parsed = parseMedicationReminderTime(value);
  if (!parsed) return null;

  return `${`${parsed.hour}`.padStart(2, "0")}:${`${parsed.minute}`.padStart(2, "0")}`;
};

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
  const customRoutines = useScheduleStore((state) => state.customRoutines);
  const scheduleHydrated = useScheduleStore((state) => state.hydrated);
  const completeHabit = useScheduleStore((state) => state.completeHabit);
  const uncompleteHabit = useScheduleStore((state) => state.uncompleteHabit);
  const logMedication = useScheduleStore((state) => state.logMedication);
  const clearMedicationLog = useScheduleStore((state) => state.clearMedicationLog);
  const addCustomRoutine = useScheduleStore((state) => state.addCustomRoutine);
  const updateCustomRoutine = useScheduleStore((state) => state.updateCustomRoutine);
  const deleteCustomRoutine = useScheduleStore((state) => state.deleteCustomRoutine);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermissionStatus>("undetermined");
  const [scheduledReminders, setScheduledReminders] = useState<HealthReminderRecord[]>([]);
  const [reminderBusyKey, setReminderBusyKey] = useState<string | null>(null);
  const [routineModalVisible, setRoutineModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<CustomHealthRoutine | null>(null);
  const [routineDraft, setRoutineDraft] = useState<CustomRoutineDraft>(() => createRoutineDraft("habit"));
  const [routineBusyId, setRoutineBusyId] = useState<string | null>(null);
  const [pendingRoutineReminderStates, setPendingRoutineReminderStates] = useState<Record<string, boolean>>({});

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
  const openNewRoutine = (type: CustomHealthRoutineType) => {
    setEditingRoutine(null);
    setRoutineDraft(createRoutineDraft(type));
    setRoutineModalVisible(true);
  };
  const openEditRoutine = (routine: CustomHealthRoutine, enableReminder = routine.reminderEnabled) => {
    setEditingRoutine(routine);
    setRoutineDraft({
      type: routine.type,
      name: routine.name,
      notes: routine.notes ?? "",
      doseLabel: routine.doseLabel ?? "",
      reminderEnabled: enableReminder,
      reminderTime: routine.reminderTime ?? "09:00",
    });
    setRoutineModalVisible(true);
  };
  const closeRoutineModal = () => {
    if (routineBusyId) return;
    setRoutineModalVisible(false);
    setEditingRoutine(null);
  };
  const clearPendingRoutineReminderState = (routineId: string) => {
    setPendingRoutineReminderStates((current) => {
      const next = { ...current };
      delete next[routineId];
      return next;
    });
  };
  const handleSaveCustomRoutine = async () => {
    const name = routineDraft.name.trim();
    if (!name) {
      Alert.alert("Routine name required", "Please enter a routine name.");
      return;
    }

    const hasTime = Boolean(routineDraft.reminderTime.trim());
    if (routineDraft.reminderEnabled && !hasTime) {
      Alert.alert("Reminder time required", "Please choose a reminder time.");
      return;
    }

    const reminderTime = hasTime ? normalizeReminderTime(routineDraft.reminderTime) : undefined;
    if (reminderTime === null) {
      Alert.alert("Invalid reminder time", "Enter a valid time such as 09:00 or 18:30.");
      return;
    }

    const busyId = editingRoutine?.id ?? "new-routine";
    setRoutineBusyId(busyId);

    try {
      const baseInput = {
        type: routineDraft.type,
        name,
        notes: routineDraft.notes,
        doseLabel: routineDraft.doseLabel,
        reminderTime,
      };

      if (!editingRoutine) {
        const created = await addCustomRoutine({ ...baseInput, reminderEnabled: false });

        if (routineDraft.reminderEnabled) {
          const result = await scheduleCustomRoutineReminder({
            ...created,
            reminderEnabled: true,
            reminderTime,
          });

          if (result.ok) {
            await updateCustomRoutine(created.id, {
              ...baseInput,
              reminderEnabled: true,
              reminderNotificationId: result.record.notificationId,
            });
            Alert.alert("Routine saved", "Reminder updated. This reminder is stored locally on your device.");
          } else {
            Alert.alert("Routine saved", `${result.message} The routine was saved with its reminder off.`);
          }
        } else {
          Alert.alert("Routine saved", "This custom routine is stored locally on your device.");
        }
      } else if (!routineDraft.reminderEnabled) {
        await cancelCustomRoutineReminder(editingRoutine);
        await updateCustomRoutine(editingRoutine.id, {
          ...baseInput,
          reminderEnabled: false,
          reminderNotificationId: undefined,
        });
        Alert.alert("Routine updated", "The routine was saved and its local reminder is off.");
      } else {
        const proposed: CustomHealthRoutine = {
          ...editingRoutine,
          ...baseInput,
          reminderEnabled: true,
          reminderTime,
          updatedAt: new Date().toISOString(),
        };
        const result = await scheduleCustomRoutineReminder(proposed);

        if (result.ok) {
          await updateCustomRoutine(editingRoutine.id, {
            ...baseInput,
            reminderEnabled: true,
            reminderNotificationId: result.record.notificationId,
          });
          Alert.alert("Routine updated", "Reminder updated. This reminder is stored locally on your device.");
        } else {
          await updateCustomRoutine(editingRoutine.id, {
            ...baseInput,
            reminderEnabled: editingRoutine.reminderEnabled,
            reminderTime: editingRoutine.reminderTime,
            reminderNotificationId: editingRoutine.reminderNotificationId,
          });
          Alert.alert("Reminder unavailable", `${result.message} Existing reminder settings were kept.`);
        }
      }

      setRoutineModalVisible(false);
      setEditingRoutine(null);
    } catch (saveError) {
      Alert.alert(
        "Unable to save routine",
        saveError instanceof Error ? saveError.message : "This local routine could not be saved right now.",
      );
    } finally {
      setRoutineBusyId(null);
      void refreshReminderState();
    }
  };
  const handleToggleCustomReminder = (routine: CustomHealthRoutine, enabled: boolean) => {
    const reminderTime = routine.reminderTime ? normalizeReminderTime(routine.reminderTime) : null;
    if (enabled && !reminderTime) {
      Alert.alert(
        "Reminder time required",
        "Please choose a valid reminder time before enabling this reminder.",
      );
      openEditRoutine(routine, true);
      return;
    }

    const input = {
      type: routine.type,
      name: routine.name,
      notes: routine.notes,
      doseLabel: routine.doseLabel,
      reminderTime: reminderTime ?? routine.reminderTime,
    };
    setPendingRoutineReminderStates((current) => ({ ...current, [routine.id]: enabled }));
    setRoutineBusyId(routine.id);

    const update = enabled
      ? scheduleCustomRoutineReminder({
          ...routine,
          reminderEnabled: true,
          reminderTime: reminderTime ?? undefined,
        }).then(async (result) => {
          if (!result.ok) {
            Alert.alert("Reminder unavailable", result.message);
            return;
          }

          await updateCustomRoutine(routine.id, {
            ...input,
            reminderEnabled: true,
            reminderNotificationId: result.record.notificationId,
          });
          Alert.alert("Reminder updated", "This reminder is stored locally on your device.");
        })
      : cancelCustomRoutineReminder(routine).then(async () => {
          await updateCustomRoutine(routine.id, {
            ...input,
            reminderEnabled: false,
            reminderNotificationId: undefined,
          });
          Alert.alert("Reminder updated", "This local reminder is now off.");
        });

    void update
      .catch(() => {
        Alert.alert("Reminder unavailable", "Healthy You could not update this local reminder right now.");
      })
      .finally(() => {
        clearPendingRoutineReminderState(routine.id);
        setRoutineBusyId(null);
        void refreshReminderState();
      });
  };
  const handleDeleteCustomRoutine = (routine: CustomHealthRoutine) => {
    Alert.alert("Delete routine?", `Delete ${routine.name} from this device?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setRoutineBusyId(routine.id);
          void cancelCustomRoutineReminder(routine)
            .then(() => deleteCustomRoutine(routine.id))
            .then(() => {
              Alert.alert("Routine deleted", "The routine and its local reminder were removed.");
            })
            .catch(() => {
              Alert.alert("Unable to delete routine", "Healthy You could not remove this routine right now.");
            })
            .finally(() => {
              setRoutineBusyId(null);
              void refreshReminderState();
            });
        },
      },
    ]);
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
      openNewRoutine("medication");
      return;
    }

    if (title.toLowerCase().includes("habit")) {
      openNewRoutine("habit");
      return;
    }

    if (title.toLowerCase().includes("reminder")) {
      Alert.alert(
        "Add custom routine",
        "Choose the type of local routine you want to create.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Medication", onPress: () => openNewRoutine("medication") },
          { text: "Habit", onPress: () => openNewRoutine("habit") },
        ],
      );
      return;
    }

    Alert.alert(
      title,
      "Use Custom Routines to add a local medication or habit routine.",
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

        <DashboardSection title="Custom Routines" />
        <CustomCard style={styles.customRoutineIntro}>
          <View style={styles.customRoutineIntroCopy}>
            <Text style={styles.customRoutineIntroTitle}>Your local routine plan</Text>
            <Text style={styles.customRoutineIntroText}>
              Create medication or habit routines with optional device reminders.
            </Text>
          </View>
          <View style={styles.customRoutineAddActions}>
            <TouchableOpacity
              accessibilityLabel="Add medication routine"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => openNewRoutine("medication")}
              style={styles.customRoutineAddButton}
            >
              <Ionicons color={COLORS.white} name="medkit-outline" size={17} />
              <Text style={styles.customRoutineAddText}>Add Medication</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Add habit routine"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => openNewRoutine("habit")}
              style={[styles.customRoutineAddButton, styles.customRoutineSecondaryButton]}
            >
              <Ionicons color={SCHEDULE_COLORS.dark} name="repeat-outline" size={17} />
              <Text style={[styles.customRoutineAddText, styles.customRoutineSecondaryText]}>Add Habit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.customRoutinePrivacyText}>
            Stored locally on your device. Healthy You reminders use privacy-safe notification text.
          </Text>
        </CustomCard>
        {customRoutines.length > 0 ? (
          <View style={[styles.list, styles.sectionGap]}>
            {customRoutines.map((routine) => (
              <CustomRoutineCard
                busy={routineBusyId === routine.id}
                key={routine.id}
                onDelete={() => handleDeleteCustomRoutine(routine)}
                onEdit={() => openEditRoutine(routine)}
                onToggleReminder={(enabled) => handleToggleCustomReminder(routine, enabled)}
                reminderEnabled={pendingRoutineReminderStates[routine.id] ?? routine.reminderEnabled}
                routine={routine}
              />
            ))}
          </View>
        ) : (
          <CustomCard style={[styles.emptyCard, styles.sectionGap]}>
            <EmptyState
              icon="add-circle-outline"
              subtitle="Add a medication or habit routine to build your local schedule."
              title="No custom routines"
            />
          </CustomCard>
        )}

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

      <Modal
        animationType="slide"
        onRequestClose={closeRoutineModal}
        transparent
        visible={routineModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <CustomCard style={styles.routineFormSheet}>
            <View style={styles.routineFormHeader}>
              <View style={styles.routineFormHeaderCopy}>
                <Text style={styles.routineFormTitle}>
                  {editingRoutine
                    ? `Edit ${routineDraft.type} routine`
                    : `Add ${routineDraft.type} routine`}
                </Text>
                <Text style={styles.routineFormSubtitle}>Stored locally on your device</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close routine form"
                accessibilityRole="button"
                activeOpacity={0.74}
                disabled={Boolean(routineBusyId)}
                onPress={closeRoutineModal}
                style={styles.routineCloseButton}
              >
                <Ionicons color={COLORS.text} name="close" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.routineFormContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.routineInputLabel}>Routine name</Text>
              <TextInput
                accessibilityLabel="Routine name"
                autoCapitalize="sentences"
                editable={!routineBusyId}
                onChangeText={(name) => setRoutineDraft((current) => ({ ...current, name }))}
                placeholder={routineDraft.type === "medication" ? "Morning medication" : "Evening walk"}
                placeholderTextColor={COLORS.textMuted}
                style={styles.routineInput}
                value={routineDraft.name}
              />

              {routineDraft.type === "medication" ? (
                <>
                  <Text style={styles.routineInputLabel}>Optional medication label</Text>
                  <TextInput
                    accessibilityLabel="Optional medication label"
                    editable={!routineBusyId}
                    onChangeText={(doseLabel) => setRoutineDraft((current) => ({ ...current, doseLabel }))}
                    placeholder="As written on your medication label"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.routineInput}
                    value={routineDraft.doseLabel}
                  />
                </>
              ) : null}

              <Text style={styles.routineInputLabel}>Optional note</Text>
              <TextInput
                accessibilityLabel="Optional routine note"
                editable={!routineBusyId}
                multiline
                onChangeText={(notes) => setRoutineDraft((current) => ({ ...current, notes }))}
                placeholder="For example: after breakfast"
                placeholderTextColor={COLORS.textMuted}
                style={[styles.routineInput, styles.routineNotesInput]}
                value={routineDraft.notes}
              />

              <View style={styles.routineReminderSetting}>
                <View style={styles.routineReminderSettingCopy}>
                  <Text style={styles.routineReminderSettingTitle}>Local reminder</Text>
                  <Text style={styles.routineReminderSettingText}>Enable a daily reminder on this device.</Text>
                </View>
                <Switch
                  accessibilityLabel="Enable routine reminder"
                  disabled={Boolean(routineBusyId)}
                  ios_backgroundColor={COLORS.border}
                  onValueChange={(reminderEnabled) => setRoutineDraft((current) => ({
                    ...current,
                    reminderEnabled,
                  }))}
                  thumbColor={COLORS.white}
                  trackColor={{ false: COLORS.border, true: SCHEDULE_COLORS.dark }}
                  value={routineDraft.reminderEnabled}
                />
              </View>

              <Text style={styles.routineInputLabel}>Reminder time</Text>
              <TextInput
                accessibilityLabel="Reminder time"
                autoCapitalize="characters"
                editable={!routineBusyId}
                maxLength={8}
                onChangeText={(reminderTime) => setRoutineDraft((current) => ({ ...current, reminderTime }))}
                placeholder="09:00"
                placeholderTextColor={COLORS.textMuted}
                style={styles.routineInput}
                value={routineDraft.reminderTime}
              />
              <Text style={styles.routineTimeHelp}>Use 24-hour time, for example 08:30 or 18:45.</Text>

              <View style={styles.routinePrivacyNotice}>
                <Ionicons color={SCHEDULE_COLORS.dark} name="shield-checkmark-outline" size={18} />
                <Text style={styles.routinePrivacyNoticeText}>
                  Healthy You reminders say only: Time to check your wellness routine.
                </Text>
              </View>

              <TouchableOpacity
                accessibilityLabel={editingRoutine ? "Save routine changes" : "Save routine"}
                accessibilityRole="button"
                activeOpacity={0.86}
                disabled={Boolean(routineBusyId)}
                onPress={() => void handleSaveCustomRoutine()}
                style={[styles.routineSaveButton, routineBusyId && styles.disabledAction]}
              >
                <Ionicons color={COLORS.white} name="checkmark" size={18} />
                <Text style={styles.routineSaveText}>
                  {routineBusyId ? "Saving..." : editingRoutine ? "Save Changes" : "Save Routine"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </CustomCard>
        </View>
      </Modal>
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
  customRoutineIntro: {
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  customRoutineIntroCopy: {
    gap: SPACING.xs,
  },
  customRoutineIntroTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  customRoutineIntroText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
  },
  customRoutineAddActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  customRoutineAddButton: {
    alignItems: "center",
    backgroundColor: SCHEDULE_COLORS.dark,
    borderRadius: 8,
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
  },
  customRoutineSecondaryButton: {
    backgroundColor: SCHEDULE_COLORS.light,
  },
  customRoutineAddText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  customRoutineSecondaryText: {
    color: SCHEDULE_COLORS.dark,
  },
  customRoutinePrivacyText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
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
  modalBackdrop: {
    backgroundColor: "rgba(20, 13, 53, 0.32)",
    flex: 1,
    justifyContent: "flex-end",
    padding: SPACING.lg,
  },
  routineFormSheet: {
    maxHeight: "90%",
    padding: SPACING.lg,
  },
  routineFormHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
  },
  routineFormHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  routineFormTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    textTransform: "capitalize",
  },
  routineFormSubtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  routineCloseButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  routineFormContent: {
    paddingTop: SPACING.md,
  },
  routineInputLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  routineInput: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.border,
    borderRadius: 8,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.md,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  routineNotesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  routineReminderSetting: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  routineReminderSettingCopy: {
    flex: 1,
    minWidth: 0,
  },
  routineReminderSettingTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  routineReminderSettingText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
    marginTop: SPACING.xs,
  },
  routineTimeHelp: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
  },
  routinePrivacyNotice: {
    alignItems: "flex-start",
    backgroundColor: SCHEDULE_COLORS.light,
    borderRadius: 8,
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    padding: SPACING.md,
  },
  routinePrivacyNoticeText: {
    color: SCHEDULE_COLORS.ink,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 16,
  },
  routineSaveButton: {
    alignItems: "center",
    backgroundColor: SCHEDULE_COLORS.dark,
    borderRadius: 8,
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "center",
    marginTop: SPACING.lg,
    minHeight: 52,
    paddingHorizontal: SPACING.lg,
  },
  routineSaveText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
});
