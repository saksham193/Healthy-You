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
        getState: () => ({ user: { id: "insight-user", email: "insight@example.com" } }),
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
const { aiInsightEngine } = require(path.join(root, "src/services/insights/AIInsightEngine"));
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

function buildInsightContext(summaries, overrides = {}, conversation = []) {
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
  const predictions = predictionOrchestrator.run(contextBeforePredictions);
  const aiInsights = aiInsightEngine.generate({
    summaries,
    context: contextBeforePredictions,
    trendIntelligence,
    goalHabitCoaching,
    predictions,
    intelligenceProfile,
    memories: partial.memory,
    now,
  });

  return {
    ...contextBeforePredictions,
    predictions,
    aiInsights,
  };
}

function top(context) {
  return context.aiInsights.topInsights[0];
}

function textOf(context) {
  return [
    ...context.aiInsights.allInsights.map((item) =>
      `${item.title} ${item.summary} ${item.explanation} ${item.suggestedAction} ${item.supportingSignals.join(" ")}`,
    ),
    ...context.aiInsights.compactSummary,
  ].join(" ");
}

function assertSafeText(text, label) {
  assert(!/\bdiagnos(?:e|is|tic)\b|\bdisease prediction\b|\bguarantee\b|\bprevent disease\b|\bmedical certainty\b/i.test(text), `${label}: no diagnostic promises`);
  assert(!/\bchange (?:your )?dose\b|\badjust (?:your )?dose\b|\bstop (?:your )?medication\b|\bdouble (?:your )?dose\b/i.test(text), `${label}: no medication dose changes`);
  assert(!/\bextreme calorie\b|\bcrash diet\b|\bhard workout\b|\bpush through pain\b/i.test(text), `${label}: no unsafe escalation`);
}

