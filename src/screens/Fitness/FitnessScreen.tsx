import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import CustomCard from "../../components/common/CustomCard";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityAnalyticsCard from "../../components/fitness/ActivityAnalyticsCard";
import ExerciseCategoryCard from "../../components/fitness/ExerciseCategoryCard";
import ExerciseRecommendationSection from "../../components/fitness/ExerciseRecommendationSection";
import FitnessSummaryCard from "../../components/fitness/FitnessSummaryCard";
import WatchSyncStatusCard from "../../components/fitness/WatchSyncStatusCard";
import WorkoutPlanCard from "../../components/fitness/WorkoutPlanCard";
import ActionCard from "../../components/layout/ActionCard";
import ActivityChart from "../../components/layout/ActivityChart";
import AppHeader from "../../components/layout/AppHeader";
import DashboardSection from "../../components/layout/DashboardSection";
import InsightCard from "../../components/layout/InsightCard";
import ProgressRing from "../../components/layout/ProgressRing";
import ScreenSheet from "../../components/layout/ScreenSheet";
import StatsCard from "../../components/layout/StatsCard";
import EmptyState from "../../components/layout/EmptyState";
import { useHealthData } from "../../hooks/useHealthData";
import { getLocalDateKey, getWeekStartDateKey, useFitnessStore } from "../../store/fitnessStore";
import { COLORS, FITNESS_COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";
import type { ExerciseCategory, FitnessWorkoutCompletionEntry, RootTabParamList, WorkoutPlan } from "../../types";
import { getFitnessToneColors } from "../../utils/tone";

type WorkoutTemplate = WorkoutPlan & {
  categoryId: string;
  categoryTitle: string;
  durationMinutes: number;
  estimatedCalories: number;
};
type FitnessScreenProps = BottomTabScreenProps<RootTabParamList, "Fitness">;

const AI_FITNESS_COACH_PROMPT = "Act as my wellness fitness coach. Suggest a safe workout plan based on my recent activity and completed workouts. Keep it practical and avoid medical claims.";

const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));

const categoryIdForWorkout = (workout: WorkoutPlan): string => {
  if (workout.id.includes("strength")) return "strength-training";
  if (workout.id.includes("cardio")) return "cardio";
  if (workout.id.includes("yoga")) return "yoga";
  if (workout.id.includes("mobility") || workout.id.includes("warmup")) return "mobility";

  return "strength-training";
};

const durationMinutesFor = (duration: string): number => {
  const parsed = Number.parseInt(duration, 10);

  return Number.isFinite(parsed) ? parsed : 0;
};

const caloriesPerMinuteFor = (difficulty: string): number => {
  const normalized = difficulty.toLowerCase();

  if (normalized.includes("easy")) return 5;
  if (normalized.includes("medium")) return 7;
  if (normalized.includes("moderate")) return 8;

  return 6;
};

const templateForWorkout = (
  workout: WorkoutPlan,
  categories: ExerciseCategory[],
): WorkoutTemplate => {
  const categoryId = categoryIdForWorkout(workout);
  const category = categories.find((item) => item.id === categoryId) ?? categories[0];
  const durationMinutes = durationMinutesFor(workout.duration);

  return {
    ...workout,
    categoryId: category?.id ?? categoryId,
    categoryTitle: category?.title ?? "Workout",
    durationMinutes,
    estimatedCalories: durationMinutes * caloriesPerMinuteFor(workout.difficulty),
  };
};

