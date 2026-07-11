import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import FeatureGridCard from "../../components/home/FeatureGridCard";
import WatchSyncCard from "../../components/home/WatchSyncCard";
import CustomCard from "../../components/common/CustomCard";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityChart from "../../components/layout/ActivityChart";
import AppHeader from "../../components/layout/AppHeader";
import DashboardSection from "../../components/layout/DashboardSection";
import ProgressRing from "../../components/layout/ProgressRing";
import ScreenSheet from "../../components/layout/ScreenSheet";
import StatsCard from "../../components/layout/StatsCard";
import EmptyState from "../../components/layout/EmptyState";
import { useHealthData } from "../../hooks/useHealthData";
import { useFitnessStore } from "../../store/fitnessStore";
import { useNutritionStore } from "../../store/nutritionStore";
import { useProfileSettingsStore } from "../../store/profileSettingsStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { COLORS, DATA_COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import { getHomeFeatureToneColors } from "../../utils/tone";
import type { IconName, RootTabParamList, Tone } from "../../types";

type HomeScreenProps = BottomTabScreenProps<RootTabParamList, "Data">;
type HealthDetailKind = "activity" | "dashboard" | "glucose";
type ReportMetric = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: IconName;
  tone: Tone;
};

const getLocalDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getRecentDateKeys = (days: number, now = new Date()): Set<string> => {
  const keys = new Set<string>();

  for (let index = 0; index < days; index += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    keys.add(getLocalDateKey(date));
  }

  return keys;
};

const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

const formatMl = (amountMl: number): string =>
  amountMl >= 1000 ? `${(amountMl / 1000).toFixed(amountMl % 1000 === 0 ? 0 : 1)} L` : `${amountMl} ml`;

