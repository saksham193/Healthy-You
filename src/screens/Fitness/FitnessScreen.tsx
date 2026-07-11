import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
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
import type { ExerciseCategory, FitnessPreferences, FitnessWorkoutCompletionEntry, RootTabParamList, WorkoutPlan } from "../../types";
import { getFitnessToneColors } from "../../utils/tone";

type WorkoutTemplate = WorkoutPlan & {
  categoryId: string;
  categoryTitle: string;
  durationMinutes: number;
  estimatedCalories: number;
  intensity: "low" | "moderate" | "high";
  isRestrictedForUser: boolean;
};
type FitnessScreenProps = BottomTabScreenProps<RootTabParamList, "Fitness">;
type WorkoutCategory = NonNullable<WorkoutPlan["category"]>;
type WorkoutIntensity = NonNullable<WorkoutPlan["intensity"]>;
type PlanFormState = {
  name: string;
  category: WorkoutCategory;
  durationMinutes: string;
  intensity: WorkoutIntensity;
  bodyFocus: string;
  equipment: string;
  notes: string;
  userRestrictions: string;
};
type ExerciseLogFormState = {
  name: string;
  category: WorkoutCategory;
  durationMinutes: string;
  intensity: WorkoutIntensity;
  caloriesEstimate: string;
  notes: string;
  completedAt: string;
};

const AI_FITNESS_COACH_PROMPT = "Act as my wellness fitness coach. Suggest a safe workout plan based on my recent activity and completed workouts. Keep it practical and avoid medical claims.";
const FITNESS_SAFETY_COPY = "Fitness preferences are stored locally and help personalize your workout list. They are not medical advice. If you have an injury, condition, or medical restriction, consult a qualified professional before exercising.";
const emptyPlanForm: PlanFormState = {
  name: "",
  category: "custom",
  durationMinutes: "20",
  intensity: "moderate",
  bodyFocus: "",
  equipment: "",
  notes: "",
  userRestrictions: "",
};
const emptyExerciseLogForm: ExerciseLogFormState = {
  name: "",
  category: "custom",
  durationMinutes: "20",
  intensity: "moderate",
  caloriesEstimate: "",
  notes: "",
  completedAt: "",
};
const workoutCategories: Array<{ label: string; value: WorkoutCategory }> = [
  { label: "Strength", value: "strength" },
  { label: "Cardio", value: "cardio" },
  { label: "Mobility", value: "mobility" },
  { label: "Recovery", value: "recovery" },
  { label: "Custom", value: "custom" },
];
const workoutIntensities: Array<{ label: string; value: WorkoutIntensity }> = [
  { label: "Low", value: "low" },
  { label: "Moderate", value: "moderate" },
  { label: "High", value: "high" },
];

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

const difficultyForIntensity = (intensity: WorkoutIntensity): string => {
  switch (intensity) {
    case "high":
      return "High";
    case "low":
      return "Low";
    case "moderate":
    default:
      return "Moderate";
  }
};

const categoryTitleFor = (category: WorkoutCategory): string => {
  switch (category) {
    case "strength":
      return "Strength Training";
    case "cardio":
      return "Cardio";
    case "mobility":
      return "Mobility";
    case "recovery":
      return "Recovery";
    case "custom":
    default:
      return "Custom";
  }
};

const categoryIdForPlanCategory = (category?: WorkoutCategory): string | null => {
  switch (category) {
    case "strength":
      return "strength-training";
    case "cardio":
      return "cardio";
    case "mobility":
      return "mobility";
    case "recovery":
      return "yoga";
    case "custom":
    default:
      return null;
  }
};

const parseList = (value: string): string[] =>
  value.split(",").map((item) => item.trim()).filter(Boolean);

const normalizeToken = (value: string): string => value.trim().toLowerCase();

const hasRestrictionMatch = (planRestrictions: string[] | undefined, preferences: FitnessPreferences): boolean => {
  const preferenceTokens = [
    ...preferences.limitations,
    ...(preferences.restrictionNotes ? parseList(preferences.restrictionNotes) : []),
  ].map(normalizeToken).filter(Boolean);

  if (!planRestrictions?.length || preferenceTokens.length === 0) return false;

  return planRestrictions.some((restriction) => {
    const normalized = normalizeToken(restriction);

    return preferenceTokens.some((token) => normalized.includes(token) || token.includes(normalized));
  });
};

