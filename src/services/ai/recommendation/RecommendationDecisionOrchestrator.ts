import type {
  AIContext,
  AIHealthInsightCategory,
  AIIntent,
  CoachingGoal,
  CoachingHabit,
  CoachingRecommendation,
  MemoryRecord,
  PersonalizedRecommendation,
  RecommendationCandidate,
  RecommendationCategory,
  RecommendationDecision,
  RecommendationSource,
} from "../../../types";

type DecisionInput = {
  context: AIContext;
  intent?: AIIntent;
  extraCandidates?: RecommendationCandidate[];
  recentActions?: string[];
  now?: Date;
};

const priorityRank: Record<RecommendationCandidate["priority"], number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const confidenceRank: Record<RecommendationCandidate["confidence"], number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const safetyRank: Record<RecommendationCandidate["safetyLevel"], number> = {
  normal: 1,
  caution: 2,
  urgent: 4,
};

const sourceRank: Record<RecommendationSource, number> = {
  briefing: 9,
  insight: 8,
  prevention: 8,
  goal: 7,
  habit: 7,
  trend: 6,
  prediction: 6,
  agent: 5,
  memory: 4,
  device: 3,
  fallback: 1,
};

const categoryByIntent: Partial<Record<AIIntent, RecommendationCategory>> = {
  nutrition: "nutrition",
  hydration: "hydration",
  fitness: "activity",
  sleep: "sleep",
  medication: "medication",
  steps_query: "activity",
  heart_rate_query: "recovery",
  calories_query: "activity",
  activity_query: "activity",
  sleep_query: "sleep",
  hydration_query: "hydration",
  device_sync_query: "device_data",
  health_score_query: "general_wellness",
  daily_briefing: "general_wellness",
  general_wellness: "general_wellness",
};

const categoryByFocus: Array<[RegExp, RecommendationCategory]> = [
  [/hydration|water/i, "hydration"],
  [/sleep/i, "sleep"],
  [/recovery|heart rate|fatigue/i, "recovery"],
  [/activity|fitness|movement|steps|walk/i, "activity"],
  [/nutrition|meal|food|calorie|protein/i, "nutrition"],
  [/medication|adherence|dose|pill/i, "medication"],
  [/device|sync|health connect/i, "device_data"],
];

const categoryFromPreventive = (value: string): RecommendationCategory => {
  if (value === "sleep") return "sleep";
  if (value === "activity") return "activity";
  if (value === "hydration") return "hydration";
  if (value === "recovery") return "recovery";
  if (value === "device_quality") return "device_data";

  return "general_wellness";
};

const categoryByInsight: Record<AIHealthInsightCategory, RecommendationCategory> = {
  activity: "activity",
  sleep: "sleep",
  hydration: "hydration",
  nutrition: "nutrition",
  recovery: "recovery",
  medication: "medication",
  device_data: "device_data",
  general_wellness: "general_wellness",
};

const goalCategory = (domain: string): RecommendationCategory => {
  if (domain === "activity") return "activity";
  if (domain === "sleep") return "sleep";
  if (domain === "hydration") return "hydration";
  if (domain === "nutrition") return "nutrition";
  if (domain === "recovery") return "recovery";
  if (domain === "medication_adherence") return "medication";

  return "general_wellness";
};

export const normalizeRecommendationText = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/\b(if appropriate for you|if suitable for you|when available|if you feel well)\b/g, " ")
    .replace(/\b(before|after)\s+(?:your\s+)?next\s+meal\b/g, "$1 meal")
    .replace(/\b(have|drink|take|add|get|do|try|use|make|prioritize|choose)\b/g, " ")
    .replace(/\b(one|a|an|normal|simple|quick|short|small|two|today|now|next|your|the|my)\b/g, " ")
    .replace(/\b(of|to|with|for)\b/g, " ")
    .replace(/\b(lunch|breakfast|dinner|meal|meals)\b/g, "meal")
    .replace(/\b(glass|glasses|water|hydrate|hydration)\b/g, "hydration")
    .replace(/\b(walk|steps|movement|move|activity)\b/g, "activity")
    .replace(/\b(wind down|bedtime|sleep|rest)\b/g, "sleep")
    .replace(/\b(recovery|recover|light|gentle)\b/g, "recovery")
    .replace(/\b(hydration|activity|sleep|recovery)(?:\s+\1)+\b/g, "$1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return normalized.split(/\s+/).filter(Boolean).slice(0, 8).join(" ");
};

