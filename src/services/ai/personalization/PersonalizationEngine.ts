import type {
  AIContext,
  CoachingStyle,
  ConversationMemoryItem,
  LearnedPreference,
  MemoryInput,
  MemoryRecord,
  PersonalHealthProfile,
  PersonalizationSignal,
  PersonalizedRecommendation,
  PreferredResponseLength,
  UserIntelligenceProfile,
} from "../../../types";
import { longTermMemory } from "../memory/LongTermMemory";

type IntelligenceInput = {
  profile: PersonalHealthProfile;
  context: Pick<
    AIContext,
    | "healthScore"
    | "nutritionScore"
    | "fitnessScore"
    | "sleepScore"
    | "adherenceScore"
    | "hydrationStatus"
    | "hydrationGlasses"
    | "hydrationGoal"
    | "steps"
    | "stepGoal"
    | "weeklyActivityMinutes"
    | "heartRateBpm"
    | "sleepMinutes"
    | "trends"
    | "deviceDataSource"
    | "lastDeviceSyncAt"
  >;
  memories: MemoryRecord[];
  conversation?: ConversationMemoryItem[];
  now?: Date;
};

type LearningInput = {
  message: string;
  response?: string;
  context: AIContext;
  conversation?: ConversationMemoryItem[];
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const scoreLabel = (score: number): string => {
  if (score >= 85) return "strong";
  if (score >= 70) return "steady";
  if (score >= 50) return "needs attention";

  return "limited";
};

const titleCase = (value: string): string =>
  value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const preferenceId = (key: string, value: string): string =>
  `personalization-${key}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const getMetaString = (memory: MemoryRecord, key: string): string | undefined => {
  const value = memory.metadata?.[key];

  return typeof value === "string" ? value : undefined;
};

const getMetaNumber = (memory: MemoryRecord, key: string): number | undefined => {
  const value = memory.metadata?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const getOptionalMetaNumber = (memory: MemoryRecord | undefined, key: string): number | undefined =>
  memory ? getMetaNumber(memory, key) : undefined;

const getLearnedPreferences = (memories: MemoryRecord[]): LearnedPreference[] =>
  memories
    .filter((memory) => memory.metadata?.personalizationPreference === true)
    .map((memory) => {
      const key = getMetaString(memory, "preferenceKey") ?? memory.category;
      const value = getMetaString(memory, "preferenceValue") ?? memory.value;
      const label = getMetaString(memory, "preferenceLabel") ?? titleCase(value);
      const evidenceCount = getMetaNumber(memory, "evidenceCount") ?? 1;

      return {
        id: memory.id,
        key,
        label,
        value,
        confidence: clamp(memory.confidence, 0, 0.99),
        evidenceCount,
        source: "conversation" as const,
        updatedAt: memory.updatedAt,
      };
    })
    .sort((left, right) => right.confidence - left.confidence || right.updatedAt.localeCompare(left.updatedAt));

const findPreference = (preferences: LearnedPreference[], key: string): LearnedPreference | undefined =>
  preferences.find((preference) => preference.key === key);

const responseLengthFromPreferences = (preferences: LearnedPreference[]): PreferredResponseLength => {
  const responseStyle = findPreference(preferences, "preferred_response_length");

  if (responseStyle?.value === "minimal") return "minimal";
  if (responseStyle?.value === "detailed") return "detailed";

  return "concise";
};

const coachingStyleFromPreferences = (preferences: LearnedPreference[]): CoachingStyle | undefined => {
  const direct = findPreference(preferences, "preferred_coaching_style");

  if (direct && direct.confidence >= 0.65) return direct.value as CoachingStyle;

  if (findPreference(preferences, "motivation_style")?.confidence && findPreference(preferences, "motivation_style")!.confidence >= 0.7) {
    return "motivational";
  }

  return undefined;
};

const inferFitnessLevel = (input: IntelligenceInput): string => {
  const score = input.context.fitnessScore;
  const activity = input.profile.activityLevel;

  if (activity) return `${activity.toLowerCase()} (${scoreLabel(score)} fitness signals)`;
  if (score >= 85) return "advanced";
  if (score >= 70) return "moderate";
  if (score >= 50) return "building consistency";

  return "unknown or low-data";
};

const inferActivityPattern = (input: IntelligenceInput, preferences: LearnedPreference[]): string => {
  const workoutTime = findPreference(preferences, "preferred_workout_time");
  const favoriteActivity = findPreference(preferences, "favorite_activity");
  const stepPercent = input.context.stepGoal > 0 ? Math.round((input.context.steps / input.context.stepGoal) * 100) : 0;

  return [
    `${input.context.steps}/${input.context.stepGoal || "unknown"} steps (${stepPercent}%)`,
    `${input.context.weeklyActivityMinutes} weekly active minutes`,
    workoutTime ? `${workoutTime.value} workouts` : undefined,
    favoriteActivity ? `likes ${favoriteActivity.value}` : undefined,
  ].filter(Boolean).join("; ");
};

const inferSleepPattern = (input: IntelligenceInput, preferences: LearnedPreference[]): string => {
  const schedule = findPreference(preferences, "preferred_sleep_schedule");
  const minutes = input.context.sleepMinutes;
  const hours = typeof minutes === "number" ? `${Math.round((minutes / 60) * 10) / 10}h` : "unknown duration";

  return [
    `${hours}, ${scoreLabel(input.context.sleepScore)} sleep score`,
    schedule ? `prefers ${schedule.value}` : undefined,
  ].filter(Boolean).join("; ");
};

const inferHydrationPattern = (input: IntelligenceInput, preferences: LearnedPreference[]): string => {
  const habit = findPreference(preferences, "hydration_habit");

  return [
    `${input.context.hydrationGlasses}/${input.context.hydrationGoal || "unknown"} glasses (${input.context.hydrationStatus.toLowerCase()})`,
    habit ? habit.value : undefined,
  ].filter(Boolean).join("; ");
};

const inferNutritionPattern = (input: IntelligenceInput): string => {
  const preferences = input.profile.dietaryPreferences.length > 0
    ? `preferences: ${input.profile.dietaryPreferences.slice(0, 3).join(", ")}`
    : "no dietary preferences recorded";

  return `${scoreLabel(input.context.nutritionScore)} nutrition signals; ${preferences}`;
};

const inferStressPattern = (input: IntelligenceInput): string => {
  const signals: string[] = [];

  if (input.context.sleepScore > 0 && input.context.sleepScore < 70) signals.push("sleep recovery may be strained");
  if (input.context.heartRateBpm && input.context.heartRateBpm > 90) signals.push("heart rate is elevated");
  if (input.profile.recoveryProfile?.recoveryStatus) signals.push(`recovery is ${input.profile.recoveryProfile.recoveryStatus}`);

  return signals.length > 0 ? signals.join("; ") : "no strong local stress signal";
};

const riskFactors = (input: IntelligenceInput): string[] => [
  ...input.profile.chronicConditions,
  ...input.profile.allergies.map((item) => `allergy: ${item}`),
  input.context.hydrationGoal > 0 && input.context.hydrationGlasses / input.context.hydrationGoal < 0.7
    ? "hydration below target"
    : "",
  input.context.sleepScore > 0 && input.context.sleepScore < 70 ? "sleep below target" : "",
  input.context.adherenceScore > 0 && input.context.adherenceScore < 85 ? "medication adherence below target" : "",
].filter(Boolean);

const behaviorConfidence = (input: IntelligenceInput, preferences: LearnedPreference[]): number => {
  const knownSignals = [
    input.context.healthScore > 0,
    input.context.nutritionScore > 0,
    input.context.fitnessScore > 0,
    input.context.sleepScore > 0,
    input.context.hydrationGoal > 0,
    input.context.stepGoal > 0,
    input.context.lastDeviceSyncAt !== null,
    preferences.length > 0,
  ].filter(Boolean).length;

  return Math.round((knownSignals / 8) * 100);
};

const learningConfidence = (preferences: LearnedPreference[]): number => {
  if (preferences.length === 0) return 0;

  const average = preferences.reduce((sum, preference) => sum + preference.confidence, 0) / preferences.length;

  return Math.round(average * 100);
};

const profileSignals = (input: IntelligenceInput, preferences: LearnedPreference[]): PersonalizationSignal[] => {
  const memoryRichness = Math.min(input.memories.length, 10);
  const preferenceConfidence = learningConfidence(preferences);

  return [
    { id: "profile-completeness", label: "Profile completeness", value: input.profile.profileCompletenessScore, confidence: input.profile.profileCompletenessScore / 100 },
    { id: "memory-richness", label: "Memory richness", value: memoryRichness, confidence: memoryRichness / 10 },
    { id: "preference-learning", label: "Preference learning", value: preferenceConfidence, confidence: preferenceConfidence / 100 },
    { id: "device-context", label: "Device context", value: input.context.deviceDataSource, confidence: input.context.deviceDataSource === "live" ? 0.95 : input.context.deviceDataSource === "cache" ? 0.75 : 0.35 },
  ];
};

export function calculatePersonalizationScore(input: IntelligenceInput): number {
  const preferences = getLearnedPreferences(input.memories);
  const knownHabits = [
    input.context.hydrationGoal > 0,
    input.context.stepGoal > 0,
    input.context.sleepScore > 0,
    input.context.nutritionScore > 0,
    input.context.fitnessScore > 0,
    input.profile.goals.length > 0,
    input.profile.dietaryPreferences.length > 0 || input.profile.allergies.length > 0,
    preferences.length > 0,
  ].filter(Boolean).length / 8;
  const memoryRichness = Math.min(input.memories.length / 8, 1);
  const consistencySignals = input.context.trends.length > 0
    ? input.context.trends.filter((trend) => trend.direction === "stable" || trend.riskIndicators.length === 0).length / input.context.trends.length
    : 0.5;
  const preferenceStrength = preferences.length > 0
    ? preferences.reduce((sum, preference) => sum + preference.confidence, 0) / preferences.length
    : 0;

  return Math.round(
    knownHabits * 25 +
    (input.profile.profileCompletenessScore / 100) * 30 +
    memoryRichness * 20 +
    consistencySignals * 15 +
    preferenceStrength * 10,
  );
}

export function adaptCoachingStyle(message: string, preferences: LearnedPreference[] = []): CoachingStyle {
  const normalized = message.toLowerCase();

  if (/\b(brief|short|quick|concise|minimal|just tell me)\b/.test(normalized)) return "minimal";
  if (/\b(science|scientific|study|research|evidence|explain why|why)\b/.test(normalized)) return "scientific";
  if (/\b(motivate|motivation|challenge|push me|encourage)\b/.test(normalized)) return "motivational";
  if (/\b(clinical|professional|formal)\b/.test(normalized)) return "professional";

  return coachingStyleFromPreferences(preferences) ?? "friendly";
}

export function buildUserIntelligenceProfile(input: IntelligenceInput): UserIntelligenceProfile {
  const preferences = getLearnedPreferences(input.memories);
  const preferredCoachingStyle = adaptCoachingStyle(input.conversation?.at(-1)?.message ?? "", preferences);
  const preferredResponseLength = responseLengthFromPreferences(preferences);
  const score = calculatePersonalizationScore(input);

  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    fitnessLevel: inferFitnessLevel(input),
    activityPattern: inferActivityPattern(input, preferences),
    sleepPattern: inferSleepPattern(input, preferences),
    hydrationPattern: inferHydrationPattern(input, preferences),
    nutritionPattern: inferNutritionPattern(input),
    stressPattern: inferStressPattern(input),
    motivationStyle: findPreference(preferences, "motivation_style")?.value ?? "supportive",
    preferredCoachingStyle,
    preferredResponseLength,
    healthGoals: input.profile.goals,
    riskFactors: riskFactors(input),
    behaviorConfidence: behaviorConfidence(input, preferences),
    learningConfidence: learningConfidence(preferences),
    personalizationScore: score,
    learnedPreferences: preferences,
    signals: profileSignals(input, preferences),
  };
}

const createPreferenceMemory = (
  key: string,
  value: string,
  label: string,
  sourceMessage: string,
  existing?: MemoryRecord,
  baseConfidence = 0.72,
): MemoryInput => {
  const evidenceCount = (getOptionalMetaNumber(existing, "evidenceCount") ?? 0) + 1;
  const confidence = clamp(Math.max(existing?.confidence ?? 0, baseConfidence) + Math.min(evidenceCount, 5) * 0.04, 0.55, 0.98);

  return {
    category: key === "favorite_activity" || key === "preferred_workout_time" ? "exercise_preference" : "recurring_topic",
    value,
    sourceMessage,
    confidence,
    type: "preference",
    source: "conversation",
    importance: Math.round(confidence * 100),
    metadata: {
      personalizationPreference: true,
      preferenceId: preferenceId(key, value),
      preferenceKey: key,
      preferenceValue: value,
      preferenceLabel: label,
      evidenceCount,
    },
  };
};

const detectPreferences = (message: string): Array<{ key: string; value: string; label: string; confidence?: number }> => {
  const normalized = message.toLowerCase();
  const detected: Array<{ key: string; value: string; label: string; confidence?: number }> = [];

  if (/\b(brief|short|quick|concise)\b/.test(normalized)) {
    detected.push({ key: "preferred_response_length", value: "concise", label: "Concise replies", confidence: 0.82 });
  }
  if (/\b(minimal|just tell me|one line|no details)\b/.test(normalized)) {
    detected.push({ key: "preferred_response_length", value: "minimal", label: "Minimal replies", confidence: 0.84 });
  }
  if (/\b(detailed|explain|why|break it down)\b/.test(normalized)) {
    detected.push({ key: "preferred_response_length", value: "detailed", label: "Detailed explanations", confidence: 0.74 });
  }
  if (/\b(scientific|science|research|evidence)\b/.test(normalized)) {
    detected.push({ key: "preferred_coaching_style", value: "scientific", label: "Scientific coaching", confidence: 0.82 });
  }
  if (/\b(motivat|encourage|challenge|push me)\b/.test(normalized)) {
    detected.push({ key: "preferred_coaching_style", value: "motivational", label: "Motivational coaching", confidence: 0.82 });
    detected.push({ key: "motivation_style", value: "challenge-based", label: "Challenge-based motivation", confidence: 0.78 });
  }
  if (/\b(remind me|reminder|nudges?|notification)\b/.test(normalized)) {
    detected.push({ key: "motivation_style", value: "reminder-based", label: "Reminder-based motivation", confidence: 0.76 });
  }

  const workoutTime = normalized.match(/\b(morning|afternoon|evening|night)\b.{0,24}\b(workout|exercise|gym|walk|run|yoga|training)\b/) ??
    normalized.match(/\b(workout|exercise|gym|walk|run|yoga|training)\b.{0,24}\b(morning|afternoon|evening|night)\b/);
  if (workoutTime) {
    const time = ["morning", "afternoon", "evening", "night"].find((item) => workoutTime[0].includes(item));
    if (time) detected.push({ key: "preferred_workout_time", value: time, label: `${titleCase(time)} workout`, confidence: 0.86 });
  }

  const activity = normalized.match(/\bi (?:like|prefer|enjoy|love)\s+(walking|running|yoga|strength training|cardio|cycling|swimming|gym workouts|pilates)\b/);
  if (activity) {
    detected.push({ key: "favorite_activity", value: activity[1], label: titleCase(activity[1]), confidence: 0.88 });
  }

  const sleepSchedule = normalized.match(/\b(?:sleep|bed|bedtime)\s+(?:at|around|by)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/) ??
    normalized.match(/\bwake\s+(?:up\s+)?(?:at|around)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/);
  if (sleepSchedule) {
    detected.push({ key: "preferred_sleep_schedule", value: sleepSchedule[0].trim(), label: "Preferred sleep schedule", confidence: 0.78 });
  }

  if (/\b(forget|miss|struggle).{0,20}\b(water|hydrate|hydration)\b/.test(normalized)) {
    detected.push({ key: "hydration_habit", value: "often forgets hydration", label: "Hydration forgetfulness", confidence: 0.8 });
  }
  if (/\b(water|hydrate|hydration).{0,24}\b(meal|meals|workout|exercise)\b/.test(normalized)) {
    detected.push({ key: "hydration_habit", value: "pairs hydration with meals or workouts", label: "Contextual hydration", confidence: 0.74 });
  }

  return detected;
};

export async function learnPreferencesFromInteraction(input: LearningInput): Promise<LearnedPreference[]> {
  const detected = detectPreferences(input.message);
  if (detected.length === 0) return [];

  const existingMemories = await longTermMemory.getMemories();
  const saved: MemoryRecord[] = [];

  for (const preference of detected) {
    const existing = existingMemories.find((memory) =>
      memory.metadata?.personalizationPreference === true &&
      memory.metadata.preferenceKey === preference.key &&
      memory.metadata.preferenceValue === preference.value,
    );
    const memory = createPreferenceMemory(
      preference.key,
      preference.value,
      preference.label,
      input.message,
      existing,
      preference.confidence,
    );

    saved.push(await longTermMemory.saveMemory(memory));
  }

  return getLearnedPreferences(saved);
}

export function explainRecommendation(
  recommendation: Pick<PersonalizedRecommendation, "message" | "reason" | "intent">,
  context: AIContext,
  intelligence: UserIntelligenceProfile = context.intelligenceProfile,
): string {
  const reasons = [recommendation.reason];
  const matchingPreference = intelligence.learnedPreferences.find((preference) =>
    recommendation.message.toLowerCase().includes(preference.value.toLowerCase()) ||
    recommendation.reason.toLowerCase().includes(preference.value.toLowerCase()),
  );
  const hydrationBelowAverage = recommendation.intent === "hydration" && context.hydrationGoal > 0 &&
    context.hydrationGlasses / context.hydrationGoal < 0.75;
  const sleepNeedsAttention = recommendation.intent === "sleep" && context.sleepScore > 0 && context.sleepScore < 75;
  const trendSignal = context.trendIntelligence?.topTrends.find((trend) => {
    if (recommendation.intent === "hydration") return trend.metric === "hydration_ml";
    if (recommendation.intent === "sleep") return trend.metric === "sleep_minutes";
    if (recommendation.intent === "fitness") return trend.metric === "steps" || trend.metric === "activity_minutes" || trend.metric === "heart_rate_avg";

    return false;
  });
  const coachingSignal = context.goalHabitCoaching?.recommendations.find((item) => {
    if (recommendation.intent === "hydration") return item.domain === "hydration";
    if (recommendation.intent === "sleep") return item.domain === "sleep";
    if (recommendation.intent === "fitness") return item.domain === "activity" || item.domain === "recovery";
    if (recommendation.intent === "medication") return item.domain === "medication_adherence";
    if (recommendation.intent === "nutrition") return item.domain === "nutrition";

    return false;
  }) ?? context.goalHabitCoaching?.recommendations[0];
  const insightSignal = context.aiInsights?.topInsights.find((item) => {
    if (recommendation.intent === "hydration") return item.category === "hydration";
    if (recommendation.intent === "sleep") return item.category === "sleep";
    if (recommendation.intent === "fitness") return item.category === "activity" || item.category === "recovery";
    if (recommendation.intent === "medication") return item.category === "medication";
    if (recommendation.intent === "nutrition") return item.category === "nutrition";
    if (recommendation.intent === "device_sync_query") return item.category === "device_data";

    return false;
  }) ?? context.aiInsights?.topInsights[0];
  const briefing = context.dailyBriefing;

  if (hydrationBelowAverage) {
    reasons.push(`your hydration is ${context.hydrationGlasses}/${context.hydrationGoal} glasses today`);
  }
  if (sleepNeedsAttention) {
    reasons.push(`your sleep score is ${context.sleepScore}, which is below your stronger recovery range`);
  }
  if (matchingPreference) {
    reasons.push(`you have a learned preference for ${matchingPreference.label.toLowerCase()} (${Math.round(matchingPreference.confidence * 100)}% confidence)`);
  }
  if (trendSignal && trendSignal.direction !== "insufficient_data") {
    reasons.push(`${trendSignal.label.toLowerCase()} is ${trendSignal.direction} with ${trendSignal.confidence} confidence`);
  }
  if (coachingSignal) {
    reasons.push(`${coachingSignal.reason} Coaching confidence is ${coachingSignal.confidence}`);
  }
  if (insightSignal) {
    reasons.push(`${insightSignal.title} is a ranked insight with ${insightSignal.confidence} confidence`);
  }
  if (briefing?.focusArea) {
    reasons.push(`today's briefing focus is ${briefing.focusArea} with ${briefing.confidence} confidence`);
  }
  if (intelligence.preferredCoachingStyle !== "friendly") {
    reasons.push(`Medibot is using a ${intelligence.preferredCoachingStyle} coaching style for this interaction`);
  }

  return `I recommended this because ${Array.from(new Set(reasons)).join(", ")}.`;
}
