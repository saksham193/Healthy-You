import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";
import { TYPOGRAPHY } from "../../theme/typography";

export default function FitnessScreen() {
  const { data, error, loading } = useHealthData();
  const fitness = data.fitness;

  if (!fitness) {
    return (
      <ScreenContainer>
        <View style={styles.shell}>
          <AppHeader showSearch subtitle="Track workouts, calories and activity" title="Fitness Overview" />
          <ScreenSheet>
            <EmptyState
              icon={error ? "alert-circle-outline" : "fitness-outline"}
              subtitle={error ?? (loading ? "Loading your fitness dashboard." : "Fitness data is unavailable.")}
              title={error ? "Unable to load fitness" : "Preparing fitness"}
            />
          </ScreenSheet>
        </View>
      </ScreenContainer>
    );
  }

  const { summary } = fitness;
  const activityLabels = fitness.weeklyActivity.map((point) => point.day);
  const activityValues = fitness.weeklyActivity.map((point) => point.minutes);
  const caloriesProgress = Math.round((summary.caloriesBurned / summary.calorieGoal) * 100);
  const stepCount = summary.steps.toLocaleString("en-US");
  const stepGoal = summary.stepGoal.toLocaleString("en-US");
  const heartRate = data.vitals?.vitalMetrics.find((metric) => metric.id === "heart-rate")?.value;
  const handleFitnessAction = (title: string) => {
    Alert.alert(title, "This fitness action is ready for the next connected workflow.");
  };
  const handleWorkoutTimer = () => {
    Alert.alert("Workout Timer", "Timer controls are ready for your next workout session.");
  };

  return (
    <ScreenContainer>
      <View style={styles.shell}>
        <AppHeader
          showSearch
          subtitle="Track workouts, calories and activity"
          title="Fitness Overview"
        >
          <CustomCard style={styles.scoreCard}>
            <View>
              <Text style={styles.scoreLabel}>Fitness Score</Text>
              <Text style={styles.scoreValue}>{summary.score} / 100</Text>
              <Text style={styles.scoreStatus}>{summary.scoreLabel}</Text>
            </View>
            <View style={styles.scoreIcon}>
              <Ionicons color={COLORS.primary} name="fitness-outline" size={24} />
            </View>
          </CustomCard>
        </AppHeader>

        <ScreenSheet>
          <WatchSyncStatusCard activityPercent={summary.stepProgress} heartRate={heartRate} />
          <ActivityAnalyticsCard summary={summary} />

          <DashboardSection title="Weekly Activity" />
          <ActivityChart
            labels={activityLabels}
            subtitle={summary.weeklyTrend}
            title={`${summary.weeklyActivityMinutes} mins`}
            values={activityValues}
          />

          <DashboardSection title="Calories Burned" />
          <CustomCard style={styles.heroCard}>
            <View style={styles.heroCopy}>
              <Text style={styles.cardEyebrow}>Calories Burned</Text>
              <Text style={styles.heroValue}>{summary.caloriesBurned} kcal</Text>
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
            </View>
            <ProgressRing
              max={summary.calorieGoal}
              size={SPACING.bottomNavOffset}
              value={summary.caloriesBurned}
            />
          </CustomCard>

          <DashboardSection title="Workout Progress" />
          <CustomCard style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <ProgressRing max={100} value={summary.workoutProgress} />
              <View style={styles.progressCopy}>
                <Text style={styles.cardTitle}>Today's Workout Progress</Text>
                <Text style={styles.progressValue}>{summary.workoutProgress}%</Text>
                <Text style={styles.muted}>
                  {summary.workoutsCompleted} of {summary.workoutsTotal} workouts completed
                </Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${summary.workoutProgress}%` }]}
              />
            </View>
          </CustomCard>

          <DashboardSection title="Today's Workout Plans" actionLabel="Start" />
          {fitness.workoutPlans.length > 0 ? (
            <View style={styles.list}>
              {fitness.workoutPlans.map((workout) => (
                <WorkoutPlanCard key={workout.id} workout={workout} />
              ))}
            </View>
          ) : (
            <CustomCard style={styles.emptyCard}>
              <EmptyState
                icon="barbell-outline"
                subtitle="Workout plans will appear when your routine is ready."
                title="No workout plans"
              />
            </CustomCard>
          )}

          <DashboardSection title="BMI Dashboard" />
          <CustomCard style={styles.bmiCard}>
            <View style={styles.bmiTopRow}>
              <View>
                <Text style={styles.cardEyebrow}>BMI</Text>
                <Text style={styles.heroValue}>{summary.bmi}</Text>
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
              <Ionicons color={COLORS.primary} name="walk-outline" size={24} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.cardEyebrow}>Steps</Text>
              <Text style={styles.heroValue}>{stepCount}</Text>
              <Text style={styles.muted}>Goal: {stepGoal}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.stepFill, { width: `${summary.stepProgress}%` }]} />
              </View>
            </View>
            <ProgressRing max={100} value={summary.stepProgress} />
          </CustomCard>

          <DashboardSection title="Exercise Categories" />
          {fitness.exerciseCategories.length > 0 ? (
            <View style={styles.grid}>
              {fitness.exerciseCategories.map((category) => (
                <ExerciseCategoryCard category={category} key={category.id} />
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
              title="Burn Goal"
              tone="warning"
              value={`${summary.caloriesRemaining} kcal left`}
            />
            <StatsCard
              icon="footsteps-outline"
              subtitle={`${summary.stepProgress}% complete`}
              title="Steps"
              tone="accent"
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
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.xs,
  },
  scoreIcon: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
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
    backgroundColor: COLORS.primaryLight,
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
    color: COLORS.primaryDark,
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
  },
  progressValue: {
    color: COLORS.primary,
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
    backgroundColor: COLORS.primary,
    borderRadius: SPACING.sm,
    height: "100%",
  },
  list: {
    gap: SPACING.md,
  },
  emptyCard: {
    padding: 0,
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
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.lg,
    gap: SPACING.xs,
    minWidth: SPACING.cardMinWidth,
    padding: SPACING.md,
  },
  bmiMetricValue: {
    color: COLORS.primaryDark,
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
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.primaryLight,
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
    backgroundColor: COLORS.accent,
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
