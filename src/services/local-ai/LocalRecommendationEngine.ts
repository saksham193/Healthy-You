import type { AIContext, HealthTrend, MemoryRecord, PersonalHealthProfile } from "../../types";
import type { OfflineIntent, OfflineRecommendation, OfflineRule } from "./types";

type RecommendationInput = {
  intent: OfflineIntent;
  context: AIContext;
  profile: PersonalHealthProfile;
  memory: MemoryRecord[];
  trends: HealthTrend[];
  rules: OfflineRule[];
};

const recommendation = (
  id: string,
  intent: OfflineIntent,
  message: string,
  reason: string,
  priority: OfflineRecommendation["priority"] = "medium",
): OfflineRecommendation => ({ id, intent, message, reason, priority });

const hasMemory = (memory: MemoryRecord[], category: MemoryRecord["category"], pattern: RegExp): boolean =>
  memory.some((item) => item.category === category && pattern.test(item.value));

const hasTrendRisk = (trends: HealthTrend[], metric: HealthTrend["metric"]): boolean =>
  trends.some((trend) => trend.metric === metric && trend.riskIndicators.length > 0);

export class LocalRecommendationEngine {
  generate(input: RecommendationInput): OfflineRecommendation[] {
    if (input.intent === "emergency") {
      return [
        recommendation(
          "urgent-local-care",
          "emergency",
          "Please seek urgent local medical help now.",
          "Emergency-like symptoms should not be handled by offline guidance.",
          "high",
        ),
      ];
    }

    const items: OfflineRecommendation[] = [];
    const hydrationPercent = input.context.hydrationGoal > 0
      ? input.context.hydrationGlasses / input.context.hydrationGoal
      : 0;
    const vegetarian = input.profile.dietaryPreferences.some((item) => /vegetarian|vegan/i.test(item)) ||
      hasMemory(input.memory, "dietary_preference", /vegetarian|vegan/i);

    if ((input.intent === "hydration" || input.intent === "general_health") && hydrationPercent < 0.85) {
      items.push(recommendation(
        "offline-hydration-checkin",
        "hydration",
        "Drink one normal glass of water now if you are not on a fluid restriction, then log it.",
        `Hydration is ${input.context.hydrationGlasses}/${input.context.hydrationGoal || "unknown"} glasses.`,
        hydrationPercent < 0.6 ? "high" : "medium",
      ));
    }

    if ((input.intent === "sleep" || input.intent === "general_health") && (input.context.sleepScore < 75 || hasTrendRisk(input.trends, "sleep"))) {
      items.push(recommendation(
        "offline-sleep-routine",
        "sleep",
        "Keep tonight's wind-down simple: consistent bedtime, dimmer screens, and a short calming routine.",
        "Saved sleep score or trend needs attention.",
        "medium",
      ));
    }

    if ((input.intent === "fitness" || input.intent === "general_health") && input.context.stepGoal > 0 && input.context.steps < input.context.stepGoal) {
      items.push(recommendation(
        "offline-light-activity",
        "fitness",
        "Add a short easy walk or mobility break if you feel well.",
        `Steps are ${input.context.steps}/${input.context.stepGoal}.`,
        input.context.steps < input.context.stepGoal * 0.5 ? "high" : "medium",
      ));
    }

    if (input.intent === "fitness" && input.context.weeklyActivityMinutes >= 300) {
      items.push(recommendation(
        "offline-recovery",
        "fitness",
        "Make the next session light or recovery-focused.",
        "Weekly activity is already high.",
        "medium",
      ));
    }

    if ((input.intent === "nutrition" || input.intent === "general_health") && vegetarian) {
      items.push(recommendation(
        "offline-vegetarian-meal",
        "nutrition",
        "Choose a vegetarian meal with a protein source such as lentils, beans, tofu, paneer, yogurt, nuts, or seeds if suitable for you.",
        "Profile or memory indicates a vegetarian preference.",
        "medium",
      ));
    }

    if (input.intent === "nutrition" && input.profile.allergies.length > 0) {
      items.push(recommendation(
        "offline-allergy-check",
        "nutrition",
        `Check labels and avoid saved allergens such as ${input.profile.allergies.join(", ")} before choosing a meal.`,
        `Saved allergies: ${input.profile.allergies.join(", ")}.`,
        "high",
      ));
    }

    if ((input.intent === "medication" || input.intent === "general_health") && input.context.adherenceScore < 85) {
      items.push(recommendation(
        "offline-medication-routine",
        "medication",
        "Use your prescribed schedule, set a reminder, and ask a pharmacist or clinician about missed-dose instructions.",
        `Adherence score is ${input.context.adherenceScore}.`,
        "high",
      ));
    }

    if (input.intent === "device_status" || input.rules.some((rule) => rule.intent === "device_status")) {
      items.push(recommendation(
        "offline-device-sync",
        "device_status",
        "Reconnect and refresh device permissions when internet is available.",
        `Current device data source is ${input.context.deviceDataSource}.`,
        "medium",
      ));
    }

    const profileGoal = input.profile.goals[0];
    if (profileGoal && items.length < 4) {
      items.push(recommendation(
        "offline-profile-goal",
        input.intent === "unknown" ? "general_health" : input.intent,
        "Pick one small action that supports your saved goal today.",
        `Saved goal: ${profileGoal}.`,
        "low",
      ));
    }

    if (items.length === 0) {
      items.push(recommendation(
        "offline-safe-small-step",
        input.intent === "unknown" ? "general_health" : input.intent,
        "Choose one low-risk wellness action: hydrate, take a short walk, prepare a balanced meal, or protect bedtime.",
        "Offline mode has limited context.",
        "low",
      ));
    }

    return items.slice(0, 5);
  }
}

export const localRecommendationEngine = new LocalRecommendationEngine();