const categoryFromText = (value: string, fallback: RecommendationCategory = "general_wellness"): RecommendationCategory =>
  categoryByFocus.find(([pattern]) => pattern.test(value))?.[1] ?? fallback;

const titleFromAction = (action: string, category: RecommendationCategory): string => {
  const clean = action.replace(/\.$/, "");
  if (clean.length <= 54) return clean;

  return `${category.replace(/_/g, " ")} recommendation`;
};

const candidate = (
  input: Omit<RecommendationCandidate, "dedupeKey" | "createdAt" | "supportingSources"> & {
    dedupeKey?: string;
    createdAt?: string;
    supportingSources?: RecommendationSource[];
  },
  now: Date,
): RecommendationCandidate => {
  const dedupeKey = input.dedupeKey ?? `${input.category}:${normalizeRecommendationText(input.action)}`;

  return {
    ...input,
    supportingSources: Array.from(new Set([input.source, ...(input.supportingSources ?? [])])),
    dedupeKey,
    createdAt: input.createdAt ?? now.toISOString(),
  };
};

const isUnsafeAction = (candidate: RecommendationCandidate): boolean => {
  const text = `${candidate.title} ${candidate.summary} ${candidate.action} ${candidate.reason}`;

  return /\b(diagnos(?:e|is|tic)|disease prediction|guarantee|prevent disease|medical certainty)\b/i.test(text) ||
    /\b(change|adjust|stop|double|increase|reduce)\s+(?:your\s+)?(?:medication|medicine|dose|dosage)\b/i.test(text) ||
    /\b(extreme calorie|crash diet|hard workout|push through pain|train through pain)\b/i.test(text);
};

const hasRecoveryStrain = (context: AIContext): boolean =>
  Boolean(context.goalHabitCoaching?.recommendations.some((item) => item.domain === "recovery" && item.priority === "high")) ||
  Boolean(context.trendIntelligence?.habitDrifts.some((drift) => drift.type === "recovery_strain" || drift.metric === "sleep_minutes")) ||
  Boolean(context.aiInsights?.topInsights.some((insight) => insight.category === "recovery" && insight.priority === "high")) ||
  Boolean(context.predictions?.topPredictions.some((prediction) => prediction.category === "recovery" && ["elevated", "high"].includes(prediction.riskLevel))) ||
  (context.sleepScore > 0 && context.sleepScore < 70);

const isIntenseActivity = (candidate: RecommendationCandidate): boolean =>
  candidate.category === "activity" && /\b(intense|hard|hiit|sprint|push|challenge|high intensity)\b/i.test(candidate.action);

const shouldSuppress = (
  item: RecommendationCandidate,
  context: AIContext,
  recentKeys: Set<string>,
): string | undefined => {
  if (isUnsafeAction(item)) return "Unsafe or medical-treatment wording was blocked.";
  if (item.source === "device" && context.deviceDataSource === "live") return "Live Health Connect data is already available.";
  if (item.source === "trend" && item.confidence === "low" && item.safetyLevel !== "urgent") return "Trend confidence is low, so it should not drive the decision.";
  if (item.category === "device_data" && item.confidence === "low" && context.deviceDataSource !== "no_data") return "Device data issue is not blocking useful guidance.";
  if (item.category === "hydration" && recentKeys.has(item.dedupeKey)) return "Similar hydration recommendation was already shown in this session.";
  if (isIntenseActivity(item) && hasRecoveryStrain(context)) return "Recovery strain is high, so intense activity is postponed.";

  return undefined;
};

const confidenceFor = (values: Array<RecommendationCandidate["confidence"]>): RecommendationDecision["confidence"] => {
  const average = values.reduce((sum, value) => sum + confidenceRank[value], 0) / Math.max(values.length, 1);
  if (average >= 2.6) return "high";
  if (average >= 1.7) return "medium";

  return "low";
};

