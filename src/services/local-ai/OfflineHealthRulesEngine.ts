import type { AIContext, HealthTrend, MemoryRecord, PersonalHealthProfile } from "../../types";
import type { OfflineIntent, OfflineRule } from "./types";

type RuleInput = {
  context: AIContext;
  profile: PersonalHealthProfile;
  trends: HealthTrend[];
  memory: MemoryRecord[];
  message: string;
  intent: OfflineIntent;
};

const routineDisclaimer =
  "Offline mode can share general wellness guidance from your saved data, but it cannot assess symptoms or replace a clinician.";
const cautionDisclaimer =
  "Because Medibot is offline, treat this as general wellness guidance and check with a qualified professional for medical decisions.";
const urgentDisclaimer =
  "This could be urgent. Medibot cannot diagnose or assess emergencies, especially offline.";

const makeRule = (
  id: string,
  intent: OfflineIntent,
  message: string,
  riskFlags: string[],
  nextActions: string[],
  safetyLevel: OfflineRule["safetyLevel"] = "routine",
): OfflineRule => ({
  id,
  intent,
  message,
  riskFlags,
  nextActions,
  safetyLevel,
  disclaimer: safetyLevel === "urgent" ? urgentDisclaimer : safetyLevel === "caution" ? cautionDisclaimer : routineDisclaimer,
});

const hasTrendRisk = (trends: HealthTrend[], metric: HealthTrend["metric"]): boolean =>
  trends.some((trend) => trend.metric === metric && trend.riskIndicators.length > 0);

const includesMemory = (memory: MemoryRecord[], category: MemoryRecord["category"], value: RegExp): boolean =>
  memory.some((item) => item.category === category && value.test(item.value));

