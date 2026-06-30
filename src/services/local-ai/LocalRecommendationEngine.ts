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
    const learnedPreferences = input.context.intelligenceProfile?.learnedPreferences ?? [];
    const preferredWorkoutTime = learnedPreferences.find(
      (preference) => preference.key === "preferred_workout_time" && preference.confidence >= 0.7,
    );
    const favoriteActivity = learnedPreferences.find(
      (preference) => preference.key === "favorite_activity" && preference.confidence >= 0.7,
    );
    const trendSignal = input.context.trendIntelligence?.topTrends[0];
    const coachingSignal = input.context.goalHabitCoaching?.recommendations[0];
    const topInsight = input.context.aiInsights?.topInsights[0];
    const briefing = input.context.dailyBriefing;

    if (briefing && briefing.safetyLevel !== "urgent" && briefing.recommendedActions[0]) {
      items.push(recommendation(
        "offline-daily-briefing-focus",
        "daily_briefing",
        briefing.recommendedActions[0],
        `Daily briefing focus: ${briefing.focusArea ?? "general wellness"}. ${briefing.dataSourceNote}`,
        briefing.safetyLevel === "caution" ? "high" : briefing.confidence === "low" ? "medium" : "high",
      ));
    }

    if (topInsight && topInsight.safetyLevel !== "urgent") {
      items.push(recommendation(
        `offline-insight-${topInsight.category}`,
        topInsight.category === "activity" || topInsight.category === "recovery"
          ? "fitness"
          : topInsight.category === "device_data"
            ? "device_status"
            : topInsight.category === "general_wellness"
              ? "general_health"
              : topInsight.category,
        topInsight.suggestedAction,
        `Top ranked insight: ${topInsight.title}. ${topInsight.explanation}`,
        topInsight.priority,
      ));
    }

    if (coachingSignal) {
      items.push(recommendation(
        `offline-coaching-${coachingSignal.domain}`,
        coachingSignal.domain === "activity" || coachingSignal.domain === "recovery"
          ? "fitness"
          : coachingSignal.domain === "medication_adherence"
            ? "medication"
            : coachingSignal.domain === "general_wellness"
              ? "general_health"
              : coachingSignal.domain,
        coachingSignal.message,
        `${coachingSignal.reason} Coaching confidence is ${coachingSignal.confidence}.`,
        coachingSignal.priority,
      ));
    }

    if ((input.intent === "hydration" || input.intent === "general_health") && hydrationPercent < 0.85) {
      items.push(recommendation(
        "offline-hydration-checkin",
        "hydration",
        "Drink one normal glass of water now if you are not on a fluid restriction, then log it.",
        `Hydration is ${input.context.hydrationGlasses}/${input.context.hydrationGoal || "unknown"} glasses.`,
        hydrationPercent < 0.6 ? "high" : "medium",
      ));
    }

    if (
      (input.intent === "trend_summary" || input.intent === "general_health") &&
      trendSignal &&
      trendSignal.direction !== "insufficient_data"
    ) {
      items.push(recommendation(
        "offline-trend-focus",
        input.intent === "trend_summary" ? "trend_summary" : "general_health",
        trendSignal.metric === "sleep_minutes"
          ? "Make sleep recovery the trend focus today."
          : trendSignal.metric === "hydration_ml"
            ? "Make hydration consistency the trend focus today."
            : trendSignal.metric === "steps" || trendSignal.metric === "activity_minutes"
              ? "Make gentle movement the trend focus today."
              : "Use the top trend as today's wellness focus.",
        `${trendSignal.label} is ${trendSignal.direction} with ${trendSignal.confidence} confidence. ${trendSignal.interpretation}`,
        trendSignal.habitDrift || trendSignal.abnormalChange ? "high" : "medium",
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
        favoriteActivity
          ? `Add a short ${favoriteActivity.value} session if you feel well.`
          : "Add a short easy walk or mobility break if you feel well.",
        [
          `Steps are ${input.context.steps}/${input.context.stepGoal}.`,
          preferredWorkoutTime ? `Learned workout time: ${preferredWorkoutTime.value}.` : "",
          favoriteActivity ? `Favorite activity confidence: ${Math.round(favoriteActivity.confidence * 100)}%.` : "",
        ].filter(Boolean).join(" "),
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

    return dedupeRecommendations(items).slice(0, 5);
  }
}

export const localRecommendationEngine = new LocalRecommendationEngine();

const dedupeRecommendations = (items: OfflineRecommendation[]): OfflineRecommendation[] => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.message.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);

    return true;
  });
};