const riskRank = (value: string): number => {
  if (value === "high") return 4;
  if (value === "elevated") return 3;
  if (value === "moderate") return 2;

  return 1;
};

const actionabilityScore = (item: RecommendationCandidate): number =>
  /\b(today|now|next|before|after|set|log|sync|reminder|check|walk|drink|protect|keep|choose)\b/i.test(item.action) ? 2 : 0;

const personalizationScore = (item: RecommendationCandidate, context: AIContext): number => {
  const text = `${item.action} ${item.reason}`.toLowerCase();
  const preferenceMatch = (context.intelligenceProfile?.learnedPreferences ?? []).some((preference) =>
    preference.confidence >= 0.65 && text.includes(preference.value.toLowerCase()),
  );
  const goalMatch = (context.profile?.goals ?? []).some((goal) => text.includes(goal.toLowerCase()));

  return (preferenceMatch ? 2 : 0) + (goalMatch ? 1 : 0);
};

const scoreCandidate = (item: RecommendationCandidate, context: AIContext): number => {
  const briefingMatch = item.category !== "general_wellness" &&
    context.dailyBriefing?.focusArea &&
    categoryFromText(context.dailyBriefing.focusArea) === item.category;
  const trendSeverity = context.trendIntelligence?.habitDrifts.some((drift) =>
    goalCategory(drift.type.includes("hydration") ? "hydration" : drift.type.includes("sleep") ? "sleep" : drift.type.includes("recovery") ? "recovery" : "activity") === item.category &&
    drift.severity === "high",
  );
  const prediction = context.predictions?.topPredictions.find((candidatePrediction) =>
    categoryByInsight[candidatePrediction.category as AIHealthInsightCategory] === item.category,
  );
  const preventivePrimary = context.preventiveSummary?.primaryRisk;
  const preventiveMatch = preventivePrimary &&
    categoryFromPreventive(preventivePrimary.category) === item.category;

  return (
    safetyRank[item.safetyLevel] * 100 +
    priorityRank[item.priority] * 18 +
    confidenceRank[item.confidence] * 6 +
    sourceRank[item.source] * 4 +
    actionabilityScore(item) +
    personalizationScore(item, context) +
    (briefingMatch ? 12 : 0) +
    (preventivePrimary && preventiveMatch ? severityRankFromPreventive(preventivePrimary.severity) * 5 : 0) +
    (trendSeverity ? 8 : 0) +
    (prediction ? riskRank(prediction.riskLevel) * 3 : 0) -
    (item.source === "device" && context.deviceDataSource !== "no_data" ? 12 : 0) -
    (item.confidence === "low" && item.safetyLevel !== "urgent" ? 10 : 0)
  );
};

const severityRankFromPreventive = (value: string): number => {
  if (value === "high") return 3;
  if (value === "medium") return 2;

  return 1;
};

const mergeDuplicate = (
  current: RecommendationCandidate,
  incoming: RecommendationCandidate,
  context: AIContext,
): RecommendationCandidate => {
  const currentScore = scoreCandidate(current, context);
  const incomingScore = scoreCandidate(incoming, context);
  const winner = incomingScore > currentScore ? incoming : current;
  const loser = winner === incoming ? current : incoming;
  const supportingSources = Array.from(new Set([
    ...(winner.supportingSources ?? [winner.source]),
    loser.source,
    ...(loser.supportingSources ?? []),
  ]));

  return {
    ...winner,
    supportingSources,
    reason: Array.from(new Set([winner.reason, loser.reason].filter(Boolean))).join(" Also supported by: "),
    confidence: confidenceFor([winner.confidence, loser.confidence]),
  };
};

const categoryForPersonalized = (recommendation: PersonalizedRecommendation): RecommendationCategory =>
  categoryByIntent[recommendation.intent] ?? categoryFromText(`${recommendation.message} ${recommendation.reason}`);

