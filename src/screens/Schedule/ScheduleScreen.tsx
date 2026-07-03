import React from "react";
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
import { COLORS, SCHEDULE_COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getScheduleHabitToneColors, getScheduleToneColors } from "../../utils/tone";

export default function ScheduleScreen() {
  const { data, error, loading } = useHealthData();
  const schedule = data.schedule;

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
  const handleQuickAddWater = () => {
    Alert.alert("Water Tracking", "One glass of water is ready to log when tracking is connected.");
  };
  const handleScheduleAction = (title: string) => {
    Alert.alert(title, "This action is ready for the next connected workflow.");
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
            value={summary.completionPercent}
          />
          <View style={styles.headerCopy}>
            <Text style={styles.headerMetric}>{summary.completionPercent}% Complete</Text>
            <Text style={styles.headerText}>
              {summary.completedTasks} of {summary.totalTasks} health tasks done today
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
              max={summary.totalTasks}
              size={112}
              value={summary.completedTasks}
            />
            <View style={styles.overviewCopy}>
              <Text style={styles.overviewTitle}>Today Overview</Text>
              <Text style={styles.overviewValue}>
                {summary.completedTasks} / {summary.totalTasks} Completed
              </Text>
              <Text style={styles.overviewText}>
                {summary.remainingTasks} important tasks remaining in your plan.
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
              value={`${summary.completedTasks}`}
            />
            <StatsCard
              icon="time-outline"
              subtitle="Still scheduled"
              title="Remaining"
              tone="warning"
              toneColorsOverride={getScheduleToneColors("warning")}
              value={`${summary.remainingTasks}`}
            />
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
        {schedule.medications.length > 0 ? (
          <View style={styles.list}>
            {schedule.medications.map((medication) => (
              <MedicationReminderCard key={medication.id} medication={medication} />
            ))}
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
        </CustomCard>

        <DashboardSection title="Sleep Schedule" />
        <SleepScheduleCard schedule={schedule.sleepSchedule} />

        <DashboardSection title="Appointments" />
        {schedule.appointments.length > 0 ? (
          <View style={styles.list}>
            {schedule.appointments.map((appointment) => (
              <AppointmentCard appointment={appointment} key={appointment.id} />
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
        {schedule.habits.length > 0 ? (
          <View style={styles.habitGrid}>
            {schedule.habits.map((habit) => (
              <HabitTrackerCard habit={habit} key={habit.id} />
            ))}
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
  timeline: {
    marginTop: SPACING.xs,
  },
  list: {
    gap: SPACING.md,
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
