const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

process.env.NODE_ENV = "test";

const storage = new Map();
const originalLoad = Module._load;

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
          listener({ isConnected: false, isInternetReachable: false });

          return () => undefined;
        },
        fetch: async () => ({ isConnected: false, isInternetReachable: false }),
      },
    };
  }

  if (request === "expo-secure-store") {
    return {
      getItemAsync: async (key) => storage.get(`secure:${key}`) ?? null,
      setItemAsync: async (key, value) => storage.set(`secure:${key}`, value),
      deleteItemAsync: async (key) => storage.delete(`secure:${key}`),
    };
  }

  if (request === "react-native") {
    return {
      Platform: { OS: "web", select: (values) => values?.web ?? values?.default },
      NativeModules: {},
      AppState: { addEventListener: () => ({ remove: () => undefined }), currentState: "active" },
    };
  }

  if (request.includes("store/authStore")) {
    return {
      useAuthStore: {
        getState: () => ({ user: { id: "briefing-user", email: "briefing@example.com" } }),
      },
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
const { dailyHealthBriefingEngine } = require(path.join(root, "src/services/briefing/DailyHealthBriefingEngine"));
const { aiInsightEngine } = require(path.join(root, "src/services/insights/AIInsightEngine"));
const { goalHabitCoachingEngine } = require(path.join(root, "src/services/coaching/GoalHabitCoachingEngine"));
const { trendIntelligenceEngine } = require(path.join(root, "src/services/prediction/TrendIntelligenceEngine"));
const { predictionOrchestrator } = require(path.join(root, "src/services/prediction/PredictionOrchestrator"));
const { buildUserIntelligenceProfile } = require(path.join(root, "src/services/ai/personalization/PersonalizationEngine"));
const { generatePersonalizedRecommendations } = require(path.join(root, "src/services/ai/recommendation/RecommendationEngineV2"));
const { classifyIntent } = require(path.join(root, "src/services/ai/intentClassifier"));
const { buildDirectMetricAnswer } = require(path.join(root, "src/services/ai/directMetricAnswer"));
const { buildPrompt } = require(path.join(root, "src/services/ai/promptBuilder"));
const { OfflineAIProvider } = require(path.join(root, "src/services/ai/providers/OfflineAIProvider"));
const { MockAIProvider } = require(path.join(root, "src/services/ai/providers/MockAIProvider"));

const now = new Date("2026-06-29T08:00:00.000Z");

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Validation failed: ${label}`);
  }

  console.log(`PASS ${label}`);
}

function dateAt(daysAgo) {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);

  return date.toISOString().slice(0, 10);
}

function summary(daysAgo, values) {
  const date = dateAt(daysAgo);
  const deviceSource = values.deviceSource ?? "live";
  const cloud = deviceSource === "cloud_summary";

  return {
    id: `summary_${date}_daily`,
    date,
    source: cloud ? "cloud_summary" : "health_connect",
    deviceSource,
    displaySource: cloud ? "Cloud Summary" : deviceSource === "cache" ? "Last synced summary" : "Live Device Summary",
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
      provider: cloud ? "cloud_summary" : "Health Connect",
      status: cloud ? "cloud_summary" : deviceSource === "cache" ? "cache" : "live",
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

function emptyBriefing() {
  return {
    id: "daily-briefing-test-placeholder",
    date: now.toISOString().slice(0, 10),
    title: "Daily health briefing",
    greeting: "Today's briefing.",
    summary: "Placeholder briefing.",
    recommendedActions: [],
    dataSourceNote: "Placeholder data note.",
    confidence: "low",
    safetyLevel: "normal",
    generatedAt: now.toISOString(),
  };
}

function emptyPredictions() {
  return {
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
  };
}

function baseContext(overrides = {}) {
  const profile = overrides.profile ?? baseProfile;
  const context = {
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

  return {
    ...context,
    currentHealthData: {
      ...context.currentHealthData,
      ...(overrides.currentHealthData || {}),
    },
  };
}

function buildBriefingContext(summaries, overrides = {}, conversation = []) {
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
  const contextBeforePredictions = {
    ...partial,
    intelligenceProfile,
    trendIntelligence,
    goalHabitCoaching,
    aiInsights: {
      generatedAt: now.toISOString(),
      source: "local",
      topInsights: [],
      allInsights: [],
      compactSummary: [],
      confidence: "low",
      dataQuality: "insufficient",
    },
    dailyBriefing: emptyBriefing(),
    predictions: emptyPredictions(),
  };
  const predictions = predictionOrchestrator.run(contextBeforePredictions);
  const contextBeforeInsights = {
    ...contextBeforePredictions,
    predictions,
  };
  const aiInsights = aiInsightEngine.generate({
    summaries,
    context: contextBeforeInsights,
    trendIntelligence,
    goalHabitCoaching,
    predictions,
    intelligenceProfile,
    memories: partial.memory,
    now,
  });
  const dailyBriefing = dailyHealthBriefingEngine.generate({
    summaries,
    context: contextBeforeInsights,
    trendIntelligence,
    goalHabitCoaching,
    aiInsights,
    predictions,
    intelligenceProfile,
    memories: partial.memory,
    now,
  });

  return {
    ...contextBeforeInsights,
    aiInsights,
    dailyBriefing,
  };
}

function assertSafeText(text, label) {
  assert(!/\bdiagnos(?:e|is|tic)\b|\bdisease prediction\b|\bguarantee\b|\bprevent disease\b|\bmedical certainty\b/i.test(text), `${label}: no diagnostic promises`);
  assert(!/\bchange (?:your )?dose\b|\badjust (?:your )?dose\b|\bstop (?:your )?medication\b|\bdouble (?:your )?dose\b/i.test(text), `${label}: no medication dose changes`);
  assert(!/\bextreme calorie\b|\bcrash diet\b|\bhard workout\b|\bpush through pain\b/i.test(text), `${label}: no unsafe escalation`);
}

function briefingText(context) {
  const briefing = context.dailyBriefing;

  return [
    briefing.greeting,
    briefing.summary,
    briefing.topInsight,
    briefing.focusArea,
    briefing.goalStatus,
    briefing.habitStatus,
    briefing.trendHighlight,
    ...briefing.recommendedActions,
    briefing.dataSourceNote,
  ].filter(Boolean).join(" ");
}

async function main() {
  const normal = buildBriefingContext(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 1900 },
    { steps: 7600, activeMinutes: 31, sleepMinutes: 435, hydrationMl: 1950 },
    { steps: 7800, activeMinutes: 33, sleepMinutes: 440, hydrationMl: 2000 },
  ]));
  assert(normal.dailyBriefing.title === "Daily health briefing", "normal briefing generated");
  assert(normal.dailyBriefing.recommendedActions.length > 0, "normal briefing has recommended actions");
  assertSafeText(briefingText(normal), "normal briefing safety");

  const recovery = buildBriefingContext(summariesFrom([
    { steps: 10500, activeMinutes: 58, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 11200, activeMinutes: 62, sleepMinutes: 395, hydrationMl: 1800 },
    { steps: 11800, activeMinutes: 65, sleepMinutes: 370, hydrationMl: 1750 },
    { steps: 11600, activeMinutes: 64, sleepMinutes: 350, hydrationMl: 1700 },
    { steps: 11400, activeMinutes: 63, sleepMinutes: 340, hydrationMl: 1650 },
    { steps: 11300, activeMinutes: 61, sleepMinutes: 335, hydrationMl: 1600 },
  ]), { weeklyActivityMinutes: 360, sleepScore: 60, sleepMinutes: 330, activeMinutes: 62 });
  assert(/sleep|recovery/i.test(recovery.dailyBriefing.focusArea ?? recovery.dailyBriefing.summary), "recovery-focused briefing");

  const hydration = buildBriefingContext(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 2200 },
    { steps: 7100, activeMinutes: 29, sleepMinutes: 430, hydrationMl: 1900 },
    { steps: 7050, activeMinutes: 28, sleepMinutes: 425, hydrationMl: 1500 },
    { steps: 7000, activeMinutes: 27, sleepMinutes: 425, hydrationMl: 1200 },
    { steps: 6950, activeMinutes: 26, sleepMinutes: 420, hydrationMl: 900 },
    { steps: 6900, activeMinutes: 25, sleepMinutes: 420, hydrationMl: 750 },
  ]), { hydrationGlasses: 3, hydrationGoal: 8, hydrationStatus: "Below target" });
  assert(/hydration/i.test(hydration.dailyBriefing.focusArea ?? hydration.dailyBriefing.summary), "hydration-focused briefing");

  const activity = buildBriefingContext(summariesFrom([
    { steps: 9200, activeMinutes: 42, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 7600, activeMinutes: 34, sleepMinutes: 428, hydrationMl: 1800 },
    { steps: 6200, activeMinutes: 28, sleepMinutes: 425, hydrationMl: 1750 },
    { steps: 5000, activeMinutes: 21, sleepMinutes: 420, hydrationMl: 1700 },
    { steps: 3900, activeMinutes: 17, sleepMinutes: 418, hydrationMl: 1650 },
    { steps: 2800, activeMinutes: 12, sleepMinutes: 415, hydrationMl: 1600 },
  ]), { steps: 2400, activeMinutes: 10, weeklyActivityMinutes: 88, stepPercent: 27 });
  assert(/activity|movement|fitness/i.test(activity.dailyBriefing.focusArea ?? activity.dailyBriefing.summary), "activity-focused briefing");

  const noData = buildBriefingContext([], {
    deviceDataSource: "no_data",
    deviceDataStatus: "connected_no_data",
    lastDeviceSyncAt: null,
    steps: 0,
    stepGoal: 0,
    sleepScore: 0,
    hydrationGlasses: 0,
    hydrationGoal: 0,
  });
  assert(noData.dailyBriefing.confidence === "low", "no-data briefing has low confidence");
  assert(/recent records|not have recent/i.test(noData.dailyBriefing.dataSourceNote), "no-data briefing explains missing records");

  const cloudSummaryOnly = buildBriefingContext(summariesFrom([
    { deviceSource: "cloud_summary", steps: 6000, activeMinutes: 24, sleepMinutes: 400, hydrationMl: 1400 },
    { deviceSource: "cloud_summary", steps: 6500, activeMinutes: 26, sleepMinutes: 410, hydrationMl: 1500 },
  ]), { deviceDataSource: "cache", deviceDataStatus: "connected_cached" });
  assert(/cloud summary, not live device data/i.test(cloudSummaryOnly.dailyBriefing.dataSourceNote), "cloud-summary-only note");

  const minimal = buildBriefingContext(summariesFrom([
    { steps: 7000, activeMinutes: 30, sleepMinutes: 420, hydrationMl: 1400 },
    { steps: 7050, activeMinutes: 30, sleepMinutes: 420, hydrationMl: 1200 },
    { steps: 7100, activeMinutes: 30, sleepMinutes: 420, hydrationMl: 900 },
  ]), { memory: [memoryForStyle("minimal")], hydrationGlasses: 3, hydrationGoal: 8 });
  const motivational = buildBriefingContext(summariesFrom([
    { steps: 7000, activeMinutes: 30, sleepMinutes: 420, hydrationMl: 1400 },
    { steps: 7050, activeMinutes: 30, sleepMinutes: 420, hydrationMl: 1200 },
    { steps: 7100, activeMinutes: 30, sleepMinutes: 420, hydrationMl: 900 },
  ]), { memory: [memoryForStyle("motivational")], hydrationGlasses: 3, hydrationGoal: 8 });
  assert(minimal.dailyBriefing.greeting !== motivational.dailyBriefing.greeting, "personalization changes wording");

  assert(hydration.dailyBriefing.recommendedActions.length <= 3, "recommended actions capped");
  assertSafeText(briefingText(hydration), "hydration briefing safety");
  assertSafeText(briefingText(recovery), "recovery briefing safety");
  assertSafeText(briefingText(activity), "activity briefing safety");

  const prompt = buildPrompt({
    message: "What is my health briefing today?",
    intent: "daily_briefing",
    context: hydration,
    prompt: "",
    conversation: [],
    traceId: "briefing-prompt-validation",
  });
  const briefingSection = (prompt.split("Daily Briefing:")[1] ?? "").split("Recent Insights:")[0] ?? "";
  assert(briefingSection.length < 700, "AI context compact");
  assert((briefingSection.match(/Actions:/g) ?? []).length === 1, "AI context has one compact action line");

  const offline = await new OfflineAIProvider().sendMessage({
    message: "What is my health briefing today?",
    intent: "daily_briefing",
    context: hydration,
    prompt: "validation",
    conversation: [],
    traceId: "briefing-offline-validation",
  });
  assert(offline.provider === "offline", "offline provider returns offline briefing");
  assert(/daily briefing|briefing actions|hydration/i.test(offline.response.toLowerCase()), "offline provider includes briefing");
  assert(offline.metadata.briefingFocusArea === hydration.dailyBriefing.focusArea, "offline briefing metadata preserved");

  const mock = await new MockAIProvider().sendMessage({
    message: "Give me today's health summary.",
    intent: "daily_briefing",
    context: hydration,
    prompt: "validation",
    conversation: [],
    traceId: "briefing-mock-validation",
  });
  assert(/recommended actions|data note/i.test(mock.response), "mock provider answers briefing directly");
  assert(mock.metadata.briefingConfidence === hydration.dailyBriefing.confidence, "mock briefing metadata preserved");

  const recs = generatePersonalizedRecommendations({
    context: hydration,
    intent: "daily_briefing",
    profile: hydration.profile,
    memories: hydration.memory,
    trends: hydration.trends,
    insights: [],
  });
  const recMessages = recs.map((item) => item.message.toLowerCase());
  assert(recMessages.includes(hydration.dailyBriefing.recommendedActions[0].toLowerCase()), "recommendations use briefing focus/action");
  assert(new Set(recMessages).size === recMessages.length, "recommendations avoid duplicate actions");

  const briefingQuestions = [
    "What is my health briefing today?",
    "Give me today's health summary.",
    "What should I focus on today?",
    "How did I do yesterday?",
  ];
  for (const question of briefingQuestions) {
    const intent = classifyIntent(question);
    assert(intent === "daily_briefing", `${question}: routed to daily briefing`);
    assert(buildDirectMetricAnswer(question, intent, hydration) === null, `${question}: direct metric answer does not intercept`);
  }

  console.log("Daily health briefing validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