const fromPersonalizedRecommendations = (context: AIContext, now: Date): RecommendationCandidate[] =>
  (context.personalizedRecommendations ?? []).map((recommendation) => {
    const category = categoryForPersonalized(recommendation);

    return candidate({
      id: `decision-v2-${recommendation.id}`,
      title: titleFromAction(recommendation.message, category),
      summary: recommendation.reason,
      category,
      source: recommendation.id.includes("memory") ? "memory" : "fallback",
      priority: recommendation.priority,
      confidence: (context.intelligenceProfile?.personalizationScore ?? 0) >= 70 ? "high" : "medium",
      action: recommendation.message,
      reason: recommendation.reason,
      safetyLevel: recommendation.intent === "medication" ? "caution" : "normal",
    }, now);
  });

const fromBriefing = (context: AIContext, now: Date): RecommendationCandidate[] => {
  const briefing = context.dailyBriefing;
  if (!briefing) return [];

  const category = categoryFromText(`${briefing.focusArea ?? ""} ${briefing.summary}`);
  const focusedBriefing = category !== "general_wellness" || briefing.safetyLevel === "caution";

  return briefing.recommendedActions.slice(0, 3).map((action, index) =>
    candidate({
      id: `decision-briefing-${index}`,
      title: titleFromAction(action, category),
      summary: briefing.summary,
      category,
      source: "briefing",
      priority: briefing.safetyLevel === "caution" ? "high" : focusedBriefing && index === 0 ? "high" : "medium",
      confidence: briefing.confidence,
      action,
      reason: `Daily briefing focus is ${briefing.focusArea ?? "general wellness"}. ${briefing.dataSourceNote}`,
      safetyLevel: briefing.safetyLevel,
      createdAt: briefing.generatedAt,
    }, now),
  );
};

const fromInsights = (context: AIContext, now: Date): RecommendationCandidate[] =>
  (context.aiInsights?.topInsights ?? []).slice(0, 5).map((insight) =>
    candidate({
      id: `decision-insight-${insight.id}`,
      title: insight.title,
      summary: insight.summary,
      category: categoryByInsight[insight.category],
      source: "insight",
      priority: insight.priority,
      confidence: insight.confidence,
      action: insight.suggestedAction,
      reason: `${insight.explanation} Signals: ${insight.supportingSignals.slice(0, 3).join("; ")}`,
      safetyLevel: insight.safetyLevel,
      createdAt: insight.createdAt,
    }, now),
  );

const fromCoachingRecommendations = (context: AIContext, now: Date): RecommendationCandidate[] =>
  (context.goalHabitCoaching?.recommendations ?? []).slice(0, 5).map((recommendation: CoachingRecommendation) =>
    candidate({
      id: `decision-coaching-${recommendation.id}`,
      title: titleFromAction(recommendation.message, goalCategory(recommendation.domain)),
      summary: recommendation.reason,
      category: goalCategory(recommendation.domain),
      source: recommendation.source === "habit"
        ? "habit"
        : recommendation.source === "goal"
          ? "goal"
          : recommendation.source === "profile"
            ? "memory"
            : recommendation.source,
      priority: recommendation.priority,
      confidence: recommendation.confidence,
      action: recommendation.message,
      reason: `${recommendation.reason} Coaching progress is ${context.goalHabitCoaching?.progressScore ?? 0}%.`,
      safetyLevel: recommendation.domain === "medication_adherence" ? "caution" : "normal",
      createdAt: context.goalHabitCoaching?.generatedAt,
    }, now),
  );