async function main() {
  const recovery = buildInsightContext(summariesFrom([
    { steps: 10500, activeMinutes: 58, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 11200, activeMinutes: 62, sleepMinutes: 395, hydrationMl: 1800 },
    { steps: 11800, activeMinutes: 65, sleepMinutes: 370, hydrationMl: 1750 },
    { steps: 11600, activeMinutes: 64, sleepMinutes: 350, hydrationMl: 1700 },
    { steps: 11400, activeMinutes: 63, sleepMinutes: 340, hydrationMl: 1650 },
    { steps: 11300, activeMinutes: 61, sleepMinutes: 335, hydrationMl: 1600 },
  ]), { weeklyActivityMinutes: 360, sleepScore: 60, sleepMinutes: 330, activeMinutes: 62 });
  assert(recovery.aiInsights.allInsights.some((item) => item.category === "recovery"), "sleep plus activity recovery insight");
  assert(/sleep|activity|recovery/i.test(textOf(recovery)), "recovery insight references sleep/activity signals");

  const hydration = buildInsightContext(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 2200 },
    { steps: 7100, activeMinutes: 29, sleepMinutes: 430, hydrationMl: 1900 },
    { steps: 7050, activeMinutes: 28, sleepMinutes: 425, hydrationMl: 1500 },
    { steps: 7000, activeMinutes: 27, sleepMinutes: 425, hydrationMl: 1200 },
    { steps: 6950, activeMinutes: 26, sleepMinutes: 420, hydrationMl: 900 },
    { steps: 6900, activeMinutes: 25, sleepMinutes: 420, hydrationMl: 750 },
  ]), { hydrationGlasses: 3, hydrationGoal: 8 });
  assert(hydration.aiInsights.allInsights.some((item) => item.category === "hydration"), "hydration habit insight");
  assert(/habit|hydration|meal|water/i.test(textOf(hydration)), "hydration insight references habit and action");

  const activity = buildInsightContext(summariesFrom([
    { steps: 9200, activeMinutes: 42, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 7600, activeMinutes: 34, sleepMinutes: 428, hydrationMl: 1800 },
    { steps: 6200, activeMinutes: 28, sleepMinutes: 425, hydrationMl: 1750 },
    { steps: 5000, activeMinutes: 21, sleepMinutes: 420, hydrationMl: 1700 },
    { steps: 3900, activeMinutes: 17, sleepMinutes: 418, hydrationMl: 1650 },
    { steps: 2800, activeMinutes: 12, sleepMinutes: 415, hydrationMl: 1600 },
  ]), { steps: 2400, activeMinutes: 10, weeklyActivityMinutes: 88 });
  assert(activity.aiInsights.allInsights.some((item) => item.category === "activity"), "declining activity insight");
  assert(/step|walk|movement|activity/i.test(textOf(activity)), "activity insight uses trend/action wording");

  const noData = buildInsightContext([], {
    deviceDataSource: "no_data",
    deviceDataStatus: "connected_no_data",
    lastDeviceSyncAt: null,
    steps: 0,
    stepGoal: 0,
    sleepScore: 0,
    hydrationGlasses: 0,
    hydrationGoal: 0,
  });
  assert(top(noData).category === "device_data", "device no-data insight ranks first");
  assert(top(noData).confidence === "low", "device no-data has cautious confidence with no history");

  const insufficient = buildInsightContext(summariesFrom([
    { steps: 5000, activeMinutes: 20, sleepMinutes: 390, hydrationMl: 1200 },
  ]), { steps: 5100, sleepScore: 72 });
  assert(insufficient.aiInsights.confidence === "low", "insufficient data lowers insight confidence");
  assert(insufficient.aiInsights.topInsights.every((item) => item.confidence === "low"), "top insights use low confidence wording when sparse");

  const urgent = buildInsightContext(summariesFrom([
    { steps: 6200, activeMinutes: 28, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 6300, activeMinutes: 29, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 6400, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 1800 },
  ]), { heartRateBpm: 138, sleepScore: 68 });
  assert(top(urgent).safetyLevel === "urgent", "insight ranking prioritizes urgent safety");
  assert(/urgent medical attention|urgent care|emergency services/i.test(top(urgent).suggestedAction), "urgent insight uses escalation wording");

  const minimal = buildInsightContext(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 2200 },
    { steps: 7100, activeMinutes: 29, sleepMinutes: 430, hydrationMl: 1900 },
    { steps: 7050, activeMinutes: 28, sleepMinutes: 425, hydrationMl: 1500 },
  ]), { memory: [memoryForStyle("minimal")], hydrationGlasses: 3, hydrationGoal: 8 });
  const motivational = buildInsightContext(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 2200 },
    { steps: 7100, activeMinutes: 29, sleepMinutes: 430, hydrationMl: 1900 },
    { steps: 7050, activeMinutes: 28, sleepMinutes: 425, hydrationMl: 1500 },
  ]), { memory: [memoryForStyle("motivational")], hydrationGlasses: 3, hydrationGoal: 8 });
  assert(top(minimal).summary !== top(motivational).summary, "personalization changes insight wording");
  assert(/Small win focus/i.test(top(motivational).summary), "motivational insight wording applied");

  const prompt = buildPrompt({
    message: "What is my top health insight?",
    intent: "general",
    context: hydration,
    prompt: "",
    conversation: [],
    traceId: "insight-prompt-validation",
  });
  const insightSection = (prompt.split("Top AI Insights:")[1] ?? "").split("Recent Insights:")[0] ?? "";
  assert(insightSection.length < 900, "AI context includes compact top insights only");
  assert((insightSection.match(/^- /gm) ?? []).length <= 3, "AI context caps top insights to three");

  connectivityService.setManualStatus(false);
  const offline = await new OfflineAIProvider().sendMessage({
    message: "What should I focus on today?",
    intent: "general",
    context: hydration,
    prompt: "validation",
    conversation: [],
    traceId: "insight-offline-validation",
  });
  assert(offline.provider === "offline", "offline provider returns offline response");
  assert(/top insights|hydration|insight/i.test(offline.response.toLowerCase()), "offline provider includes insights");
  assert(offline.metadata.topInsightCategory === top(hydration).category, "offline insight metadata preserved");

  const recs = generatePersonalizedRecommendations({
    context: hydration,
    intent: "hydration",
    profile: hydration.profile,
    memories: hydration.memory,
    trends: hydration.trends,
    insights: [],
  });
  const recText = recs.map((item) => `${item.message} ${item.reason}`).join(" ");
  assert(recs[0].message === top(hydration).suggestedAction, "recommendation engine uses top insight");
  assert(/top ranked insight|ranked insight/i.test(recText), "recommendation explanation references top insight");

  const uniqueInsightKeys = new Set(hydration.aiInsights.allInsights.map((item) => `${item.category}:${item.suggestedAction}`.toLowerCase()));
  assert(uniqueInsightKeys.size === hydration.aiInsights.allInsights.length, "duplicate insights are removed");

  const medication = buildInsightContext(summariesFrom([
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
  assert(medication.aiInsights.allInsights.some((item) => item.category === "medication"), "medication insight generated");
  assert(/clinician|reminder|prescribed schedule|instructions/i.test(textOf(medication)), "medication insight avoids dosage changes");
  assertSafeText(textOf(medication), "medication insight safety");

  assertSafeText(textOf(recovery), "AI insight safety");
  assertSafeText(textOf(activity), "activity insight safety");
  assertSafeText(textOf(hydration), "hydration insight safety");

  console.log("AI insight generation validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
