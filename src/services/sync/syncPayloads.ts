import type {
  CustomHealthRoutine,
  FitnessWorkoutCompletionEntry,
  HabitCompletionEntry,
  HydrationLogEntry,
  MedicationLogEntry,
  NutritionLogEntry,
} from "../../types";
import type { LocalProfileDisplay } from "../../store/profileSettingsStore";
import { createSyncQueueItem, enqueueSyncItem } from "./syncQueue";
import type { SyncOperation } from "./syncTypes";

const enqueueSafely = async (
  entityType: Parameters<typeof createSyncQueueItem>[0],
  entityId: string,
  operation: SyncOperation,
  payload: unknown,
  localUpdatedAt?: string,
): Promise<void> => {
  try {
    await enqueueSyncItem(createSyncQueueItem(entityType, entityId, operation, payload, localUpdatedAt));
  } catch {
    // Local app behavior must not depend on sync queue persistence.
  }
};

export const queueNutritionMealSync = async (
  meal: NutritionLogEntry,
  operation: SyncOperation,
): Promise<void> => {
  await enqueueSafely(
    "nutrition_log",
    meal.id,
    operation,
    operation === "delete"
      ? { deletedAt: new Date().toISOString() }
      : {
          mealType: meal.mealType,
          title: meal.title,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          loggedAt: meal.loggedAt,
          dateKey: meal.dateKey,
        },
    meal.loggedAt,
  );
};

export const queueHydrationSync = async (
  hydration: HydrationLogEntry,
  operation: SyncOperation,
): Promise<void> => {
  await enqueueSafely(
    "hydration_log",
    hydration.id,
    operation,
    operation === "delete"
      ? { deletedAt: new Date().toISOString() }
      : {
          amountMl: hydration.amountMl,
          loggedAt: hydration.loggedAt,
          dateKey: hydration.dateKey,
        },
    hydration.loggedAt,
  );
};

export const queueFitnessCompletionSync = async (
  completion: FitnessWorkoutCompletionEntry,
  operation: SyncOperation,
): Promise<void> => {
  await enqueueSafely(
    "fitness_log",
    completion.id,
    operation,
    operation === "delete"
      ? { deletedAt: new Date().toISOString() }
      : {
          workoutId: completion.workoutId,
          workoutName: completion.workoutName,
          categoryId: completion.categoryId,
          categoryTitle: completion.categoryTitle,
          durationMinutes: completion.durationMinutes,
          estimatedCalories: completion.estimatedCalories,
          difficulty: completion.difficulty,
          completedAt: completion.completedAt,
          dateKey: completion.dateKey,
        },
    completion.completedAt,
  );
};

export const queueHabitCompletionSync = async (
  completion: HabitCompletionEntry,
  operation: SyncOperation,
): Promise<void> => {
  await enqueueSafely(
    "habit_completion",
    completion.id,
    operation,
    operation === "delete"
      ? { deletedAt: new Date().toISOString() }
      : {
          habitId: completion.habitId,
          habitTitle: completion.habitTitle,
          category: completion.category,
          completedAt: completion.completedAt,
          dateKey: completion.dateKey,
        },
    completion.completedAt,
  );
};

export const queueMedicationLogSync = async (
  log: MedicationLogEntry,
  operation: SyncOperation,
): Promise<void> => {
  await enqueueSafely(
    "medication_log",
    log.id,
    operation,
    operation === "delete"
      ? { deletedAt: new Date().toISOString() }
      : {
          medicationId: log.medicationId,
          medicationName: log.medicationName,
          status: log.status,
          loggedAt: log.loggedAt,
          dateKey: log.dateKey,
        },
    log.loggedAt,
  );
};

export const queueScheduleRoutineSync = async (
  routine: CustomHealthRoutine,
  operation: SyncOperation,
): Promise<void> => {
  await enqueueSafely(
    "schedule_routine",
    routine.id,
    operation,
    operation === "delete"
      ? { deletedAt: new Date().toISOString() }
      : {
          type: routine.type,
          name: routine.name,
          reminderEnabled: routine.reminderEnabled,
          reminderTime: routine.reminderTime,
          updatedAt: routine.updatedAt,
        },
    routine.updatedAt,
  );
};

export const queueProfileSettingsSync = async (
  profile: LocalProfileDisplay | null,
  operation: SyncOperation,
): Promise<void> => {
  const localUpdatedAt = profile?.updatedAt ?? new Date().toISOString();

  await enqueueSafely(
    "profile_settings",
    "local-display-profile",
    operation,
    operation === "delete"
      ? { deletedAt: new Date().toISOString() }
      : {
          displayName: profile?.name,
          primaryGoal: profile?.primaryGoal,
          updatedAt: localUpdatedAt,
        },
    localUpdatedAt,
  );
};