const fromGoalsAndHabits = (context: AIContext, now: Date): RecommendationCandidate[] => {
  const goalCandidates = context.goalHabitCoaching?.goals
    ? context.goalHabitCoaching.goals
    .filter((goal: CoachingGoal) => goal.status === "at_risk")
    .slice(0, 3)
    .map((goal) =>
      candidate({
        id: `decision-goal-${goal.id}`,
        title: goal.title,
        summary: goal.reason,
        category: goalCategory(goal.domain),
        source: "goal",
        priority: "high",
        confidence: goal.confidence,
        action: `Choose one small action toward ${goal.title.toLowerCase()} today.`,
        reason: `${goal.title} is at risk at ${goal.progressPercent}% progress.`,
        safetyLevel: goal.domain === "medication_adherence" ? "caution" : "normal",
        createdAt: goal.updatedAt,
      }, now),
    )
    : [];
  const habitCandidates = context.goalHabitCoaching?.habits
    ? context.goalHabitCoaching.habits
    .filter((habit: CoachingHabit) => habit.status === "slipping")
    .slice(0, 3)
    .map((habit) =>
      candidate({
        id: `decision-habit-${habit.id}`,
        title: habit.title,
        summary: `${habit.title} is slipping.`,
        category: goalCategory(habit.domain),
        source: "habit",
        priority: "high",
        confidence: habit.confidence,
        action: habit.suggestedNextAction ?? `Restart ${habit.title.toLowerCase()} with one easy step today.`,
        reason: `${habit.title} has ${habit.completionRate}% weekly completion.`,
        safetyLevel: habit.domain === "medication_adherence" ? "caution" : "normal",
        createdAt: habit.updatedAt,
      }, now),
    )
    : [];

  return [...goalCandidates, ...habitCandidates];
};

const fromTrends = (context: AIContext, now: Date): RecommendationCandidate[] =>
  (context.trendIntelligence?.topTrends ?? []).slice(0, 5).flatMap((trend) => {
    if (trend.direction === "insufficient_data") return [];
    const category = trend.metric === "hydration_ml"
      ? "hydration"
      : trend.metric === "sleep_minutes"
        ? "sleep"
        : trend.metric === "heart_rate_avg"
          ? "recovery"
          : trend.metric === "steps" || trend.metric === "activity_minutes"
            ? "activity"
            : "general_wellness";
    const action = category === "hydration"
      ? "Add two hydration check-ins today."
      : category === "sleep"
        ? "Protect sleep recovery before adding extra intensity."
        : category === "activity"
          ? "Use a short gentle movement block today."
          : category === "recovery"
            ? "Keep today's activity recovery-focused."
            : "Use the top trend as today's wellness focus.";

    return [candidate({
      id: `decision-trend-${trend.id}`,
      title: trend.label,
      summary: trend.interpretation,
      category,
      source: "trend",
      priority: trend.habitDrift || trend.abnormalChange ? "high" : "medium",
      confidence: trend.confidence,
      action,
      reason: `${trend.label} is ${trend.direction.replace(/_/g, " ")}. ${trend.reason}`,
      safetyLevel: trend.abnormalChange ? "caution" : "normal",
      createdAt: context.trendIntelligence?.generatedAt,
    }, now)];
  });

const fromPredictions = (context: AIContext, now: Date): RecommendationCandidate[] =>
  (context.predictions?.topPredictions ?? []).slice(0, 5).flatMap((prediction) =>
    prediction.preventiveActions.slice(0, 2).map((action) =>
      candidate({
        id: `decision-prediction-${prediction.category}-${action.id}`,
        title: titleFromAction(action.message, categoryByInsight[prediction.category as AIHealthInsightCategory]),
        summary: prediction.explanation.summary,
        category: categoryByInsight[prediction.category as AIHealthInsightCategory],
        source: "prediction",
        priority: action.priority,
        confidence: prediction.confidence,
        action: action.message,
        reason: `${prediction.category.replace(/_/g, " ")} has ${prediction.riskLevel} wellness risk over ${prediction.horizon}. ${prediction.explanation.factors.slice(0, 2).join(" ")}`,
        safetyLevel: prediction.riskLevel === "high" ? "caution" : "normal",
        createdAt: prediction.generatedAt,
      }, now),
    ),
  );

const fromPreventiveSummary = (context: AIContext, now: Date): RecommendationCandidate[] =>
  (context.preventiveSummary?.risks ?? [])
    .filter((risk) => risk.confidence !== "low")
    .slice(0, 3)
    .map((risk) =>
      candidate({
        id: `decision-prevention-${risk.id}`,
        title: risk.title,
        summary: risk.summary,
        category: categoryFromPreventive(risk.category),
        source: "prevention",
        supportingSources: ["prevention", risk.source === "recommendation" ? "fallback" : risk.source],
        priority: risk.severity === "high" ? "high" : risk.severity === "medium" ? "medium" : "low",
        confidence: risk.confidence,
        action: risk.suggestedAction,
        reason: `${risk.explanation} Signals: ${risk.supportingSignals.slice(0, 3).join("; ")}`,
        safetyLevel: risk.safetyLevel,
        createdAt: risk.generatedAt,
      }, now),
    );

