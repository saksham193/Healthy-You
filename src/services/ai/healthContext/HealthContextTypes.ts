export type HealthAIContextScope = "today" | "recent" | "screen";

export type HealthAIContext = {
  generatedAt: string;
  scope: HealthAIContextScope;
  summary: string;
  today?: {
    steps?: number;
    stepGoal?: number;
    caloriesLogged?: number;
    mealsLogged?: number;
    workoutsLogged?: number;
    activeMinutes?: number;
    caloriesBurned?: number;
    waterGlasses?: number;
    waterGoal?: number;
  };
  recent?: {
    nutritionSummary?: string;
    fitnessSummary?: string;
    routineSummary?: string;
    reminderSummary?: string;
  };
  activeScreen?: {
    name: string;
    selectedItemSummary?: string;
  };
  safety: {
    medicalAdviceDisclaimer: string;
    dataMayBeIncomplete: boolean;
    contextMinimized: true;
  };
};

export type BuildHealthAIContextOptions = {
  scope?: HealthAIContextScope;
  activeScreen?: HealthAIContext["activeScreen"];
};

export const HEALTH_CONTEXT_SAFETY_NOTICE =
  "This is general wellness information, not a medical diagnosis or treatment plan.";

export const HEALTH_CONTEXT_USER_COPY =
  "Medibot can use a small summary of your logged app data, such as today's steps, meals, workouts, routines, and reminders. This is used only to answer your current message and is not medical advice.";