const completedTimeLabel = (completedAt: string): string => {
  const date = new Date(completedAt);

  if (Number.isNaN(date.getTime())) return "Today";

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function FitnessScreen({ navigation }: FitnessScreenProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { data, error, loading } = useHealthData();
  const fitness = data.fitness;
  const hydrateFitness = useFitnessStore((state) => state.hydrate);
  const completions = useFitnessStore((state) => state.completions);
  const fitnessHydrated = useFitnessStore((state) => state.hydrated);
  const completeWorkout = useFitnessStore((state) => state.completeWorkout);
  const deleteCompletion = useFitnessStore((state) => state.deleteCompletion);

  useEffect(() => {
    void hydrateFitness();
  }, [hydrateFitness]);

  const todayKey = getLocalDateKey();
  const weekStartKey = getWeekStartDateKey();
  const workoutTemplates = useMemo(
    () => fitness?.workoutPlans.map((workout) =>
      templateForWorkout(workout, fitness.exerciseCategories),
    ) ?? [],
    [fitness],
  );
  const todayCompletions = useMemo(
    () => completions.filter((completion) => completion.dateKey === todayKey),
    [completions, todayKey],
  );
  const weekCompletions = useMemo(
    () => completions.filter((completion) =>
      completion.dateKey >= weekStartKey && completion.dateKey <= todayKey,
    ),
    [completions, todayKey, weekStartKey],
  );
  const todayCompletionByWorkoutId = useMemo(() => {
    const byWorkout = new Map<string, FitnessWorkoutCompletionEntry>();

    todayCompletions.forEach((completion) => {
      if (!byWorkout.has(completion.workoutId)) {
        byWorkout.set(completion.workoutId, completion);
      }
    });

    return byWorkout;
  }, [todayCompletions]);
  const filteredWorkoutTemplates = useMemo(
    () => selectedCategoryId
      ? workoutTemplates.filter((workout) => workout.categoryId === selectedCategoryId)
      : workoutTemplates,
    [selectedCategoryId, workoutTemplates],
  );
  const manualActiveMinutesToday = todayCompletions.reduce(
    (sum, completion) => sum + completion.durationMinutes,
    0,
  );
  const manualCaloriesToday = todayCompletions.reduce(
    (sum, completion) => sum + completion.estimatedCalories,
    0,
  );
  const manualWorkoutProgress = workoutTemplates.length > 0
    ? clampPercent(Math.round((todayCompletionByWorkoutId.size / workoutTemplates.length) * 100))
    : 0;

  if (!fitness) {
    return (
      <ScreenContainer>
        <View style={styles.shell}>
          <AppHeader
            showSearch
            subtitle="Track workouts, calories and activity"
            theme={{
              backgroundColor: FITNESS_COLORS.dark,
              glowAccentColor: FITNESS_COLORS.ink,
              glowColor: FITNESS_COLORS.secondary,
              subtitleColor: FITNESS_COLORS.light,
            }}
            title="Fitness Overview"
          />
          <ScreenSheet>
            <EmptyState
              accentColor={FITNESS_COLORS.primary}
              backgroundColor={FITNESS_COLORS.light}
              icon={error ? "alert-circle-outline" : "fitness-outline"}
              loading={!error && loading}
              subtitle={error ?? (loading ? "Loading your fitness dashboard." : "Fitness data is unavailable.")}
              title={error ? "Unable to load fitness" : "Preparing fitness"}
            />
          </ScreenSheet>
        </View>
      </ScreenContainer>
    );
  }

  const { summary } = fitness;
  const selectedCategory = selectedCategoryId
    ? fitness.exerciseCategories.find((category) => category.id === selectedCategoryId)
    : undefined;
  const categoryWorkoutCounts = workoutTemplates.reduce<Record<string, number>>((counts, workout) => {
    counts[workout.categoryId] = (counts[workout.categoryId] ?? 0) + 1;
    return counts;
  }, {});
  const categoryWeeklyCompletionCounts = weekCompletions.reduce<Record<string, number>>((counts, completion) => {
    counts[completion.categoryId] = (counts[completion.categoryId] ?? 0) + 1;
    return counts;
  }, {});
  const activityLabels = fitness.weeklyActivity.map((point) => point.day);
  const activityValues = fitness.weeklyActivity.map((point) => point.minutes);
  const caloriesProgress = Math.round((summary.caloriesBurned / summary.calorieGoal) * 100);
  const stepCount = summary.steps.toLocaleString("en-US");
  const stepGoal = summary.stepGoal.toLocaleString("en-US");
  const heartRate = data.vitals?.vitalMetrics.find((metric) => metric.id === "heart-rate")?.value;
  const manualCaloriesRemaining = Math.max(0, summary.calorieGoal - manualCaloriesToday);
  const manualCaloriesProgress = summary.calorieGoal > 0
    ? clampPercent(Math.round((manualCaloriesToday / summary.calorieGoal) * 100))
    : 0;
  const handleFitnessAction = (title: string) => {
    const normalizedTitle = title.toLowerCase();
    const firstOpenWorkout = workoutTemplates.find((workout) => !todayCompletionByWorkoutId.has(workout.id));

    if (normalizedTitle.includes("start")) {
      setSelectedCategoryId(firstOpenWorkout?.categoryId ?? null);
      Alert.alert(
        "Workout plans ready",
        "Choose one of today's workout cards and tap Complete when you finish. A live workout timer is coming after beta.",
      );
      return;
    }

    if (normalizedTitle.includes("log")) {
      setSelectedCategoryId(firstOpenWorkout?.categoryId ?? null);
      Alert.alert(
        "Log exercise locally",
        "Use the visible workout cards to add a completion to your local fitness log. Pick a plan and tap Complete.",
      );
      return;
    }

    if (normalizedTitle.includes("ai fitness")) {
      navigation.navigate("Chat", { initialPrompt: AI_FITNESS_COACH_PROMPT });
      return;
    }

    Alert.alert(
      title,
      "This fitness action is not connected in beta yet. Workout completion tracking is available now.",
    );
  };
  const handleWorkoutTimer = () => {
    Alert.alert("Workout Timer", "Timer controls are ready for your next workout session.");
  };
  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategoryId((current) => current === categoryId ? null : categoryId);
  };
  const handleCompleteWorkout = (workout: WorkoutTemplate) => {
    if (todayCompletionByWorkoutId.has(workout.id)) {
      Alert.alert("Already complete", `${workout.name} is already logged for today.`);
      return;
    }

    void completeWorkout({
      workoutId: workout.id,
      workoutName: workout.name,
      categoryId: workout.categoryId,
      categoryTitle: workout.categoryTitle,
      durationMinutes: workout.durationMinutes,
      estimatedCalories: workout.estimatedCalories,
      difficulty: workout.difficulty,
    }).then(() => {
      Alert.alert("Workout complete", `${workout.name} was added to today's fitness log.`);
    });
  };
  const handleUndoWorkout = (completion: FitnessWorkoutCompletionEntry) => {
    Alert.alert("Undo completion", `Remove ${completion.workoutName} from today's fitness log?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Undo",
        style: "destructive",
        onPress: () => {
          void deleteCompletion(completion.id).then(() => {
            Alert.alert("Workout removed", `${completion.workoutName} was removed from today's log.`);
          });
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <View style={styles.shell}>
        <AppHeader
          showSearch
          subtitle="Track workouts, calories and activity"
          theme={{
            backgroundColor: FITNESS_COLORS.dark,
            glowAccentColor: FITNESS_COLORS.ink,
            glowColor: FITNESS_COLORS.secondary,
            subtitleColor: FITNESS_COLORS.light,
          }}
          title="Fitness Overview"
        >
          <CustomCard style={styles.scoreCard}>
            <View>
              <Text style={styles.scoreLabel}>Fitness Score</Text>
              <Text style={styles.scoreValue}>{summary.score} / 100</Text>
              <Text style={styles.scoreStatus}>{summary.scoreLabel}</Text>
            </View>
            <View style={styles.scoreIcon}>
              <Ionicons color={FITNESS_COLORS.primary} name="fitness-outline" size={24} />
            </View>
          </CustomCard>
        </AppHeader>

        <ScreenSheet>
          <WatchSyncStatusCard activityPercent={summary.stepProgress} heartRate={heartRate} />
          <ActivityAnalyticsCard summary={summary} />

          <DashboardSection title="Manual Workout Summary" />
          <View style={styles.statsRowCompact}>
            <StatsCard
              icon="checkmark-circle-outline"
              subtitle="manual completions"
              title="Today"
              tone="primary"
              toneColorsOverride={getFitnessToneColors("primary")}
              value={`${todayCompletionByWorkoutId.size} workouts`}
            />
            <StatsCard
              icon="timer-outline"
              subtitle="from completed plans"
              title="Active Minutes"
              tone="accent"
              toneColorsOverride={getFitnessToneColors("accent")}
              value={`${manualActiveMinutesToday} min`}
            />
            <StatsCard
              icon="flame-outline"
              subtitle="estimated workout burn"
              title="Manual Burn"
              tone="warning"
              toneColorsOverride={getFitnessToneColors("warning")}
              value={`${manualCaloriesToday} kcal`}
            />
            <StatsCard
              icon="calendar-outline"
              subtitle="since Monday"
              title="This Week"
              tone="primary"
              toneColorsOverride={getFitnessToneColors("primary")}
              value={`${weekCompletions.length} done`}
            />
          </View>

          <DashboardSection title="Weekly Activity" />
          <ActivityChart
            accentColor={FITNESS_COLORS.primary}
            labels={activityLabels}
            subtitle={summary.weeklyTrend}
            title={`${summary.weeklyActivityMinutes} mins`}
            trackColor={FITNESS_COLORS.light}
            values={activityValues}
          />

          <DashboardSection title="Calories Burned" />
          <CustomCard style={styles.heroCard}>
            <View style={styles.heroCopy}>
              <Text style={styles.cardEyebrow}>Calories Burned</Text>
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.heroValue}>
                {summary.caloriesBurned} kcal
              </Text>
              <View style={styles.metricGrid}>
                <View style={styles.metricPill}>
                  <Text style={styles.metricLabel}>Goal</Text>
                  <Text style={styles.metricValue}>{summary.calorieGoal} kcal</Text>
                </View>
                <View style={styles.metricPill}>
                  <Text style={styles.metricLabel}>Remaining</Text>
                  <Text style={styles.metricValue}>{summary.caloriesRemaining} kcal</Text>
                </View>
              </View>
              <Text style={styles.muted}>
                Device and Health Connect activity. Manual workout burn today: {manualCaloriesToday} kcal.
              </Text>
            </View>
            <ProgressRing
              backgroundColor={FITNESS_COLORS.light}
              color={FITNESS_COLORS.primary}
              max={summary.calorieGoal}
              size={SPACING.bottomNavOffset}
              value={summary.caloriesBurned}
            />
          </CustomCard>

          <DashboardSection title="Workout Progress" />
          <CustomCard style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <ProgressRing
                backgroundColor={FITNESS_COLORS.light}
                color={FITNESS_COLORS.primary}
                max={100}
                value={manualWorkoutProgress}
              />
              <View style={styles.progressCopy}>
                <Text numberOfLines={2} style={styles.cardTitle}>Today's Workout Progress</Text>
                <Text style={styles.progressValue}>{manualWorkoutProgress}%</Text>
                <Text style={styles.muted}>
                  {todayCompletionByWorkoutId.size} of {workoutTemplates.length} manual plans completed
                </Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${manualWorkoutProgress}%` }]}
              />
            </View>
          </CustomCard>

          <DashboardSection
            actionLabel={selectedCategory ? "Clear" : "Start"}
            onPress={selectedCategory ? () => setSelectedCategoryId(null) : undefined}
            title="Today's Workout Plans"
          />
          {selectedCategory ? (
            <CustomCard style={styles.filterCard}>
              <View style={styles.filterIcon}>
                <Ionicons color={FITNESS_COLORS.primary} name={selectedCategory.iconName} size={18} />
              </View>
              <View style={styles.filterCopy}>
                <Text style={styles.filterTitle}>{selectedCategory.title}</Text>
                <Text style={styles.muted}>Showing matching workout plans. Tap the category again to clear.</Text>
              </View>
            </CustomCard>
          ) : null}
          {filteredWorkoutTemplates.length > 0 ? (
            <View style={styles.list}>
              {filteredWorkoutTemplates.map((workout) => {
                const completion = todayCompletionByWorkoutId.get(workout.id);

                return (
                  <WorkoutPlanCard
                    completedAt={completion ? completedTimeLabel(completion.completedAt) : undefined}
                    isCompletedToday={Boolean(completion)}
                    key={workout.id}
                    onComplete={() => handleCompleteWorkout(workout)}
                    onUndoComplete={completion ? () => handleUndoWorkout(completion) : undefined}
                    workout={workout}
                  />
                );
              })}
            </View>
          ) : (
            <CustomCard style={styles.emptyCard}>
              <EmptyState
                icon="barbell-outline"
                subtitle={selectedCategory ? "Try another category or clear the current filter." : "Workout plans will appear when your routine is ready."}
                title={selectedCategory ? "No matching workout plans" : "No workout plans"}
              />
            </CustomCard>
          )}

          <DashboardSection title="Completed Today" />
          {todayCompletions.length > 0 ? (
            <View style={styles.list}>
              {todayCompletions.map((completion) => (
                <CustomCard key={completion.id} style={styles.completedLogCard}>
                  <View style={styles.completedLogIcon}>
                    <Ionicons color={FITNESS_COLORS.primary} name="checkmark-circle-outline" size={20} />
                  </View>
                  <View style={styles.completedLogCopy}>
                    <Text numberOfLines={1} style={styles.completedLogTitle}>{completion.workoutName}</Text>
                    <Text style={styles.muted}>
                      {completion.categoryTitle} - {completion.durationMinutes} min - {completion.estimatedCalories} kcal
                    </Text>
                  </View>
                  <Text style={styles.completedTime}>{completedTimeLabel(completion.completedAt)}</Text>
                </CustomCard>
              ))}
            </View>
          ) : (
            <CustomCard style={styles.emptyCard}>
              <EmptyState
                icon="checkmark-done-outline"
                loading={!fitnessHydrated}
                subtitle="Complete a workout plan to build today's manual fitness log."
                title={fitnessHydrated ? "No workouts completed today" : "Loading workout log"}
              />
            </CustomCard>
          )}

          <DashboardSection title="BMI Dashboard" />
          <CustomCard style={styles.bmiCard}>
            <View style={styles.bmiTopRow}>
              <View>
                <Text style={styles.cardEyebrow}>BMI</Text>
                <Text numberOfLines={1} style={styles.heroValue}>{summary.bmi}</Text>
                <Text style={styles.scoreStatus}>{summary.bmiStatus}</Text>
              </View>
              <View style={styles.bmiMetrics}>
                <Text style={styles.metricLabel}>Height</Text>
                <Text style={styles.bmiMetricValue}>{summary.height}</Text>
                <Text style={styles.metricLabel}>Weight</Text>
                <Text style={styles.bmiMetricValue}>{summary.weight}</Text>
              </View>
            </View>
            <View style={styles.bmiScale}>
              <View style={[styles.scaleSegment, styles.scaleLow]} />
              <View style={[styles.scaleSegment, styles.scaleHealthy]} />
              <View style={[styles.scaleSegment, styles.scaleHigh]} />
              <View style={[styles.scaleIndicator]} />
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleText}>Low</Text>
              <Text style={styles.scaleText}>Healthy</Text>
              <Text style={styles.scaleText}>High</Text>
            </View>
          </CustomCard>

          <FitnessSummaryCard
            onTimerPress={handleWorkoutTimer}
            profile={data.profile}
            summary={summary}
          />

          <DashboardSection title="Step Counter" />
          <CustomCard style={styles.stepCard}>
            <View style={styles.stepIcon}>
              <Ionicons color={FITNESS_COLORS.primary} name="walk-outline" size={24} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.cardEyebrow}>Steps</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.heroValue}>{stepCount}</Text>
              <Text style={styles.muted}>Goal: {stepGoal}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.stepFill, { width: `${summary.stepProgress}%` }]} />
              </View>
            </View>
            <ProgressRing
              backgroundColor={FITNESS_COLORS.light}
              color={FITNESS_COLORS.primary}
              max={100}
              value={summary.stepProgress}
            />
          </CustomCard>

          <DashboardSection title="Exercise Categories" />
          {fitness.exerciseCategories.length > 0 ? (
            <View style={styles.grid}>
              {fitness.exerciseCategories.map((category) => (
                <ExerciseCategoryCard
                  category={category}
                  completedCount={categoryWeeklyCompletionCounts[category.id] ?? 0}
                  key={category.id}
                  onPress={() => handleCategoryPress(category.id)}
                  selected={selectedCategoryId === category.id}
                  workoutCount={categoryWorkoutCounts[category.id] ?? 0}
                />
              ))}
            </View>
          ) : (
            <CustomCard style={styles.emptyCard}>
              <EmptyState
                icon="fitness-outline"
                subtitle="Exercise categories will appear here."
                title="No exercise categories"
              />
            </CustomCard>
          )}

          <ExerciseRecommendationSection goals={data.profile?.healthGoals} profile={data.profile} />

          <DashboardSection title="Recovery Insights" />
          {fitness.recoveryInsights.length > 0 ? (
            <View style={styles.list}>
              {fitness.recoveryInsights.map((insight) => (
                <InsightCard
                  detail={insight.detail}
                  iconName={insight.iconName}
                  key={insight.id}
                  status={insight.status}
                  title={insight.title}
                  tone={insight.tone}
                  toneColorsOverride={getFitnessToneColors(insight.tone)}
                />
              ))}
            </View>
          ) : (
            <CustomCard style={styles.emptyCard}>
              <EmptyState
                icon="heart-outline"
                subtitle="Recovery signals will appear after workouts and rest data sync."
                title="No recovery insights"
              />
            </CustomCard>
          )}

          <DashboardSection title="Quick Actions" />
          {fitness.actions.length > 0 ? (
            <View style={styles.actionsGrid}>
              {fitness.actions.map((action) => (
                <ActionCard
                  iconName={action.iconName}
                  key={action.id}
                  onPress={() => handleFitnessAction(action.title)}
                  title={action.title}
                  tone={action.tone}
                  toneColorsOverride={getFitnessToneColors(action.tone)}
                />
              ))}
            </View>
          ) : (
            <CustomCard style={styles.emptyCard}>
              <EmptyState
                icon="flash-outline"
                subtitle="Workout shortcuts will appear here."
                title="No fitness actions"
              />
            </CustomCard>
          )}

          <View style={styles.statsRow}>
            <StatsCard
              icon="flame-outline"
              subtitle={`${caloriesProgress}% of daily goal`}
              title="Device Burn"
              tone="warning"
              toneColorsOverride={getFitnessToneColors("primary")}
              value={`${summary.caloriesRemaining} kcal left`}
            />
            <StatsCard
              icon="barbell-outline"
              subtitle={`${manualCaloriesProgress}% of daily goal`}
              title="Manual Burn"
              tone="accent"
              toneColorsOverride={getFitnessToneColors("accent")}
              value={`${manualCaloriesRemaining} kcal left`}
            />
            <StatsCard
              icon="footsteps-outline"
              subtitle={`${summary.stepProgress}% complete`}
              title="Steps"
              tone="accent"
              toneColorsOverride={getFitnessToneColors("primary")}
              value={stepCount}
            />
          </View>
        </ScreenSheet>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  scoreCard: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: SPACING.lg,
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  scoreValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
  },
  scoreStatus: {
    color: FITNESS_COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.xs,
  },
  scoreIcon: {
    alignItems: "center",
    backgroundColor: FITNESS_COLORS.light,
    borderRadius: SPACING.xl,
    height: SPACING.xxxl + SPACING.xxl,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.xxl,
  },
  heroCard: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
  },
  heroCopy: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  cardEyebrow: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  heroValue: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.hero,
    fontWeight: TYPOGRAPHY.weights.heavy,
    lineHeight: TYPOGRAPHY.lineHeights.hero,
    marginTop: SPACING.xs,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  metricPill: {
    backgroundColor: FITNESS_COLORS.light,
    borderRadius: SPACING.lg,
    flexGrow: 1,
    padding: SPACING.md,
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  metricValue: {
    color: FITNESS_COLORS.dark,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
  },
  progressCard: {
    gap: SPACING.lg,
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
  },
  progressCopy: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  cardTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: TYPOGRAPHY.lineHeights.lg,
  },
  progressValue: {
    color: FITNESS_COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.xs,
  },
  muted: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
    marginTop: SPACING.xs,
  },
  progressTrack: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.sm,
    height: SPACING.sm,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: FITNESS_COLORS.primary,
    borderRadius: SPACING.sm,
    height: "100%",
  },
  list: {
    gap: SPACING.md,
  },
  statsRowCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  emptyCard: {
    padding: 0,
  },
  filterCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  filterIcon: {
    alignItems: "center",
    backgroundColor: FITNESS_COLORS.light,
    borderRadius: SPACING.lg,
    height: SPACING.xxxl,
    justifyContent: "center",
    width: SPACING.xxxl,
  },
  filterCopy: {
    flex: 1,
  },
  filterTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  completedLogCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
  },
  completedLogIcon: {
    alignItems: "center",
    backgroundColor: FITNESS_COLORS.light,
    borderRadius: SPACING.lg,
    height: SPACING.xxxl,
    justifyContent: "center",
    width: SPACING.xxxl,
  },
  completedLogCopy: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  completedLogTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  completedTime: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  bmiCard: {
    gap: SPACING.lg,
  },
  bmiTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.lg,
    justifyContent: "space-between",
  },
  bmiMetrics: {
    backgroundColor: FITNESS_COLORS.light,
    borderRadius: SPACING.lg,
    gap: SPACING.xs,
    flexGrow: 1,
    minWidth: SPACING.cardMinWidth,
    padding: SPACING.md,
  },
  bmiMetricValue: {
    color: FITNESS_COLORS.dark,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.heavy,
  },
  bmiScale: {
    flexDirection: "row",
    height: SPACING.md,
    position: "relative",
  },
  scaleSegment: {
    flex: 1,
  },
  scaleLow: {
    backgroundColor: COLORS.warningLight,
    borderBottomLeftRadius: SPACING.sm,
    borderTopLeftRadius: SPACING.sm,
  },
  scaleHealthy: {
    backgroundColor: COLORS.accentLight,
  },
  scaleHigh: {
    backgroundColor: COLORS.dangerLight,
    borderBottomRightRadius: SPACING.sm,
    borderTopRightRadius: SPACING.sm,
  },
  scaleIndicator: {
    backgroundColor: FITNESS_COLORS.primary,
    borderRadius: SPACING.sm,
    height: SPACING.xxl,
    left: "48%",
    position: "absolute",
    top: -SPACING.xs,
    width: SPACING.sm,
  },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scaleText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  stepCard: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  stepIcon: {
    alignItems: "center",
    backgroundColor: FITNESS_COLORS.light,
    borderRadius: SPACING.xl,
    height: SPACING.xxxl + SPACING.xxl,
    justifyContent: "center",
    width: SPACING.xxxl + SPACING.xxl,
  },
  stepContent: {
    flex: 1,
    minWidth: SPACING.cardMinWidth,
  },
  stepFill: {
    backgroundColor: FITNESS_COLORS.primary,
    borderRadius: SPACING.sm,
    height: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
});