export class OfflineHealthRulesEngine {
  evaluate(input: RuleInput): OfflineRule[] {
    if (input.intent === "emergency") {
      return [
        makeRule(
          "emergency-escalation",
          "emergency",
          "Your message mentions symptoms that may need urgent medical attention. Please contact local emergency services or go to the nearest emergency department now.",
          ["possible emergency symptom"],
          [
            "Seek urgent local medical help now.",
            "If you are with someone, ask them to stay with you while help is arranged.",
            "Do not use Medibot to decide whether this is safe to wait out.",
          ],
          "urgent",
        ),
      ];
    }

    const rules: OfflineRule[] = [];
    const { context, profile, trends, memory } = input;
    const hydrationPercent = context.hydrationGoal > 0
      ? context.hydrationGlasses / context.hydrationGoal
      : 0;
    const sleepHours = (context.sleepMinutes ?? 0) / 60;
    const stepsPercent = context.stepGoal > 0 ? context.steps / context.stepGoal : 0;
    const calorieTrendRisk = hasTrendRisk(trends, "calories");
    const sleepTrendRisk = hasTrendRisk(trends, "sleep");
    const waterTrendRisk = hasTrendRisk(trends, "water");
    const stepsTrendRisk = hasTrendRisk(trends, "steps");
    const adherenceTrendRisk = hasTrendRisk(trends, "medicationAdherence");
    const topTrend = context.trendIntelligence?.topTrends[0];
    const topDrift = context.trendIntelligence?.habitDrifts[0];
    const briefing = context.dailyBriefing;

    if (input.intent === "daily_briefing" && briefing) {
      rules.push(makeRule(
        "daily-briefing-summary",
        "daily_briefing",
        `${briefing.greeting} ${briefing.summary}`,
        [
          `briefing focus: ${briefing.focusArea ?? "general wellness"}`,
          `briefing confidence: ${briefing.confidence}`,
          briefing.dataSourceNote,
        ],
        [
          ...briefing.recommendedActions.slice(0, 3),
          "Use this as wellness guidance only, not a diagnosis or medical certainty.",
        ],
        briefing.safetyLevel === "urgent" ? "urgent" : briefing.confidence === "low" ? "limited" : "routine",
      ));
    }

    if (input.intent === "trend_summary" && topTrend) {
      rules.push(makeRule(
        "trend-intelligence-summary",
        "trend_summary",
        `${topTrend.label} is ${topTrend.direction.replace(/_/g, " ")} with ${topTrend.confidence} confidence. ${topTrend.reason}`,
        topDrift ? [topDrift.message] : ["trend summary"],
        [
          topTrend.interpretation,
          "Use this as wellness guidance only, not a diagnosis or medical certainty.",
        ],
        topTrend.dataQuality === "stale" || topTrend.dataQuality === "limited" ? "limited" : "routine",
      ));
    }

    if (input.intent === "trend_summary" && !topTrend) {
      rules.push(makeRule(
        "trend-intelligence-insufficient",
        "trend_summary",
        "I do not have enough recent local summary history for a strong trend yet.",
        ["insufficient trend data"],
        ["Keep syncing or logging for a few more days.", "Ask for today's current metrics if you need a snapshot."],
        "limited",
      ));
    }

    if (hydrationPercent > 0 && hydrationPercent < 0.7) {
      rules.push(makeRule(
        "hydration-low",
        "hydration",
        `You have logged ${context.hydrationGlasses} of ${context.hydrationGoal} water glasses, so hydration is below target.`,
        ["low water intake"],
        ["Add one glass now if it is safe for you.", "Pair water with your next meal or break.", "Avoid making extreme fluid changes if you have fluid restrictions."],
        "caution",
      ));
    }

    if (waterTrendRisk) {
      rules.push(makeRule(
        "hydration-trend",
        "hydration",
        "Your recent water trend has been uneven, so a simple hydration routine may help.",
        ["hydration streak issue"],
        ["Set two hydration check-ins today.", "Use your usual bottle or glass size for consistent logging."],
      ));
    }

    if (sleepHours > 0 && sleepHours < 6.5) {
      rules.push(makeRule(
        "sleep-low-duration",
        "sleep",
        `Your saved sleep plan shows about ${sleepHours.toFixed(1)} hours, which is below the common adult sleep range.`,
        ["low sleep duration"],
        ["Protect a consistent wind-down tonight.", "Keep caffeine later in the day modest.", "Avoid driving or risky tasks if you feel very sleepy."],
        "caution",
      ));
    }

    if (sleepTrendRisk || context.sleepScore < 70) {
      rules.push(makeRule(
        "sleep-repeated-poor",
        "sleep",
        "Your sleep score or recent sleep trend suggests repeated poor sleep.",
        ["repeated poor sleep"],
        ["Choose a stable wake time tomorrow.", "Keep screens and heavy meals away from the final wind-down window."],
      ));
    }

    if (context.stepGoal > 0 && stepsPercent < 0.6) {
      rules.push(makeRule(
        "fitness-low-activity",
        "fitness",
        `You are at ${context.steps} of ${context.stepGoal} steps, so activity is below your current target.`,
        ["low activity"],
        ["Try a short easy walk if you feel well.", "Break activity into small blocks instead of one hard session."],
      ));
    }

    if (context.weeklyActivityMinutes >= 300) {
      rules.push(makeRule(
        "fitness-high-activity",
        "fitness",
        "Your weekly activity is high. Recovery matters as much as the next workout.",
        ["high activity"],
        ["Keep one lighter session or rest block.", "Watch for unusual fatigue, dizziness, or pain."],
        "caution",
      ));
    }

    if (
      (typeof context.heartRateBpm === "number" && context.heartRateBpm >= 110) ||
      input.message.match(/\b(high|elevated|fast|racing)\s+(heart\s*rate|pulse)\b/i) ||
      input.message.match(/\bheart\s*rate\s+(is\s+)?(high|elevated|fast|racing)\b/i)
    ) {
      rules.push(makeRule(
        "fitness-elevated-heart-rate",
        "fitness",
        "Your heart rate concern deserves a recovery-first approach, so rest and avoid intense activity until you feel settled.",
        ["elevated heart rate"],
        ["Rest and recheck your wearable reading.", "Seek care promptly if this comes with chest pain, fainting, or severe breathlessness."],
        "caution",
      ));
    }

    if (stepsTrendRisk && context.sleepScore < 70) {
      rules.push(makeRule(
        "fitness-recovery-warning",
        "fitness",
        "Activity and sleep trends point to a recovery-focused day.",
        ["recovery warning"],
        ["Prefer light movement.", "Delay hard training if soreness or fatigue is high."],
      ));
    }

    if (context.currentHealthData.nutritionScore < 60 || calorieTrendRisk) {
      rules.push(makeRule(
        "nutrition-calorie-balance",
        "nutrition",
        "Your nutrition score or calorie trend needs attention, so aim for steady balanced meals rather than big swings.",
        ["possible low or high calorie pattern"],
        ["Build meals around protein, fiber-rich carbs, and vegetables.", "Avoid skipping meals to compensate for earlier choices."],
      ));
    }

    const proteinGoal = profile.goals.some((goal) => /protein|muscle|strength/i.test(goal));
    if (proteinGoal || input.message.match(/\bprotein\b/i)) {
      rules.push(makeRule(
        "nutrition-protein-target",
        "nutrition",
        "Protein can support fullness and recovery when it is spread through the day.",
        ["protein target"],
        ["Include a protein source with your next meal.", "Choose options that fit your dietary preferences and allergies."],
      ));
    }

    const vegetarian = profile.dietaryPreferences.some((item) => /vegetarian|vegan/i.test(item)) ||
      includesMemory(memory, "dietary_preference", /vegetarian|vegan/i);
    if (vegetarian) {
      rules.push(makeRule(
        "nutrition-vegetarian",
        "nutrition",
        "Your remembered preference suggests vegetarian-friendly choices.",
        ["vegetarian preference"],
        ["Consider lentils, beans, tofu, paneer, yogurt, nuts, or seeds if they fit your diet.", "Pair plant proteins with vegetables and whole grains."],
      ));
    }

    if (profile.allergies.length > 0) {
      rules.push(makeRule(
        "nutrition-allergy-avoidance",
        "nutrition",
        `Avoid known allergens in your profile: ${profile.allergies.join(", ")}.`,
        ["allergy avoidance"],
        ["Check labels and ingredients.", "Choose a different option when ingredients are unclear."],
        "caution",
      ));
    }

    if (context.adherenceScore < 80 || adherenceTrendRisk || input.message.match(/\bmissed|forgot|skip/i)) {
      rules.push(makeRule(
        "medication-adherence",
        "medication",
        "Your medication adherence data or message suggests a missed-dose risk. Use your prescribed schedule and do not change dose timing or amount based on offline guidance.",
        ["missed dose reminder", "adherence warning"],
        ["Use your prescribed schedule and label instructions.", "Ask your doctor or pharmacist what to do about missed doses.", "Do not change dose timing or amount based on offline guidance."],
        "caution",
      ));
    }

    if (
      context.deviceDataSource === "cache" ||
      context.deviceDataSource === "fallback" ||
      context.deviceDataSource === "demo" ||
      context.deviceDataSource === "no_data" ||
      context.deviceDataSource === "unavailable"
    ) {
      rules.push(makeRule(
        "device-data-quality",
        "device_status",
        `Your health data source is ${context.deviceDataSource}, so some readings may be stale or demo-based.`,
        ["stale cached data", "demo data warning"],
        ["Reconnect when internet is available.", "Open device permissions if live sync is missing.", "Interpret recommendations as approximate until fresh sync completes."],
        "limited",
      ));
    }

    if (context.lastDeviceSyncAt) {
      const ageMs = Date.now() - new Date(context.lastDeviceSyncAt).getTime();
      if (Number.isFinite(ageMs) && ageMs > 24 * 60 * 60 * 1000) {
        rules.push(makeRule(
          "device-no-recent-sync",
          "device_status",
          "Your last device sync is more than a day old.",
          ["no recent sync"],
          ["Sync your device when connectivity returns.", "Use today's self-reported data for better offline guidance."],
          "limited",
        ));
      }
    }

    if (rules.length === 0) {
      rules.push(makeRule(
        "general-safe-baseline",
        input.intent === "unknown" ? "general_health" : input.intent,
        "I can give limited offline wellness guidance from saved profile, memory, trend, and device data.",
        ["offline limited capability"],
        ["Focus on one small, safe action today.", "Reconnect for cloud AI and fresher data when available."],
        "limited",
      ));
    }

    return rules.filter((rule) => rule.intent === input.intent || input.intent === "general_health" || input.intent === "unknown" || rule.intent === "device_status");
  }
}

export const offlineHealthRulesEngine = new OfflineHealthRulesEngine();
