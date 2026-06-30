const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

process.env.NODE_ENV = "test";

const storage = new Map();
const originalLoad = Module._load;
let netInfoConnected = false;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "@react-native-async-storage/async-storage") {
    return {
      __esModule: true,
      default: {
        getItem: async (key) => storage.get(key) ?? null,
        setItem: async (key, value) => storage.set(key, value),
        removeItem: async (key) => storage.delete(key),
      },
    };
  }

  if (request === "@react-native-community/netinfo") {
    return {
      __esModule: true,
      default: {
        addEventListener: (listener) => {
          listener({ isConnected: netInfoConnected, isInternetReachable: netInfoConnected });

          return () => undefined;
        },
        fetch: async () => ({ isConnected: netInfoConnected, isInternetReachable: netInfoConnected }),
      },
    };
  }

  if (request.includes("store/authStore")) {
    return {
      useAuthStore: {
        getState: () => ({ user: { id: "coaching-user", email: "coaching@example.com" } }),
      },
    };
  }

  if (request.includes("api/MemoryApi")) {
    return {
      saveMemory: async (memory) => memory,
      fetchMemories: async () => [],
      deleteMemory: async () => undefined,
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

require.extensions[".ts"] = function registerTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: filename,
  });

  module._compile(output.outputText, filename);
};

const root = path.resolve(__dirname, "..");
const { goalHabitCoachingEngine } = require(path.join(root, "src/services/coaching/GoalHabitCoachingEngine"));
const { trendIntelligenceEngine } = require(path.join(root, "src/services/prediction/TrendIntelligenceEngine"));
const { predictionOrchestrator } = require(path.join(root, "src/services/prediction/PredictionOrchestrator"));
const { buildUserIntelligenceProfile } = require(path.join(root, "src/services/ai/personalization/PersonalizationEngine"));
const { generatePersonalizedRecommendations } = require(path.join(root, "src/services/ai/recommendation/RecommendationEngineV2"));
const { buildPrompt } = require(path.join(root, "src/services/ai/promptBuilder"));
const { OfflineAIProvider } = require(path.join(root, "src/services/ai/providers/OfflineAIProvider"));
const { connectivityService } = require(path.join(root, "src/services/connectivity/ConnectivityService"));

const now = new Date("2026-06-29T08:00:00.000Z");