const fromDevice = (context: AIContext, now: Date): RecommendationCandidate[] => {
  if (context.deviceDataSource === "live") return [];
  if (context.deviceDataSource === "no_data") {
    return [candidate({
      id: "decision-device-no-data",
      title: "Refresh Health Connect data",
      summary: "Health Connect is connected, but recent records are not available yet.",
      category: "device_data",
      source: "device",
      priority: "medium",
      confidence: "medium",
      action: "Refresh Health Connect after your fitness app writes today's data.",
      reason: "Recent device records are missing, so recommendations may be limited.",
      safetyLevel: "normal",
    }, now)];
  }

  return [candidate({
    id: `decision-device-${context.deviceDataSource}`,
    title: "Reconnect device data",
    summary: `Device source is ${context.deviceDataSource}.`,
    category: "device_data",
    source: "device",
    priority: "low",
    confidence: "low",
    action: "Reconnect or refresh device permissions when available.",
    reason: `Current device data source is ${context.deviceDataSource}.`,
    safetyLevel: "normal",
  }, now)];
};

const fromMemory = (context: AIContext, now: Date): RecommendationCandidate[] =>
  (context.memory ?? [])
    .filter((memory: MemoryRecord) => ["goal", "exercise_preference", "dietary_preference", "medication_habit"].includes(memory.category))
    .slice(0, 3)
    .map((memory) => {
      const category = categoryFromText(memory.value, memory.category === "dietary_preference" ? "nutrition" : "general_wellness");

      return candidate({
        id: `decision-memory-${memory.id}`,
        title: "Use remembered preference",
        summary: memory.value,
        category,
        source: "memory",
        priority: "low",
        confidence: memory.confidence >= 0.75 ? "high" : "medium",
        action: `Keep today's plan aligned with ${memory.value}.`,
        reason: `Remembered ${memory.category.replace(/_/g, " ")} from prior conversations.`,
        safetyLevel: "normal",
        createdAt: memory.updatedAt,
      }, now);
    });

const fallbackCandidate = (context: AIContext, now: Date): RecommendationCandidate =>
  candidate({
    id: "decision-fallback-small-step",
    title: "Pick one small wellness action",
    summary: "No stronger signal dominated the decision.",
    category: "general_wellness",
    source: "fallback",
    priority: "low",
    confidence: context.deviceDataSource === "no_data" ? "low" : "medium",
    action: "Choose one low-risk action today: hydrate, walk lightly, prepare a balanced meal, or protect bedtime.",
    reason: "Available signals are limited or steady, so a simple wellness step is appropriate.",
    safetyLevel: "normal",
  }, now);

const collectCandidates = (input: DecisionInput, now: Date): RecommendationCandidate[] => [
  ...fromBriefing(input.context, now),
  ...fromInsights(input.context, now),
  ...fromCoachingRecommendations(input.context, now),
  ...fromGoalsAndHabits(input.context, now),
  ...fromTrends(input.context, now),
  ...fromPredictions(input.context, now),
  ...fromPreventiveSummary(input.context, now),
  ...fromDevice(input.context, now),
  ...fromMemory(input.context, now),
  ...fromPersonalizedRecommendations(input.context, now),
  ...(input.extraCandidates ?? []),
];

