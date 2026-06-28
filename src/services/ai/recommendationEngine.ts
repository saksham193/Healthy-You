import type { AIContext, AIIntent, Recommendation } from "../../types";
import { getIntentDomain } from "./intentClassifier";

const createRecommendation = (
  id: string,
  intent: AIIntent,
  message: string,
): Recommendation => ({ id, intent, message });

const hydrationRecommendations = (context: AIContext): Recommendation[] => {
  if (context.nutritionScore < 80) {
    return [
      createRecommendation("hydration-increase", "hydration", "Increase water intake gradually through the day."),
      createRecommendation("hydration-bottle", "hydration", "Keep a water bottle nearby during work or study blocks."),
      createRecommendation("hydration-track", "hydration", "Track hydration after meals and workouts."),
    ];
  }

  return [
    createRecommendation("hydration-maintain", "hydration", "Maintain steady water intake through the day."),
    createRecommendation("hydration-pair", "hydration", "Pair a glass of water with each main meal."),
  ];
};

export function generateRecommendations(context: AIContext, intent: AIIntent): Recommendation[] {
  const domain = getIntentDomain(intent);

  if (domain === "nutrition") {
    return context.nutritionScore < 70
      ? [
          createRecommendation("nutrition-protein", intent, "Increase protein intake."),
          createRecommendation("nutrition-vegetables", intent, "Add more vegetables to your meals."),
          createRecommendation("nutrition-snacks", intent, "Reduce processed snacks today."),
        ]
      : [
          createRecommendation("nutrition-balance", intent, "Keep meals balanced with protein, fiber, and healthy carbs."),
          createRecommendation("nutrition-hydration", intent, "Support nutrition progress with consistent hydration."),
        ];
  }

  if (domain === "fitness") {
    return context.fitnessScore < 70
      ? [
          createRecommendation("fitness-activity", intent, "Increase daily activity."),
          createRecommendation("fitness-walk", intent, "Add 20 minutes of walking."),
          createRecommendation("fitness-workouts", intent, "Complete your scheduled workouts."),
        ]
      : [
          createRecommendation("fitness-maintain", intent, "Maintain your current activity rhythm."),
          createRecommendation("fitness-recovery", intent, "Balance training with recovery time."),
        ];
  }

  if (domain === "sleep") {
    return context.sleepScore < 70
      ? [
          createRecommendation("sleep-bedtime", intent, "Maintain a consistent bedtime."),
          createRecommendation("sleep-screens", intent, "Avoid screens before sleep."),
          createRecommendation("sleep-duration", intent, "Aim for 7-9 hours nightly."),
        ]
      : [
          createRecommendation("sleep-routine", intent, "Keep your current sleep routine consistent."),
          createRecommendation("sleep-wind-down", intent, "Protect your wind-down time before bed."),
        ];
  }

  if (domain === "medication") {
    return context.adherenceScore < 80
      ? [
          createRecommendation("medication-reminders", intent, "Enable reminders."),
          createRecommendation("medication-visible", intent, "Keep medication visible."),
          createRecommendation("medication-organizer", intent, "Use a pill organizer."),
        ]
      : [
          createRecommendation("medication-maintain", intent, "Keep your medication routine consistent."),
          createRecommendation("medication-prepare", intent, "Prepare evening medication ahead of time."),
        ];
  }

  if (domain === "hydration") {
    return hydrationRecommendations(context);
  }

  return [
    createRecommendation("general-lowest", intent, "Focus first on the lowest-scoring health area."),
    createRecommendation("general-small-step", intent, "Choose one small action you can complete today."),
    createRecommendation("general-review", intent, "Review sleep, hydration, and activity before making big changes."),
  ];
}
