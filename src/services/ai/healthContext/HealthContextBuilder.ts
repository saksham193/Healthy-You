import { useFitnessStore, getLocalDateKey as getFitnessDateKey } from "../../../store/fitnessStore";
import { useHealthStore } from "../../../store/healthStore";
import { useNutritionStore, getLocalDateKey as getNutritionDateKey } from "../../../store/nutritionStore";
import { useScheduleStore, getLocalDateKey as getScheduleDateKey } from "../../../store/scheduleStore";
import {
  capHealthContextList,
  enforceHealthContextSize,
  sanitizeHealthContextNumber,
  sanitizeHealthContextText,
} from "./HealthContextSanitizer";
import {
  HEALTH_CONTEXT_SAFETY_NOTICE,
  type BuildHealthAIContextOptions,
  type HealthAIContext,
} from "./HealthContextTypes";

const mlToGlasses = (amountMl: number): number => Math.round(amountMl / 250);

const hydrateStores = async (): Promise<void> => {
  const nutrition = useNutritionStore.getState();
  const fitness = useFitnessStore.getState();
  const schedule = useScheduleStore.getState();

  await Promise.all([
    nutrition.hydrated ? Promise.resolve() : nutrition.hydrate(),
    fitness.hydrated ? Promise.resolve() : fitness.hydrate(),
    schedule.hydrated ? Promise.resolve() : schedule.hydrate(),
  ]);
};

export const buildHealthAIContext = async (
  options: BuildHealthAIContextOptions = {},
): Promise<HealthAIContext> => {
  await hydrateStores();

  const scope = options.scope ?? "today";
  const health = useHealthStore.getState();
  const nutrition = useNutritionStore.getState();
  const fitness = useFitnessStore.getState();
  const schedule = useScheduleStore.getState();
  const todayKey = getNutritionDateKey();
  const fitnessTodayKey = getFitnessDateKey();
  const scheduleTodayKey = getScheduleDateKey();

  const todayMeals = nutrition.meals.filter((meal) => meal.dateKey === todayKey);
  const todayHydration = nutrition.hydration.filter((entry) => entry.dateKey === todayKey);
  const todayWorkouts = fitness.completions.filter((entry) => entry.dateKey === fitnessTodayKey);
  const todayHabits = schedule.habitCompletions.filter((entry) => entry.dateKey === scheduleTodayKey);
  const todayMedicationLogs = schedule.medicationLogs.filter((entry) => entry.dateKey === scheduleTodayKey);
  const reminderRoutines = schedule.customRoutines.filter((routine) => routine.reminderEnabled);

  const caloriesLogged = todayMeals.reduce((total, meal) => total + (sanitizeHealthContextNumber(meal.calories, 20000) ?? 0), 0);
  const waterGlasses = mlToGlasses(todayHydration.reduce((total, entry) => total + entry.amountMl, 0));
  const workoutMinutes = todayWorkouts.reduce((total, workout) => total + workout.durationMinutes, 0);
  const workoutCalories = todayWorkouts.reduce((total, workout) => total + workout.estimatedCalories, 0);

  const steps = sanitizeHealthContextNumber(health.fitness?.summary.steps);
  const stepGoal = sanitizeHealthContextNumber(health.fitness?.summary.stepGoal);
  const waterGoal = sanitizeHealthContextNumber(health.nutrition?.summary.waterGoal);

  const mealNames = capHealthContextList(todayMeals.map((meal) => `${meal.mealType}: ${meal.title}`), 4);
  const workoutNames = capHealthContextList(todayWorkouts.map((workout) => workout.workoutName), 4);
  const routineNames = capHealthContextList(schedule.customRoutines.map((routine) => routine.name), 5);
  const reminderNames = capHealthContextList(reminderRoutines.map((routine) => routine.name), 5);

  const summaryParts = [
    steps !== undefined ? `Steps today: ${steps}${stepGoal ? ` of ${stepGoal}` : ""}.` : "Steps today are not logged in the current app context.",
    `${todayMeals.length} meal${todayMeals.length === 1 ? "" : "s"} logged today${caloriesLogged ? `, about ${caloriesLogged} calories` : ""}.`,
    `${todayWorkouts.length} workout${todayWorkouts.length === 1 ? "" : "s"} logged today${workoutMinutes ? `, ${workoutMinutes} active minutes` : ""}.`,
    `${schedule.customRoutines.length} custom routine${schedule.customRoutines.length === 1 ? "" : "s"} and ${reminderRoutines.length} enabled reminder${reminderRoutines.length === 1 ? "" : "s"} are in the local schedule context.`,
  ];

  const context: HealthAIContext = {
    generatedAt: new Date().toISOString(),
    scope,
    summary: sanitizeHealthContextText(summaryParts.join(" "), 1200) ?? "Healthy You app context is currently limited.",
    today: {
      steps,
      stepGoal,
      caloriesLogged: caloriesLogged > 0 ? sanitizeHealthContextNumber(caloriesLogged, 20000) : undefined,
      mealsLogged: todayMeals.length,
      workoutsLogged: todayWorkouts.length,
      activeMinutes: workoutMinutes > 0 ? sanitizeHealthContextNumber(workoutMinutes, 1440) : undefined,
      caloriesBurned: workoutCalories > 0
        ? sanitizeHealthContextNumber(workoutCalories, 20000)
        : sanitizeHealthContextNumber(health.fitness?.summary.caloriesBurned, 50000),
      waterGlasses: waterGlasses > 0 ? sanitizeHealthContextNumber(waterGlasses, 100) : health.nutrition?.summary.waterGlasses,
      waterGoal,
    },
    recent: {
      nutritionSummary: sanitizeHealthContextText(
        mealNames.length ? `Today's logged meals: ${mealNames.join("; ")}.` : "No detailed meals are logged for today.",
      ),
      fitnessSummary: sanitizeHealthContextText(
        workoutNames.length ? `Today's workouts: ${workoutNames.join("; ")}.` : "No detailed workouts are logged for today.",
      ),
      routineSummary: sanitizeHealthContextText(
        routineNames.length ? `Custom routines: ${routineNames.join("; ")}.` : "No custom routines are logged.",
      ),
      reminderSummary: sanitizeHealthContextText(
        [
          reminderNames.length ? `Enabled reminders: ${reminderNames.join("; ")}.` : "No enabled custom reminders are logged.",
          `${todayHabits.length} habit completion${todayHabits.length === 1 ? "" : "s"} and ${todayMedicationLogs.length} medication log${todayMedicationLogs.length === 1 ? "" : "s"} are recorded today.`,
        ].join(" "),
      ),
    },
    activeScreen: options.activeScreen
      ? {
          name: sanitizeHealthContextText(options.activeScreen.name, 80) ?? "Unknown",
          selectedItemSummary: sanitizeHealthContextText(options.activeScreen.selectedItemSummary, 240),
        }
      : undefined,
    safety: {
      medicalAdviceDisclaimer: HEALTH_CONTEXT_SAFETY_NOTICE,
      dataMayBeIncomplete: true,
      contextMinimized: true,
    },
  };

  return enforceHealthContextSize(context);
};