const personalizePrimary = (
  primary: RecommendationCandidate,
  context: AIContext,
): RecommendationCandidate => {
  const style = context.intelligenceProfile?.preferredCoachingStyle ?? "friendly";
  const action = primary.action.replace(/\.$/, "");

  if (style === "minimal") {
    return {
      ...primary,
      action: `${action}.`,
      summary: primary.summary.split(".")[0] ?? primary.summary,
    };
  }

  if (style === "motivational") {
    return {
      ...primary,
      action: `Small win: ${action}.`,
      summary: `This is a realistic next step you can complete today. ${primary.summary}`,
    };
  }

  if (style === "scientific") {
    return {
      ...primary,
      action: `${action}.`,
      summary: `Signal-based rationale: ${primary.reason}`,
    };
  }

  if (style === "professional") {
    return {
      ...primary,
      action: `Priority action: ${action}.`,
      summary: `Rationale: ${primary.reason}`,
    };
  }

  return {
    ...primary,
    action: `${action}.`,
    summary: `This looks like the most useful next step today. ${primary.summary}`,
  };
};

const rankingReasonFor = (
  primary: RecommendationCandidate,
  alternatives: RecommendationCandidate[],
  suppressed: RecommendationCandidate[],
  context: AIContext,
): string => {
  const sources = primary.supportingSources?.join(", ") ?? primary.source;
  const alternativeReason = alternatives.length > 0
    ? `Alternatives were lower because ${alternatives.slice(0, 2).map((item) => `${item.title} had ${item.priority} priority/${item.confidence} confidence`).join("; ")}.`
    : "No stronger alternative was available.";
  const suppressedReason = suppressed.length > 0
    ? ` Suppressed ${suppressed.length} candidate(s) for duplication, low confidence, timing, device status, or safety wording.`
    : "";
  const dataFreshness = context.deviceDataSource === "live"
    ? "Live device data is available."
    : `Device data source is ${context.deviceDataSource}.`;
  const preventiveReason = context.preventiveSummary?.primaryRisk &&
    categoryFromPreventive(context.preventiveSummary.primaryRisk.category) === primary.category
    ? ` Preventive wellness also points to ${context.preventiveSummary.primaryRisk.title} with ${context.preventiveSummary.confidence} confidence.`
    : "";

  return `Primary recommendation selected because ${primary.reason} Supporting sources: ${sources}. Confidence is ${primary.confidence} from priority ${primary.priority}, source strength, data freshness, and personalization match.${preventiveReason} ${alternativeReason} ${dataFreshness}${suppressedReason}`;
};

export class RecommendationDecisionOrchestrator {
  generate(input: DecisionInput): RecommendationDecision {
    const now = input.now ?? new Date();
    const recentKeys = new Set((input.recentActions ?? []).map((action) =>
      action.includes(":") ? action : `${categoryFromText(action)}:${normalizeRecommendationText(action)}`,
    ));
    const raw = collectCandidates(input, now);
    const suppressed: RecommendationCandidate[] = [];
    const merged = new Map<string, RecommendationCandidate>();

    for (const item of raw) {
      const suppressReason = shouldSuppress(item, input.context, recentKeys);
      if (suppressReason) {
        suppressed.push({ ...item, reason: `${item.reason} Suppressed: ${suppressReason}` });
        continue;
      }

      const existing = merged.get(item.dedupeKey);
      merged.set(item.dedupeKey, existing ? mergeDuplicate(existing, item, input.context) : item);
    }

    const ranked = [...merged.values()].sort((left, right) =>
      scoreCandidate(right, input.context) - scoreCandidate(left, input.context) ||
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
    const rawPrimary = ranked[0] ?? fallbackCandidate(input.context, now);
    const primary = personalizePrimary(rawPrimary, input.context);
    const alternatives = ranked
      .filter((item) => item.dedupeKey !== rawPrimary.dedupeKey)
      .slice(0, 3);
    const confidence = confidenceFor([
      primary.confidence,
      ...alternatives.slice(0, 2).map((item) => item.confidence),
    ]);

    return {
      id: `recommendation-decision-${now.toISOString().slice(0, 10)}-${primary.dedupeKey.replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`,
      primary,
      alternatives,
      suppressed: suppressed.slice(0, 8),
      rankingReason: rankingReasonFor(primary, alternatives, suppressed, input.context),
      confidence: primary.safetyLevel === "urgent" ? "high" : confidence,
      generatedAt: now.toISOString(),
    };
  }
}

export const recommendationDecisionOrchestrator = new RecommendationDecisionOrchestrator();