function dateAt(daysAgo) {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);

  return date.toISOString().slice(0, 10);
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Validation failed: ${label}`);
  }

  console.log(`PASS ${label}`);
}

function summary(daysAgo, values) {
  const date = dateAt(daysAgo);

  return {
    id: `summary_${date}_daily`,
    date,
    source: "health_connect",
    deviceSource: values.deviceSource ?? "live",
    displaySource: values.deviceSource === "cache" ? "Last synced summary" : "Live Device Summary",
    summaryType: "daily",
    metrics: {
      steps: values.steps,
      caloriesBurned: values.caloriesBurned ?? 420,
      activeMinutes: values.activeMinutes,
      sleepMinutes: values.sleepMinutes,
      hydrationMl: values.hydrationMl,
      heartRateAvg: values.heartRateAvg ?? 72,
    },
    scores: {
      healthScore: values.healthScore ?? 78,
      sleepScore: values.sleepScore ?? Math.round(((values.sleepMinutes ?? 420) / 480) * 100),
      fitnessScore: values.fitnessScore ?? 76,
    },
    syncMetadata: {
      lastDeviceSyncAt: `${date}T08:00:00.000Z`,
      provider: "Health Connect",
      status: values.deviceSource === "cache" ? "cache" : "live",
    },
    updatedAt: `${date}T08:30:00.000Z`,
  };
}

function summariesFrom(series) {
  return series.map((values, index) => summary(series.length - index, values));
}

const baseProfile = {
  demographics: { age: 34 },
  bodyMetrics: {},
  goals: ["Improve energy"],
  dietaryPreferences: [],
  allergies: [],
  chronicConditions: [],
  activityLevel: "moderate",
  averageSleepHours: 7,
  medicationAdherence: 94,
  profileCompletenessScore: 84,
  updatedAt: now.toISOString(),
  source: "store",
};

function memoryForStyle(style) {
  return {
    id: `style-${style}`,
    category: "recurring_topic",
    value: style,
    sourceMessage: `Use a ${style} coaching style`,
    confidence: 0.9,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    metadata: {
      personalizationPreference: true,
      preferenceKey: "preferred_coaching_style",
      preferenceValue: style,
      preferenceLabel: `${style} coaching`,
      evidenceCount: 3,
    },
  };
}

function baseContext(overrides = {}) {
  const profile = overrides.profile ?? baseProfile;

  return {
    healthScore: 78,
    nutritionScore: 74,
    fitnessScore: 76,
    sleepScore: 76,
    adherenceScore: 94,
    nutritionStatus: "Good",
    fitnessStatus: "Good",
    sleepStatus: "Good",
    medicationAdherenceStatus: "Excellent",
    hydrationStatus: "Near target",
    hydrationGlasses: 6,
    hydrationGoal: 8,
    steps: 7600,
    stepGoal: 9000,
    weeklyActivityMinutes: 170,
    heartRateBpm: 72,
    sleepMinutes: 430,
    caloriesBurned: 420,
    activeMinutes: 28,
    sleepQuality: "Good",
    stepPercent: 84,
    deviceDataSource: "live",
    deviceDataStatus: "connected_live",
    devicePermissionStatus: "granted",
    lastDeviceSyncAt: now.toISOString(),
    currentHealthData: {
      healthScore: 78,
      nutritionScore: 74,
      fitnessScore: 76,
      sleepScore: 76,
      medicationAdherence: 94,
      hydrationGlasses: 6,
      hydrationGoal: 8,
      steps: 7600,
      stepGoal: 9000,
      weeklyActivityMinutes: 170,
      heartRateBpm: 72,
      sleepMinutes: 430,
      caloriesBurned: 420,
      activeMinutes: 28,
      sleepQuality: "Good",
      stepPercent: 84,
    },
    profile,
    memory: [{
      id: "goal-improve-energy",
      category: "goal",
      value: "improve energy",
      sourceMessage: "I want to improve energy",
      confidence: 0.86,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }],
    trends: [],
    insights: [],
    personalizedRecommendations: [],
    ...overrides,
  };
}

function buildCoachingContext(summaries, overrides = {}, conversation = []) {
  const partial = baseContext(overrides);
  const intelligenceProfile = buildUserIntelligenceProfile({
    profile: partial.profile,
    context: partial,
    memories: partial.memory,
    conversation,
    now,
  });
  const trendIntelligence = trendIntelligenceEngine.analyze({
    summaries,
    context: partial,
    intelligenceProfile,
    now,
  });
  const goalHabitCoaching = goalHabitCoachingEngine.generate({
    summaries,
    context: partial,
    trendIntelligence,
    intelligenceProfile,
    memories: partial.memory,
    now,
  });
  const context = {
    ...partial,
    intelligenceProfile,
    trendIntelligence,
    goalHabitCoaching,
    predictions: {
      topPredictions: [],
      allPredictions: [],
      insights: [],
      summary: "No predictive wellness signals available.",
      generatedAt: now.toISOString(),
      metrics: {
        predictionCount: 0,
        highRiskCount: 0,
        predictionCategories: [],
        averageConfidence: 0,
        dataQualityIssues: 0,
      },
    },
  };

  return {
    ...context,
    predictions: predictionOrchestrator.run(context),
  };
}

function goalByDomain(context, domain) {
  return context.goalHabitCoaching.goals.find((goal) => goal.domain === domain);
}

function habitByDomain(context, domain) {
  return context.goalHabitCoaching.habits.find((habit) => habit.domain === domain);
}

function textOf(context) {
  return [
    ...context.goalHabitCoaching.goals.map((goal) => `${goal.title} ${goal.reason}`),
    ...context.goalHabitCoaching.habits.map((habit) => `${habit.title} ${habit.suggestedNextAction}`),
    ...context.goalHabitCoaching.recommendations.map((item) => `${item.message} ${item.reason}`),
    ...context.goalHabitCoaching.compactSummary,
  ].join(" ");
}

function assertSafeText(text, label) {
  assert(!/\bdiagnos(?:e|is|tic)\b|\bdisease prediction\b|\bguarantee\b|\bprevent disease\b/i.test(text), `${label}: no diagnostic promises`);
  assert(!/\bchange (?:your )?dose\b|\badjust (?:your )?dose\b|\bstop (?:your )?medication\b|\bdouble (?:your )?dose\b/i.test(text), `${label}: no medication dose changes`);
  assert(!/\bextreme calorie\b|\bcrash diet\b|\bhard workout\b|\bpush through pain\b/i.test(text), `${label}: no unsafe escalation`);
}

async function main() {
  const decliningSteps = buildCoachingContext(summariesFrom([
    { steps: 9000, activeMinutes: 40, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 7600, activeMinutes: 34, sleepMinutes: 428, hydrationMl: 1750 },
    { steps: 6200, activeMinutes: 27, sleepMinutes: 425, hydrationMl: 1700 },
    { steps: 5000, activeMinutes: 21, sleepMinutes: 420, hydrationMl: 1650 },
    { steps: 3900, activeMinutes: 17, sleepMinutes: 418, hydrationMl: 1600 },
    { steps: 2800, activeMinutes: 12, sleepMinutes: 415, hydrationMl: 1550 },
  ]), { steps: 2400, activeMinutes: 10, weeklyActivityMinutes: 88 });
  assert(goalByDomain(decliningSteps, "activity"), "declining steps creates activity goal");
  assert(/10-minute|gentle|small|walk/i.test(textOf(decliningSteps)), "activity goal is gentle");

  const lowSleep = buildCoachingContext(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 455, hydrationMl: 1800 },
    { steps: 7100, activeMinutes: 29, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 7000, activeMinutes: 28, sleepMinutes: 395, hydrationMl: 1750 },
    { steps: 6900, activeMinutes: 27, sleepMinutes: 370, hydrationMl: 1700 },
    { steps: 6800, activeMinutes: 26, sleepMinutes: 350, hydrationMl: 1650 },
    { steps: 6700, activeMinutes: 25, sleepMinutes: 340, hydrationMl: 1600 },
  ]), { sleepMinutes: 335, sleepScore: 62 });
  assert(goalByDomain(lowSleep, "sleep"), "sleep below baseline creates sleep goal");
  assert(/wind-down|bedtime|sleep routine|consistent/i.test(textOf(lowSleep)), "sleep goal uses routine wording");

  const hydrationSlip = buildCoachingContext(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 2200 },
    { steps: 7100, activeMinutes: 29, sleepMinutes: 430, hydrationMl: 1900 },
    { steps: 7050, activeMinutes: 28, sleepMinutes: 425, hydrationMl: 1500 },
    { steps: 7000, activeMinutes: 27, sleepMinutes: 425, hydrationMl: 1200 },
    { steps: 6950, activeMinutes: 26, sleepMinutes: 420, hydrationMl: 900 },
    { steps: 6900, activeMinutes: 25, sleepMinutes: 420, hydrationMl: 750 },
  ]), { hydrationGlasses: 3, hydrationGoal: 8 });
  assert(goalByDomain(hydrationSlip, "hydration"), "hydration slipping creates hydration goal");
  assert(habitByDomain(hydrationSlip, "hydration"), "hydration slipping creates hydration habit");
  assert(/meal|water|hydration/i.test(textOf(hydrationSlip)), "hydration habit nudge present");

  const recovery = buildCoachingContext(summariesFrom([
    { steps: 11000, activeMinutes: 60, sleepMinutes: 410, hydrationMl: 1800 },
    { steps: 11500, activeMinutes: 62, sleepMinutes: 390, hydrationMl: 1800 },
    { steps: 12000, activeMinutes: 66, sleepMinutes: 370, hydrationMl: 1750 },
    { steps: 11800, activeMinutes: 65, sleepMinutes: 350, hydrationMl: 1700 },
    { steps: 11600, activeMinutes: 64, sleepMinutes: 340, hydrationMl: 1650 },
    { steps: 11400, activeMinutes: 63, sleepMinutes: 335, hydrationMl: 1600 },
  ]), { weeklyActivityMinutes: 360, sleepScore: 60, sleepMinutes: 330, activeMinutes: 62 });
  assert(goalByDomain(recovery, "recovery"), "high activity plus low sleep creates recovery goal");
  assert(/recovery|light/i.test(textOf(recovery)), "recovery recommendation is present");

  const insufficient = buildCoachingContext(summariesFrom([
    { steps: 5000, activeMinutes: 20, sleepMinutes: 390, hydrationMl: 1200 },
  ]), { steps: 5100, sleepScore: 72 });
  assert(insufficient.goalHabitCoaching.confidence === "low", "insufficient data lowers coaching confidence");
  assert(insufficient.goalHabitCoaching.goals.some((goal) => goal.confidence === "low"), "insufficient data lowers goal confidence");

  const streakContext = buildCoachingContext(summariesFrom([
    { steps: 3600, activeMinutes: 20, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 3900, activeMinutes: 21, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 6200, activeMinutes: 32, sleepMinutes: 435, hydrationMl: 1900 },
    { steps: 6400, activeMinutes: 33, sleepMinutes: 438, hydrationMl: 1900 },
    { steps: 6600, activeMinutes: 34, sleepMinutes: 440, hydrationMl: 1950 },
    { steps: 6800, activeMinutes: 35, sleepMinutes: 442, hydrationMl: 1950 },
  ]), { steps: 6900, activeMinutes: 36 });
  const activityHabit = habitByDomain(streakContext, "activity");
  assert(activityHabit && activityHabit.streakDays >= 3, "streak calculation counts recent completions");
  assert(activityHabit && activityHabit.completionRate > 50, "completion rate calculation works");

  const minimal = buildCoachingContext(summariesFrom([
    { steps: 9000, activeMinutes: 40, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 7600, activeMinutes: 34, sleepMinutes: 428, hydrationMl: 1750 },
    { steps: 6200, activeMinutes: 27, sleepMinutes: 425, hydrationMl: 1700 },
    { steps: 5000, activeMinutes: 21, sleepMinutes: 420, hydrationMl: 1650 },
  ]), { memory: [memoryForStyle("minimal")], steps: 4200 });
  const motivational = buildCoachingContext(summariesFrom([
    { steps: 9000, activeMinutes: 40, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 7600, activeMinutes: 34, sleepMinutes: 428, hydrationMl: 1750 },
    { steps: 6200, activeMinutes: 27, sleepMinutes: 425, hydrationMl: 1700 },
    { steps: 5000, activeMinutes: 21, sleepMinutes: 420, hydrationMl: 1650 },
  ]), { memory: [memoryForStyle("motivational")], steps: 4200 });
  assert(minimal.goalHabitCoaching.suggestedNextAction !== motivational.goalHabitCoaching.suggestedNextAction, "coaching style changes wording");
  assert(/Small win/i.test(motivational.goalHabitCoaching.suggestedNextAction), "motivational wording applied");

  const prompt = buildPrompt({
    message: "What goal should I focus on today?",
    intent: "general",
    context: hydrationSlip,
    prompt: "",
    conversation: [],
    traceId: "coaching-prompt-validation",
  });
  const coachingSection = (prompt.split("Coaching Summary:")[1] ?? "").split("Recent Insights:")[0] ?? "";
  assert(coachingSection.length < 650, "AI context coaching summary is compact");
  assert(coachingSection.includes("Suggested next action"), "AI context includes coaching next action");

  connectivityService.setManualStatus(false);
  const offline = await new OfflineAIProvider().sendMessage({
    message: "What goal should I focus on today?",
    intent: "general",
    context: hydrationSlip,
    prompt: "validation",
    conversation: [],
    traceId: "coaching-offline-validation",
  });
  assert(offline.provider === "offline", "offline provider returns offline response");
  assert(/coaching summary|suggested next action|hydration/i.test(offline.response.toLowerCase()), "offline provider includes coaching");
  assert(offline.metadata.coachingProgressScore === hydrationSlip.goalHabitCoaching.progressScore, "offline coaching metadata preserved");

  const medication = buildCoachingContext(summariesFrom([
    { steps: 6200, activeMinutes: 28, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 6300, activeMinutes: 29, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 6400, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 1800 },
  ]), {
    adherenceScore: 74,
    medicationAdherenceStatus: "Needs attention",
    currentHealthData: {
      ...baseContext().currentHealthData,
      medicationAdherence: 74,
    },
  });
  assert(goalByDomain(medication, "medication_adherence"), "medication adherence goal generated");
  assert(/clinician|reminder|prescribed schedule|instructions/i.test(textOf(medication)), "medication coaching stays reminder-based");
  assertSafeText(textOf(medication), "medication coaching safety");

  assertSafeText(textOf(decliningSteps), "goal coaching safety");

  const recs = generatePersonalizedRecommendations({
    context: hydrationSlip,
    intent: "hydration",
    profile: hydrationSlip.profile,
    memories: hydrationSlip.memory,
    trends: hydrationSlip.trends,
    insights: [],
  });
  const uniqueMessages = new Set(recs.map((item) => item.message.toLowerCase()));
  assert(uniqueMessages.size === recs.length, "recommendation dedupe works");
  assert(/hydration habit|goal|coaching|meal/i.test(recs.map((item) => `${item.message} ${item.reason}`).join(" ")), "recommendations use goal/habit signals");

  console.log("Goal + habit coaching validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