const formatElapsed = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
};

const parseCompletedAtInput = (value: string): string | null => {
  if (!value.trim()) return new Date().toISOString();

  const date = new Date(value.trim());

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const templateForWorkout = (
  workout: WorkoutPlan,
  categories: ExerciseCategory[],
  preferences: FitnessPreferences,
): WorkoutTemplate => {
  const categoryId = categoryIdForPlanCategory(workout.category) ?? categoryIdForWorkout(workout);
  const category = categories.find((item) => item.id === categoryId) ?? categories[0];
  const durationMinutes = workout.durationMinutes ?? durationMinutesFor(workout.duration);
  const intensity = workout.intensity ?? (workout.difficulty.toLowerCase().includes("high")
    ? "high"
    : workout.difficulty.toLowerCase().includes("easy") || workout.difficulty.toLowerCase().includes("low")
      ? "low"
      : "moderate");

  return {
    ...workout,
    categoryId: category?.id ?? categoryId,
    categoryTitle: category?.title ?? "Workout",
    durationMinutes,
    estimatedCalories: durationMinutes * caloriesPerMinuteFor(workout.difficulty),
    intensity,
    isRestrictedForUser: hasRestrictionMatch(workout.userRestrictions, preferences),
  };
};

const completedTimeLabel = (completedAt: string): string => {
  const date = new Date(completedAt);

  if (Number.isNaN(date.getTime())) return "Today";

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function FitnessScreen({ navigation }: FitnessScreenProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [workoutActionNotice, setWorkoutActionNotice] = useState<string | null>(null);
  const [workoutPickerVisible, setWorkoutPickerVisible] = useState(false);
  const [timerVisible, setTimerVisible] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [exerciseLogForm, setExerciseLogForm] = useState<ExerciseLogFormState>(emptyExerciseLogForm);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm);
  const [preferencesForm, setPreferencesForm] = useState({
    bodyType: "",
    goals: "",
    limitations: "",
    restrictionNotes: "",
    hideRestrictedWorkouts: false,
  });
  const { data, error, loading } = useHealthData();
  const fitness = data.fitness;
  const hydrateFitness = useFitnessStore((state) => state.hydrate);
  const completions = useFitnessStore((state) => state.completions);
  const customWorkoutPlans = useFitnessStore((state) => state.customWorkoutPlans);
  const fitnessPreferences = useFitnessStore((state) => state.preferences);
  const fitnessHydrated = useFitnessStore((state) => state.hydrated);
  const completeWorkout = useFitnessStore((state) => state.completeWorkout);
  const deleteCompletion = useFitnessStore((state) => state.deleteCompletion);
  const addCustomWorkoutPlan = useFitnessStore((state) => state.addCustomWorkoutPlan);
  const updateCustomWorkoutPlan = useFitnessStore((state) => state.updateCustomWorkoutPlan);
  const deleteCustomWorkoutPlan = useFitnessStore((state) => state.deleteCustomWorkoutPlan);
  const updatePreferences = useFitnessStore((state) => state.updatePreferences);

  useEffect(() => {
    void hydrateFitness();
  }, [hydrateFitness]);

  useEffect(() => {
    setPreferencesForm({
      bodyType: fitnessPreferences.bodyType ?? "",
      goals: fitnessPreferences.goals.join(", "),
      limitations: fitnessPreferences.limitations.join(", "),
      restrictionNotes: fitnessPreferences.restrictionNotes ?? "",
      hideRestrictedWorkouts: fitnessPreferences.hideRestrictedWorkouts,
    });
  }, [fitnessPreferences]);

  useEffect(() => {
    if (!timerRunning) return undefined;

    const interval = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  const todayKey = getLocalDateKey();
  const weekStartKey = getWeekStartDateKey();
  const workoutTemplates = useMemo(
    () => [...(fitness?.workoutPlans ?? []), ...customWorkoutPlans].map((workout) =>
      templateForWorkout(workout, fitness?.exerciseCategories ?? [], fitnessPreferences),
    ) ?? [],
    [customWorkoutPlans, fitness, fitnessPreferences],
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
    () => {
      const visibleWorkouts = fitnessPreferences.hideRestrictedWorkouts
        ? workoutTemplates.filter((workout) => !workout.isRestrictedForUser)
        : workoutTemplates;

      return selectedCategoryId
        ? visibleWorkouts.filter((workout) => workout.categoryId === selectedCategoryId)
        : visibleWorkouts;
    },
    [fitnessPreferences.hideRestrictedWorkouts, selectedCategoryId, workoutTemplates],
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
  const openWorkoutPicker = () => {
    setWorkoutActionNotice(null);
    setWorkoutPickerVisible(true);
  };
  const openManualLog = (preset?: Partial<ExerciseLogFormState>) => {
    setExerciseLogForm({
      ...emptyExerciseLogForm,
      completedAt: new Date().toISOString(),
      ...preset,
    });
    setLogModalVisible(true);
  };
  const openPlanModal = (plan?: WorkoutPlan | null) => {
    const category = plan?.category ?? "custom";
    const intensity = plan?.intensity ?? (plan?.difficulty.toLowerCase().includes("easy")
      ? "low"
      : plan?.difficulty.toLowerCase().includes("high")
        ? "high"
        : "moderate");
    const durationMinutes = plan?.durationMinutes ?? (plan ? durationMinutesFor(plan.duration) : 20);

    setEditingPlan(plan?.isCustom ? plan : null);
    setPlanForm(plan
      ? {
          name: plan.isCustom ? plan.name : `${plan.name} Custom`,
          category,
          durationMinutes: `${Math.max(1, durationMinutes)}`,
          intensity,
          bodyFocus: plan.bodyFocus?.join(", ") ?? "",
          equipment: plan.equipment ?? "",
          notes: plan.notes ?? "",
          userRestrictions: plan.userRestrictions?.join(", ") ?? "",
        }
      : emptyPlanForm);
    setPlanModalVisible(true);
  };
  const closePlanModal = () => {
    setPlanModalVisible(false);
    setEditingPlan(null);
    setPlanForm(emptyPlanForm);
  };
  const startTimerForWorkout = (workout: WorkoutTemplate) => {
    setActiveWorkout(workout);
    setElapsedSeconds(0);
    setTimerRunning(false);
    setWorkoutPickerVisible(false);
    setTimerVisible(true);
  };
  const closeTimer = () => {
    setTimerRunning(false);
    setTimerVisible(false);
    setActiveWorkout(null);
    setElapsedSeconds(0);
  };
  const handleFitnessAction = (title: string) => {
    const normalizedTitle = title.toLowerCase();

    if (normalizedTitle.includes("start")) {
      openWorkoutPicker();
      return;
    }

    if (normalizedTitle.includes("log")) {
      openManualLog();
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
    openWorkoutPicker();
  };
  const handleCategoryPress = (categoryId: string) => {
    setWorkoutActionNotice(null);
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
      notes: workout.notes,
    }).then(() => {
      Alert.alert("Workout complete", `${workout.name} was added to today's fitness log.`);
    });
  };
  const handleCompleteActiveWorkout = () => {
    if (!activeWorkout) return;

    const loggedMinutes = Math.max(1, Math.round(elapsedSeconds / 60) || activeWorkout.durationMinutes);
    setTimerRunning(false);
    void completeWorkout({
      workoutId: activeWorkout.id,
      workoutName: activeWorkout.name,
      categoryId: activeWorkout.categoryId,
      categoryTitle: activeWorkout.categoryTitle,
      durationMinutes: loggedMinutes,
      estimatedCalories: loggedMinutes * caloriesPerMinuteFor(activeWorkout.difficulty),
      difficulty: activeWorkout.difficulty,
      notes: activeWorkout.notes,
    }).then(() => {
      closeTimer();
      Alert.alert("Workout logged", `${activeWorkout.name} was saved to your local fitness log.`);
    });
  };
  const handleSaveManualExercise = () => {
    const name = exerciseLogForm.name.trim();
    const durationMinutes = Number.parseInt(exerciseLogForm.durationMinutes, 10);
    const caloriesEstimate = Number.parseInt(exerciseLogForm.caloriesEstimate, 10);
    const completedAt = parseCompletedAtInput(exerciseLogForm.completedAt);

    if (!name) {
      Alert.alert("Exercise name needed", "Add an exercise name before saving.");
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      Alert.alert("Duration needed", "Add duration in minutes before saving.");
      return;
    }

    if (!completedAt) {
      Alert.alert("Date/time invalid", "Use a valid date/time or leave the field blank to log now.");
      return;
    }

    void completeWorkout({
      workoutId: `manual-${Date.now()}`,
      workoutName: name,
      categoryId: categoryIdForPlanCategory(exerciseLogForm.category) ?? "custom",
      categoryTitle: categoryTitleFor(exerciseLogForm.category),
      durationMinutes,
      estimatedCalories: Number.isFinite(caloriesEstimate)
        ? Math.max(0, caloriesEstimate)
        : durationMinutes * caloriesPerMinuteFor(difficultyForIntensity(exerciseLogForm.intensity)),
      difficulty: difficultyForIntensity(exerciseLogForm.intensity),
      completedAt,
      notes: exerciseLogForm.notes,
    }).then(() => {
      setLogModalVisible(false);
      Alert.alert("Exercise logged", `${name} was saved to your local fitness log.`);
    }).catch(() => {
      Alert.alert("Unable to log exercise", "Please check the date/time and try again.");
    });
  };
  const handleSavePlan = () => {
    const name = planForm.name.trim();
    const durationMinutes = Number.parseInt(planForm.durationMinutes, 10);

    if (!name) {
      Alert.alert("Workout name needed", "Add a workout plan name before saving.");
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      Alert.alert("Duration needed", "Add duration in minutes before saving.");
      return;
    }

    const planInput = {
      name,
      category: planForm.category,
      durationMinutes,
      intensity: planForm.intensity,
      bodyFocus: parseList(planForm.bodyFocus),
      equipment: planForm.equipment,
      notes: planForm.notes,
      userRestrictions: parseList(planForm.userRestrictions),
    };

    if (editingPlan) {
      void updateCustomWorkoutPlan(editingPlan.id, planInput).then(() => {
        closePlanModal();
        Alert.alert("Workout updated", `${name} has been updated.`);
      });
      return;
    }

    void addCustomWorkoutPlan(planInput).then(() => {
      closePlanModal();
      Alert.alert("Workout added", `${name} is now available in your local workout plans.`);
    });
  };
  const handleDeletePlan = (plan: WorkoutPlan) => {
    if (!plan.isCustom) {
      openPlanModal(plan);
      return;
    }

    Alert.alert("Delete workout plan", `Remove ${plan.name} from your local workout plans? This does not delete completed workout logs.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteCustomWorkoutPlan(plan.id).then(() => {
            Alert.alert("Workout plan deleted", `${plan.name} was removed from local plans.`);
          });
        },
      },
    ]);
  };
  const handleSavePreferences = () => {
    void updatePreferences({
      bodyType: preferencesForm.bodyType,
      goals: parseList(preferencesForm.goals),
      limitations: parseList(preferencesForm.limitations),
      restrictionNotes: preferencesForm.restrictionNotes,
      hideRestrictedWorkouts: preferencesForm.hideRestrictedWorkouts,
    }).then(() => {
      Alert.alert("Preferences saved", "Fitness preferences were saved locally on this device.");
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
  const quickActions = fitness.actions.length > 0 ? (
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
  );

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
              style={styles.manualSummaryCard}
              subtitle="manual completions"
              title="Today"
              tone="primary"
              toneColorsOverride={getFitnessToneColors("primary")}
              value={`${todayCompletionByWorkoutId.size} workouts`}
            />
            <StatsCard
              icon="timer-outline"
              style={styles.manualSummaryCard}
              subtitle="from completed plans"
              title="Active Minutes"
              tone="accent"
              toneColorsOverride={getFitnessToneColors("accent")}
              value={`${manualActiveMinutesToday} min`}
            />
            <StatsCard
              icon="flame-outline"
              style={styles.manualSummaryCard}
              subtitle="estimated workout burn"
              title="Manual Burn"
              tone="warning"
              toneColorsOverride={getFitnessToneColors("warning")}
              value={`${manualCaloriesToday} kcal`}
            />
            <StatsCard
              icon="calendar-outline"
              style={styles.manualSummaryCard}
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

          <DashboardSection title="Quick Actions" />
          {quickActions}

          <DashboardSection
            actionLabel="Save"
            onPress={handleSavePreferences}
            title="Fitness Preferences"
          />
          <CustomCard style={styles.preferencesCard}>
            <Text style={styles.safetyText}>{FITNESS_SAFETY_COPY}</Text>
            <TextInput
              accessibilityLabel="Body type or fitness context"
              onChangeText={(bodyType) => setPreferencesForm((current) => ({ ...current, bodyType }))}
              placeholder="Body type or fitness context"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              value={preferencesForm.bodyType}
            />
            <TextInput
              accessibilityLabel="Fitness goals"
              onChangeText={(goals) => setPreferencesForm((current) => ({ ...current, goals }))}
              placeholder="Goals, comma separated"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              value={preferencesForm.goals}
            />
            <TextInput
              accessibilityLabel="Limitations or restrictions"
              onChangeText={(limitations) => setPreferencesForm((current) => ({ ...current, limitations }))}
              placeholder="Limitations/restrictions, comma separated"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              value={preferencesForm.limitations}
            />
            <TextInput
              accessibilityLabel="Restriction notes"
              multiline
              onChangeText={(restrictionNotes) => setPreferencesForm((current) => ({ ...current, restrictionNotes }))}
              placeholder="Restriction notes stay local and only help filter your workout list."
              placeholderTextColor={COLORS.textMuted}
              style={[styles.input, styles.textArea]}
              value={preferencesForm.restrictionNotes}
            />
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Hide workouts matching restriction notes</Text>
                <Text style={styles.muted}>Uses only your local text labels. It does not determine medical safety.</Text>
              </View>
              <Switch
                onValueChange={(hideRestrictedWorkouts) =>
                  setPreferencesForm((current) => ({ ...current, hideRestrictedWorkouts }))}
                value={preferencesForm.hideRestrictedWorkouts}
              />
            </View>
          </CustomCard>

          <DashboardSection
            actionLabel={selectedCategory ? "Clear" : "Add Workout"}
            onPress={selectedCategory
              ? () => {
                  setWorkoutActionNotice(null);
                  setSelectedCategoryId(null);
                }
              : () => openPlanModal()}
            title="Today's Workout Plans"
          />
          {workoutActionNotice ? (
            <CustomCard style={styles.actionNoticeCard}>
              <View style={styles.actionNoticeIcon}>
                <Ionicons color={FITNESS_COLORS.primary} name="barbell-outline" size={18} />
              </View>
              <Text style={styles.actionNoticeText}>{workoutActionNotice}</Text>
            </CustomCard>
          ) : null}
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
                    onDelete={() => handleDeletePlan(workout)}
                    onEdit={() => openPlanModal(workout)}
                    onStart={() => startTimerForWorkout(workout)}
                    onUndoComplete={completion ? () => handleUndoWorkout(completion) : undefined}
                    restrictionLabel={workout.isRestrictedForUser ? "Matches your restriction notes" : undefined}
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
      <Modal
        animationType="slide"
        onRequestClose={() => setWorkoutPickerVisible(false)}
        transparent
        visible={workoutPickerVisible}
      >
        <View style={styles.modalBackdrop}>
          <CustomCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.cardEyebrow}>Start Workout</Text>
                <Text style={styles.modalTitle}>Choose a plan</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close workout picker"
                accessibilityRole="button"
                onPress={() => setWorkoutPickerVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons color={COLORS.text} name="close" size={20} />
              </TouchableOpacity>
            </View>
            <Text style={styles.safetyText}>{FITNESS_SAFETY_COPY}</Text>
            <ScrollView style={styles.modalScroll}>
              {filteredWorkoutTemplates.length > 0 ? filteredWorkoutTemplates.map((workout) => (
                <TouchableOpacity
                  accessibilityLabel={`Start ${workout.name}`}
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  key={workout.id}
                  onPress={() => startTimerForWorkout(workout)}
                  style={styles.pickerRow}
                >
                  <View style={styles.pickerIcon}>
                    <Ionicons color={FITNESS_COLORS.primary} name={workout.iconName} size={18} />
                  </View>
                  <View style={styles.pickerCopy}>
                    <Text style={styles.pickerTitle}>{workout.name}</Text>
                    <Text style={styles.muted}>{workout.categoryTitle} - {workout.durationMinutes} min - {workout.difficulty}</Text>
                    {workout.isRestrictedForUser ? (
                      <Text style={styles.restrictionText}>Matches your local restriction notes.</Text>
                    ) : null}
                  </View>
                  <Ionicons color={COLORS.textMuted} name="chevron-forward" size={18} />
                </TouchableOpacity>
              )) : (
                <EmptyState
                  icon="barbell-outline"
                  subtitle="Add a local workout plan or clear filters to start a timer."
                  title="No workout plans"
                />
              )}
            </ScrollView>
          </CustomCard>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={closeTimer}
        transparent
        visible={timerVisible}
      >
        <View style={styles.modalBackdrop}>
          <CustomCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.cardEyebrow}>Workout Timer</Text>
                <Text style={styles.modalTitle}>{activeWorkout?.name ?? "Workout"}</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close workout timer"
                accessibilityRole="button"
                onPress={closeTimer}
                style={styles.closeButton}
              >
                <Ionicons color={COLORS.text} name="close" size={20} />
              </TouchableOpacity>
            </View>
            <Text style={styles.timerValue}>{formatElapsed(elapsedSeconds)}</Text>
            <Text style={styles.timerTarget}>Target: {activeWorkout?.durationMinutes ?? 0} min</Text>
            <Text style={styles.safetyText}>Complete only when you are done. Closing or cancelling the timer will not log a workout.</Text>
            <View style={styles.timerControls}>
              <TouchableOpacity
                accessibilityLabel={timerRunning ? "Pause workout timer" : elapsedSeconds > 0 ? "Resume workout timer" : "Start workout timer"}
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={() => setTimerRunning((current) => !current)}
                style={styles.primaryModalButton}
              >
                <Ionicons color={COLORS.white} name={timerRunning ? "pause" : "play"} size={18} />
                <Text style={styles.primaryModalButtonText}>{timerRunning ? "Pause" : elapsedSeconds > 0 ? "Resume" : "Start"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Reset workout timer"
                accessibilityRole="button"
                activeOpacity={0.76}
                onPress={() => {
                  setTimerRunning(false);
                  setElapsedSeconds(0);
                }}
                style={styles.secondaryModalButton}
              >
                <Text style={styles.secondaryModalButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              accessibilityLabel="Complete workout"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={handleCompleteActiveWorkout}
              style={styles.completeModalButton}
            >
              <Ionicons color={COLORS.white} name="checkmark-circle-outline" size={18} />
              <Text style={styles.primaryModalButtonText}>Complete Workout</Text>
            </TouchableOpacity>
          </CustomCard>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setLogModalVisible(false)}
        transparent
        visible={logModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <CustomCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.cardEyebrow}>Manual Log</Text>
                <Text style={styles.modalTitle}>Log Exercise</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close exercise log"
                accessibilityRole="button"
                onPress={() => setLogModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons color={COLORS.text} name="close" size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <TextInput
                accessibilityLabel="Exercise name"
                onChangeText={(name) => setExerciseLogForm((current) => ({ ...current, name }))}
                placeholder="Exercise name"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={exerciseLogForm.name}
              />
              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.chipRow}>
                {workoutCategories.map((category) => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.76}
                    key={category.value}
                    onPress={() => setExerciseLogForm((current) => ({ ...current, category: category.value }))}
                    style={[styles.choiceChip, exerciseLogForm.category === category.value && styles.choiceChipSelected]}
                  >
                    <Text style={[styles.choiceChipText, exerciseLogForm.category === category.value && styles.choiceChipTextSelected]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formLabel}>Intensity</Text>
              <View style={styles.chipRow}>
                {workoutIntensities.map((intensity) => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.76}
                    key={intensity.value}
                    onPress={() => setExerciseLogForm((current) => ({ ...current, intensity: intensity.value }))}
                    style={[styles.choiceChip, exerciseLogForm.intensity === intensity.value && styles.choiceChipSelected]}
                  >
                    <Text style={[styles.choiceChipText, exerciseLogForm.intensity === intensity.value && styles.choiceChipTextSelected]}>
                      {intensity.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                accessibilityLabel="Exercise duration minutes"
                keyboardType="numeric"
                onChangeText={(durationMinutes) => setExerciseLogForm((current) => ({ ...current, durationMinutes }))}
                placeholder="Duration minutes"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={exerciseLogForm.durationMinutes}
              />
              <TextInput
                accessibilityLabel="Calories estimate optional"
                keyboardType="numeric"
                onChangeText={(caloriesEstimate) => setExerciseLogForm((current) => ({ ...current, caloriesEstimate }))}
                placeholder="Calories estimate (optional)"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={exerciseLogForm.caloriesEstimate}
              />
              <TextInput
                accessibilityLabel="Exercise date time"
                onChangeText={(completedAt) => setExerciseLogForm((current) => ({ ...current, completedAt }))}
                placeholder="Date/time ISO, or leave blank for now"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={exerciseLogForm.completedAt}
              />
              <TextInput
                accessibilityLabel="Exercise notes"
                multiline
                onChangeText={(notes) => setExerciseLogForm((current) => ({ ...current, notes }))}
                placeholder="Notes (stored locally; not shown as medical advice)"
                placeholderTextColor={COLORS.textMuted}
                style={[styles.input, styles.textArea]}
                value={exerciseLogForm.notes}
              />
            </ScrollView>
            <TouchableOpacity
              accessibilityLabel="Save exercise log"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={handleSaveManualExercise}
              style={styles.primaryModalButton}
            >
              <Text style={styles.primaryModalButtonText}>Save Exercise</Text>
            </TouchableOpacity>
          </CustomCard>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={closePlanModal}
        transparent
        visible={planModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <CustomCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.cardEyebrow}>{editingPlan ? "Edit Workout" : "Custom Workout"}</Text>
                <Text style={styles.modalTitle}>{editingPlan ? "Update plan" : "Add plan"}</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close workout plan form"
                accessibilityRole="button"
                onPress={closePlanModal}
                style={styles.closeButton}
              >
                <Ionicons color={COLORS.text} name="close" size={20} />
              </TouchableOpacity>
            </View>
            <Text style={styles.safetyText}>{FITNESS_SAFETY_COPY}</Text>
            <ScrollView style={styles.modalScroll}>
              <TextInput
                accessibilityLabel="Workout plan name"
                onChangeText={(name) => setPlanForm((current) => ({ ...current, name }))}
                placeholder="Workout name"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={planForm.name}
              />
              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.chipRow}>
                {workoutCategories.map((category) => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.76}
                    key={category.value}
                    onPress={() => setPlanForm((current) => ({ ...current, category: category.value }))}
                    style={[styles.choiceChip, planForm.category === category.value && styles.choiceChipSelected]}
                  >
                    <Text style={[styles.choiceChipText, planForm.category === category.value && styles.choiceChipTextSelected]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formLabel}>Intensity</Text>
              <View style={styles.chipRow}>
                {workoutIntensities.map((intensity) => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.76}
                    key={intensity.value}
                    onPress={() => setPlanForm((current) => ({ ...current, intensity: intensity.value }))}
                    style={[styles.choiceChip, planForm.intensity === intensity.value && styles.choiceChipSelected]}
                  >
                    <Text style={[styles.choiceChipText, planForm.intensity === intensity.value && styles.choiceChipTextSelected]}>
                      {intensity.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                accessibilityLabel="Workout duration minutes"
                keyboardType="numeric"
                onChangeText={(durationMinutes) => setPlanForm((current) => ({ ...current, durationMinutes }))}
                placeholder="Duration minutes"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={planForm.durationMinutes}
              />
              <TextInput
                accessibilityLabel="Body focus"
                onChangeText={(bodyFocus) => setPlanForm((current) => ({ ...current, bodyFocus }))}
                placeholder="Body focus, comma separated"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={planForm.bodyFocus}
              />
              <TextInput
                accessibilityLabel="Equipment"
                onChangeText={(equipment) => setPlanForm((current) => ({ ...current, equipment }))}
                placeholder="Equipment"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={planForm.equipment}
              />
              <TextInput
                accessibilityLabel="Workout restriction labels"
                onChangeText={(userRestrictions) => setPlanForm((current) => ({ ...current, userRestrictions }))}
                placeholder="Restriction labels, comma separated"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={planForm.userRestrictions}
              />
              <TextInput
                accessibilityLabel="Workout notes"
                multiline
                onChangeText={(notes) => setPlanForm((current) => ({ ...current, notes }))}
                placeholder="Notes"
                placeholderTextColor={COLORS.textMuted}
                style={[styles.input, styles.textArea]}
                value={planForm.notes}
              />
            </ScrollView>
            <TouchableOpacity
              accessibilityLabel="Save workout plan"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={handleSavePlan}
              style={styles.primaryModalButton}
            >
              <Text style={styles.primaryModalButtonText}>{editingPlan ? "Update Workout" : "Add Workout"}</Text>
            </TouchableOpacity>
          </CustomCard>
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
  manualSummaryCard: {
    flexBasis: "47%",
    minHeight: 148,
    minWidth: 150,
  },
  emptyCard: {
    padding: 0,
  },
  actionNoticeCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  actionNoticeIcon: {
    alignItems: "center",
    backgroundColor: FITNESS_COLORS.light,
    borderRadius: SPACING.lg,
    height: SPACING.xxxl,
    justifyContent: "center",
    width: SPACING.xxxl,
  },
  actionNoticeText: {
    color: COLORS.textMuted,
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
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
  preferencesCard: {
    gap: SPACING.md,
  },
  safetyText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: TYPOGRAPHY.lineHeights.sm,
  },
  input: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.border,
    borderRadius: SPACING.lg,
    borderWidth: 1,
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
  },
  switchCopy: {
    flex: 1,
  },
  switchTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(12, 20, 33, 0.44)",
    flex: 1,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  modalCard: {
    maxHeight: "88%",
    maxWidth: SPACING.maxContentWidth,
    padding: SPACING.lg,
    width: "100%",
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
    marginBottom: SPACING.md,
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
    borderRadius: SPACING.lg,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  modalScroll: {
    marginTop: SPACING.md,
  },
  pickerRow: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  pickerIcon: {
    alignItems: "center",
    backgroundColor: FITNESS_COLORS.light,
    borderRadius: SPACING.lg,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pickerCopy: {
    flex: 1,
  },
  pickerTitle: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  restrictionText: {
    color: COLORS.warning,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.xs,
  },
  timerValue: {
    color: FITNESS_COLORS.dark,
    fontSize: 54,
    fontWeight: TYPOGRAPHY.weights.heavy,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  timerTarget: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  timerControls: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  primaryModalButton: {
    alignItems: "center",
    backgroundColor: FITNESS_COLORS.primary,
    borderRadius: SPACING.lg,
    flexDirection: "row",
    flex: 1,
    gap: SPACING.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: SPACING.md,
  },
  completeModalButton: {
    alignItems: "center",
    backgroundColor: COLORS.accent,
    borderRadius: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "center",
    marginTop: SPACING.md,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
  },
  primaryModalButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  secondaryModalButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: SPACING.lg,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: SPACING.lg,
  },
  secondaryModalButtonText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  formLabel: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  choiceChip: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.border,
    borderRadius: SPACING.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  choiceChipSelected: {
    backgroundColor: FITNESS_COLORS.primary,
    borderColor: FITNESS_COLORS.primary,
  },
  choiceChipText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  choiceChipTextSelected: {
    color: COLORS.white,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
});