const formatPercent = (value: number | null): string =>
  value === null ? "No data" : `${Math.round(value)}%`;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [reportPreviewVisible, setReportPreviewVisible] = useState(false);
  const [healthDetailKind, setHealthDetailKind] = useState<HealthDetailKind | null>(null);
  const { data, error, loading } = useHealthData();
  const healthScore = data.healthScore;
  const vitals = data.vitals;
  const nutritionHydrate = useNutritionStore((state) => state.hydrate);
  const fitnessHydrate = useFitnessStore((state) => state.hydrate);
  const scheduleHydrate = useScheduleStore((state) => state.hydrate);
  const profileHydrate = useProfileSettingsStore((state) => state.hydrate);
  const meals = useNutritionStore((state) => state.meals);
  const hydrationLogs = useNutritionStore((state) => state.hydration);
  const workoutCompletions = useFitnessStore((state) => state.completions);
  const habitCompletions = useScheduleStore((state) => state.habitCompletions);
  const medicationLogs = useScheduleStore((state) => state.medicationLogs);
  const localProfile = useProfileSettingsStore((state) => state.profile);
  const nutritionHydrated = useNutritionStore((state) => state.hydrated);
  const fitnessHydrated = useFitnessStore((state) => state.hydrated);
  const scheduleHydrated = useScheduleStore((state) => state.hydrated);
  const profileHydrated = useProfileSettingsStore((state) => state.hydrated);
  const localDataHydrated = nutritionHydrated && fitnessHydrated && scheduleHydrated && profileHydrated;

  useEffect(() => {
    void nutritionHydrate();
    void fitnessHydrate();
    void scheduleHydrate();
    void profileHydrate();
  }, [fitnessHydrate, nutritionHydrate, profileHydrate, scheduleHydrate]);

  const localReport = useMemo(() => {
    const now = new Date();
    const todayKey = getLocalDateKey(now);
    const weekKeys = getRecentDateKeys(7, now);
    const todayMeals = meals.filter((meal) => meal.dateKey === todayKey);
    const weekMeals = meals.filter((meal) => weekKeys.has(meal.dateKey));
    const todayHydration = hydrationLogs.filter((entry) => entry.dateKey === todayKey);
    const weekHydration = hydrationLogs.filter((entry) => weekKeys.has(entry.dateKey));
    const todayWorkouts = workoutCompletions.filter((entry) => entry.dateKey === todayKey);
    const weekWorkouts = workoutCompletions.filter((entry) => weekKeys.has(entry.dateKey));
    const todayHabits = habitCompletions.filter((entry) => entry.dateKey === todayKey);
    const weekHabits = habitCompletions.filter((entry) => weekKeys.has(entry.dateKey));
    const todayMedication = medicationLogs.filter((entry) => entry.dateKey === todayKey);
    const weekMedication = medicationLogs.filter((entry) => weekKeys.has(entry.dateKey));
    const todayHydrationMl = todayHydration.reduce((sum, entry) => sum + entry.amountMl, 0);
    const weekHydrationMl = weekHydration.reduce((sum, entry) => sum + entry.amountMl, 0);
    const weekCalories = weekMeals.reduce((sum, meal) => sum + meal.calories, 0);
    const weekProtein = weekMeals.reduce((sum, meal) => sum + (meal.protein ?? 0), 0);
    const weekCarbs = weekMeals.reduce((sum, meal) => sum + (meal.carbs ?? 0), 0);
    const weekFat = weekMeals.reduce((sum, meal) => sum + (meal.fat ?? 0), 0);
    const weekActiveMinutes = weekWorkouts.reduce((sum, entry) => sum + entry.durationMinutes, 0);
    const weekWorkoutCalories = weekWorkouts.reduce((sum, entry) => sum + entry.estimatedCalories, 0);
    const todayMedicationTaken = todayMedication.filter((entry) => entry.status === "taken").length;
    const todayMedicationSkipped = todayMedication.filter((entry) => entry.status === "skipped").length;
    const weekMedicationTaken = weekMedication.filter((entry) => entry.status === "taken").length;
    const weekMedicationSkipped = weekMedication.filter((entry) => entry.status === "skipped").length;
    const medicationAdherence = weekMedication.length > 0
      ? (weekMedicationTaken / weekMedication.length) * 100
      : null;
    const uniqueHabitIds = new Set(weekHabits.map((entry) => entry.habitId));
    const habitCompletionRate = uniqueHabitIds.size > 0
      ? Math.min(100, (weekHabits.length / (uniqueHabitIds.size * 7)) * 100)
      : null;
    const todayLogCount = todayMeals.length + todayHydration.length + todayWorkouts.length + todayHabits.length + todayMedication.length;
    const weekLogCount = weekMeals.length + weekHydration.length + weekWorkouts.length + weekHabits.length + weekMedication.length;
    const displayName = localProfile?.name?.split(" ")[0];
    const dailySummary = todayLogCount === 0
      ? "No local wellness logs for today yet. Your briefing will fill in as you log meals, water, workouts, habits, or medication status."
      : [
        displayName ? `${displayName}, today you logged` : "Today you logged",
        [
          pluralize(todayMeals.length, "meal"),
          todayHydrationMl > 0 ? formatMl(todayHydrationMl) : "no hydration yet",
          pluralize(todayWorkouts.length, "workout"),
          pluralize(todayHabits.length, "habit"),
          `${todayMedicationTaken} taken / ${todayMedicationSkipped} skipped medication logs`,
        ].join(", "),
        "from local device data.",
      ].join(" ");
    const nextAction = todayHydrationMl === 0
      ? "Consider logging your first water check-in today."
      : todayMeals.length === 0
        ? "Consider logging your next meal so the weekly report has nutrition context."
        : todayWorkouts.length === 0
          ? "Consider a short movement block if it fits your day."
          : todayMedicationSkipped > 0
            ? "Review skipped medication logs and follow your existing care plan."
            : "Keep the routine steady and add the next local check-in when it happens.";
    const insightText = weekLogCount === 0
      ? "Reports are in empty-state mode because no local Phase 4C logs are stored on this device."
      : `This week has ${pluralize(weekLogCount, "local wellness entry", "local wellness entries")} across nutrition, hydration, fitness, habits, and medication tracking.`;
    const analytics: ReportMetric[] = [
      {
        id: "meals",
        title: "Meals Logged",
        value: `${weekMeals.length}`,
        subtitle: `${weekCalories} kcal this week`,
        icon: "restaurant-outline",
        tone: "accent",
      },
      {
        id: "hydration",
        title: "Avg Hydration",
        value: formatMl(Math.round(weekHydrationMl / 7)),
        subtitle: `${formatMl(weekHydrationMl)} over 7 days`,
        icon: "water-outline",
        tone: "primary",
      },
      {
        id: "workouts",
        title: "Workouts",
        value: `${weekWorkouts.length}`,
        subtitle: `${weekActiveMinutes} active minutes`,
        icon: "barbell-outline",
        tone: "primary",
      },
      {
        id: "habits",
        title: "Habit Logs",
        value: `${weekHabits.length}`,
        subtitle: `${formatPercent(habitCompletionRate)} logged habit rate`,
        icon: "checkmark-done-outline",
        tone: "accent",
      },
      {
        id: "medication",
        title: "Medication",
        value: formatPercent(medicationAdherence),
        subtitle: `${weekMedicationTaken} taken / ${weekMedicationSkipped} skipped`,
        icon: "medical-outline",
        tone: "warning",
      },
      {
        id: "activity",
        title: "Local Activity",
        value: `${weekLogCount}`,
        subtitle: "Phase 4C local entries",
        icon: "analytics-outline",
        tone: "primary",
      },
    ];
    const previewLines = [
      `Report date: ${todayKey}`,
      `Source: local device logs from the last 7 days.`,
      `Profile display goal: ${localProfile?.primaryGoal ?? "Not set"}`,
      `Meals: ${weekMeals.length} (${weekCalories} kcal)`,
      `Macros: ${Math.round(weekProtein)}g protein, ${Math.round(weekCarbs)}g carbs, ${Math.round(weekFat)}g fat when logged`,
      `Hydration: ${formatMl(weekHydrationMl)} total, ${formatMl(Math.round(weekHydrationMl / 7))} daily average`,
      `Workouts: ${weekWorkouts.length}, ${weekActiveMinutes} active minutes, ${weekWorkoutCalories} estimated kcal`,
      `Habits: ${weekHabits.length} completions, ${formatPercent(habitCompletionRate)} logged habit rate`,
      `Medication: ${weekMedicationTaken} taken, ${weekMedicationSkipped} skipped, ${formatPercent(medicationAdherence)} taken ratio`,
      "Boundary: this is a wellness summary, not a diagnosis or treatment recommendation.",
    ];

    return {
      analytics,
      dailySummary,
      insightText,
      nextAction,
      previewLines,
      today: {
        dateKey: todayKey,
        meals: todayMeals.length,
        hydrationMl: todayHydrationMl,
        workouts: todayWorkouts.length,
        activeMinutes: todayWorkouts.reduce((sum, entry) => sum + entry.durationMinutes, 0),
        habits: todayHabits.length,
        medicationTaken: todayMedicationTaken,
        medicationSkipped: todayMedicationSkipped,
        totalLogs: todayLogCount,
      },
      week: {
        meals: weekMeals.length,
        calories: weekCalories,
        protein: Math.round(weekProtein),
        carbs: Math.round(weekCarbs),
        fat: Math.round(weekFat),
        hydrationMl: weekHydrationMl,
        averageHydrationMl: Math.round(weekHydrationMl / 7),
        workouts: weekWorkouts.length,
        activeMinutes: weekActiveMinutes,
        workoutCalories: weekWorkoutCalories,
        habits: weekHabits.length,
        medicationTaken: weekMedicationTaken,
        medicationSkipped: weekMedicationSkipped,
        medicationAdherence,
        habitCompletionRate,
        totalLogs: weekLogCount,
      },
    };
  }, [habitCompletions, hydrationLogs, localProfile, meals, medicationLogs, workoutCompletions]);

  const handleFeaturePress = (id: string) => {
    if (id === "nutrition") {
      navigation.navigate("Nutrition");
      return;
    }

    if (id === "fitness") {
      navigation.navigate("Fitness");
      return;
    }

    if (id === "schedule") {
      navigation.navigate("Schedule");
      return;
    }

    Alert.alert("Sleep", "Sleep details are summarized on your dashboard.");
  };
  const detailTitle = healthDetailKind === "activity"
    ? "Daily Activity Summary"
    : healthDetailKind === "dashboard"
      ? "Health Dashboard"
      : "Blood Glucose Levels";
  const detailLines = healthDetailKind === "activity"
    ? vitals?.healthSummaries.map((summary) => `${summary.title}: ${summary.value} ${summary.suffix}`) ?? []
    : healthDetailKind === "dashboard"
      ? vitals?.labels.map((label, index) => `${label}: ${vitals.bloodPressurePoints[index] ?? "No data"}`) ?? []
      : vitals?.labels.map((label, index) => `${label}: ${vitals.glucosePoints[index] ?? "No data"}`) ?? [];

  if (!vitals || !healthScore) {
    return (
      <ScreenContainer>
        <View style={styles.shell}>
          <AppHeader
            showSearch
            theme={{
              actionBackgroundColor: "rgba(113, 63, 18, 0.10)",
              backgroundColor: DATA_COLORS.primary,
              foregroundColor: DATA_COLORS.ink,
              glowAccentColor: DATA_COLORS.secondary,
              glowColor: DATA_COLORS.light,
              subtitleColor: DATA_COLORS.ink,
            }}
            title="Your Health Overview"
          />
          <ScreenSheet>
            <EmptyState
              accentColor={DATA_COLORS.dark}
              backgroundColor={DATA_COLORS.light}
              icon={error ? "alert-circle-outline" : "pulse-outline"}
              loading={!error && loading}
              subtitle={error ?? (loading ? "Loading your health dashboard." : "Health dashboard data is unavailable.")}
              title={error ? "Unable to load dashboard" : "Preparing dashboard"}
            />
          </ScreenSheet>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.shell}>
        <AppHeader
          showSearch
          theme={{
            actionBackgroundColor: "rgba(113, 63, 18, 0.10)",
            backgroundColor: DATA_COLORS.primary,
            foregroundColor: DATA_COLORS.ink,
            glowAccentColor: DATA_COLORS.secondary,
            glowColor: DATA_COLORS.light,
            subtitleColor: DATA_COLORS.ink,
          }}
          title="Your Health Overview"
        />

        <ScreenSheet>
          <CustomCard style={styles.healthScoreCard}>
            <ProgressRing
              backgroundColor={DATA_COLORS.light}
              color={DATA_COLORS.dark}
              max={100}
              size={92}
              value={healthScore.score}
            />
            <View style={styles.healthScoreCopy}>
              <Text style={styles.eyebrow}>Today's Health Score</Text>
              <Text style={styles.healthScoreValue}>{healthScore.score} / 100</Text>
              <View style={styles.healthScoreMeta}>
                <View style={styles.healthStatusChip}>
                  <Ionicons color={DATA_COLORS.ink} name="sparkles-outline" size={14} />
                  <Text style={styles.healthStatusText}>{healthScore.status}</Text>
                </View>
                <Text numberOfLines={2} style={styles.healthChange}>{healthScore.change}</Text>
              </View>
            </View>
          </CustomCard>

          <DashboardSection
            actionLabel="Preview"
            onPress={() => setReportPreviewVisible(true)}
            title="Daily Briefing & Reports"
          />

          <CustomCard style={styles.briefingCard}>
            <View style={styles.briefingHeader}>
              <View style={styles.briefingIcon}>
                <Ionicons color={DATA_COLORS.ink} name="newspaper-outline" size={24} />
              </View>
              <View style={styles.briefingTitleWrap}>
                <Text style={styles.eyebrow}>Local beta briefing</Text>
                <Text style={styles.briefingTitle}>Daily Briefing</Text>
              </View>
            </View>
            <Text style={styles.briefingText}>{localDataHydrated ? localReport.dailySummary : "Loading local report data."}</Text>
            <View style={styles.nextActionBox}>
              <Text style={styles.nextActionLabel}>Next step</Text>
              <Text style={styles.nextActionText}>{localReport.nextAction}</Text>
            </View>
            {localReport.today.totalLogs === 0 && localDataHydrated ? (
              <EmptyState
                accentColor={DATA_COLORS.dark}
                backgroundColor={DATA_COLORS.light}
                icon="document-text-outline"
                subtitle="Log a meal, water, workout, habit, or medication status to populate this briefing with local data."
                title="No local logs today"
              />
            ) : null}
          </CustomCard>

          <CustomCard style={styles.weeklyReportCard}>
            <View style={styles.reportHeaderRow}>
              <View>
                <Text style={styles.eyebrow}>7-day local summary</Text>
                <Text style={styles.reportTitle}>Weekly Health Summary</Text>
              </View>
              <View style={styles.localChip}>
                <Text style={styles.localChipText}>Local only</Text>
              </View>
            </View>
            <Text style={styles.reportSummary}>{localReport.insightText}</Text>
            <View style={styles.reportRows}>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Nutrition</Text>
                <Text style={styles.reportValue}>{localReport.week.meals} meals, {localReport.week.calories} kcal</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Hydration</Text>
                <Text style={styles.reportValue}>{formatMl(localReport.week.hydrationMl)} total</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Fitness</Text>
                <Text style={styles.reportValue}>{localReport.week.workouts} workouts, {localReport.week.activeMinutes} mins</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Habits</Text>
                <Text style={styles.reportValue}>{localReport.week.habits} completions</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Medication</Text>
                <Text style={styles.reportValue}>{localReport.week.medicationTaken} taken, {localReport.week.medicationSkipped} skipped</Text>
              </View>
            </View>
          </CustomCard>

          <DashboardSection title="Local Analytics" />
          <View style={styles.summaryGrid}>
            {localReport.analytics.map((metric) => (
              <StatsCard
                icon={metric.icon}
                key={metric.id}
                style={styles.summaryCard}
                subtitle={metric.subtitle}
                title={metric.title}
                tone={metric.tone}
                value={metric.value}
              />
            ))}
          </View>

          <DashboardSection
            actionLabel="See All"
            onPress={() => setHealthDetailKind("activity")}
            title="Daily Activity Summary"
          />

          <View style={styles.summaryGrid}>
            {vitals.healthSummaries.map((summary) => (
              <StatsCard
                icon={summary.iconName}
                key={summary.id}
                style={styles.summaryCard}
                subtitle={summary.suffix}
                title={summary.title}
                tone={summary.tone}
                value={summary.value}
              />
            ))}
          </View>

          <DashboardSection
            actionLabel="See All"
            onPress={() => setHealthDetailKind("dashboard")}
            title="Health Dashboard"
          />
          <ActivityChart
            labels={vitals.labels}
            accentColor={DATA_COLORS.dark}
            subtitle="Systolic / Diastolic"
            title="Blood Pressure"
            trackColor={DATA_COLORS.light}
            values={vitals.bloodPressurePoints}
          />

          <DashboardSection
            actionLabel="See All"
            onPress={() => setHealthDetailKind("glucose")}
            title="Blood Glucose Levels"
          />
          <ActivityChart
            accentColor={DATA_COLORS.dark}
            labels={vitals.labels}
            mode="dot"
            trackColor={DATA_COLORS.light}
            values={vitals.glucosePoints}
          />

          <View style={styles.summaryGrid}>
            <StatsCard
              icon="moon-outline"
              style={styles.summaryCard}
              subtitle="Rest Duration"
              title="Sleep Record"
              tone="warning"
              value="5-6 hours"
            />
            <StatsCard
              icon="analytics-outline"
              style={styles.summaryCard}
              subtitle="Quality"
              title="Sleep Quality"
              tone="warning"
              value="31%"
            />
          </View>

          <DashboardSection title="Feature Cards" />
          <View style={styles.featureGrid}>
            {vitals.homeFeatures.map((feature) => (
              <FeatureGridCard
                feature={feature}
                key={feature.id}
                onPress={() => handleFeaturePress(feature.id)}
                toneColorsOverride={getHomeFeatureToneColors(feature.id, feature.tone)}
              />
            ))}
          </View>

          <WatchSyncCard />
        </ScreenSheet>
      </View>
      <Modal
        animationType="fade"
        onRequestClose={() => setReportPreviewVisible(false)}
        transparent
        visible={reportPreviewVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reportModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.eyebrow}>Export-ready preview</Text>
                <Text style={styles.modalTitle}>Local Weekly Report</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close local report preview"
                accessibilityRole="button"
                onPress={() => setReportPreviewVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons color={COLORS.text} name="close-outline" size={28} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.previewScroll}>
              {localReport.previewLines.map((line) => (
                <Text key={line} style={styles.previewLine}>{line}</Text>
              ))}
            </ScrollView>
            <TouchableOpacity
              accessibilityLabel="Close report preview"
              accessibilityRole="button"
              activeOpacity={0.76}
              onPress={() => setReportPreviewVisible(false)}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => setHealthDetailKind(null)}
        transparent
        visible={Boolean(healthDetailKind)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reportModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.eyebrow}>Local dashboard details</Text>
                <Text style={styles.modalTitle}>{detailTitle}</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close dashboard details"
                accessibilityRole="button"
                onPress={() => setHealthDetailKind(null)}
                style={styles.closeButton}
              >
                <Ionicons color={COLORS.text} name="close-outline" size={28} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.previewScroll}>
              {detailLines.length > 0 ? detailLines.map((line) => (
                <Text key={line} style={styles.previewLine}>{line}</Text>
              )) : (
                <Text style={styles.previewLine}>No records yet. Add local logs to see more details here.</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              accessibilityLabel="Close dashboard details"
              accessibilityRole="button"
              activeOpacity={0.76}
              onPress={() => setHealthDetailKind(null)}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  summaryCard: {
    flexBasis: "48%",
    minWidth: SPACING.cardMinWidth,
  },
  healthScoreCard: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  healthScoreCopy: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  healthScoreValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    lineHeight: TYPOGRAPHY.lineHeights.xl,
    marginTop: SPACING.xs,
  },
  healthScoreMeta: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  healthStatusChip: {
    alignItems: "center",
    backgroundColor: DATA_COLORS.light,
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  healthStatusText: {
    color: DATA_COLORS.ink,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  healthChange: {
    color: COLORS.textMuted,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    minWidth: 88,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  briefingCard: {
    gap: SPACING.lg,
  },
  briefingHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
  },
  briefingIcon: {
    alignItems: "center",
    backgroundColor: DATA_COLORS.light,
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  briefingTitleWrap: {
    flex: 1,
  },
  briefingTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    lineHeight: TYPOGRAPHY.lineHeights.xl,
  },
  briefingText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.md,
    lineHeight: TYPOGRAPHY.lineHeights.md,
  },
  nextActionBox: {
    backgroundColor: DATA_COLORS.light,
    borderRadius: 18,
    padding: SPACING.md,
  },
  nextActionLabel: {
    color: DATA_COLORS.ink,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: "uppercase",
  },
  nextActionText: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
  weeklyReportCard: {
    marginTop: SPACING.md,
  },
  reportHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
  },
  reportTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.heavy,
    lineHeight: TYPOGRAPHY.lineHeights.lg,
  },
  localChip: {
    backgroundColor: DATA_COLORS.light,
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  localChipText: {
    color: DATA_COLORS.ink,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  reportSummary: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.md,
  },
  reportRows: {
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  reportRow: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
    paddingBottom: SPACING.sm,
  },
  reportLabel: {
    color: COLORS.textMuted,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  reportValue: {
    color: COLORS.black,
    flex: 1.4,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "right",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(5, 45, 78, 0.42)",
    flex: 1,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  reportModal: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    maxHeight: "82%",
    maxWidth: SPACING.maxContentWidth,
    padding: SPACING.xl,
    width: "100%",
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
  },
  modalTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    lineHeight: TYPOGRAPHY.lineHeights.xl,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  previewScroll: {
    backgroundColor: DATA_COLORS.light,
    borderRadius: 18,
    marginTop: SPACING.lg,
    padding: SPACING.md,
  },
  previewLine: {
    color: DATA_COLORS.ink,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginBottom: SPACING.sm,
  },
  doneButton: {
    alignItems: "center",
    backgroundColor: DATA_COLORS.dark,
    borderRadius: 18,
    marginTop: SPACING.lg,
    minHeight: 48,
    justifyContent: "center",
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
