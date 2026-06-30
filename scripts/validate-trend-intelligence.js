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
        getState: () => ({ user: { id: "trend-user", email: "trend@example.com" } }),
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

function summary(daysAgo, values, stale = false) {
  const date = dateAt(daysAgo);
  const syncedAt = stale
    ? "2026-06-20T08:00:00.000Z"
    : `${date}T08:00:00.000Z`;

  return {
    id: `summary_${date}_daily`,
    date,
    source: "health_connect",
    deviceSource: stale ? "cache" : "live",
    displaySource: stale ? "Last synced summary" : "Live Device Summary",
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
      sleepScore: values.sleepScore ?? Math.round((values.sleepMinutes ?? 420) / 6),
      fitnessScore: values.fitnessScore ?? 76,
    },
    syncMetadata: {
      lastDeviceSyncAt: syncedAt,
      provider: "Health Connect",
      status: stale ? "cache" : "live",
    },
    updatedAt: `${date}T08:30:00.000Z`,
  };
}

function summariesFrom(series, stale = false) {
  const newestFirst = series.map((values, index) => summary(series.length - index, values, stale));

  return newestFirst;
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

function baseContext(overrides = {}) {
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
    profile: baseProfile,
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

function contextWithTrend(summaries, overrides = {}) {
  const partial = baseContext(overrides);
  const intelligenceProfile = buildUserIntelligenceProfile({
    profile: partial.profile,
    context: partial,
    memories: partial.memory,
    conversation: [],
    now,
  });
  const trendIntelligence = trendIntelligenceEngine.analyze({
    summaries,
    context: partial,
    intelligenceProfile,
    now,
  });
  const context = {
    ...partial,
    intelligenceProfile,
    trendIntelligence,
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

function metric(summary, metricName) {
  return summary.metrics.find((item) => item.metric === metricName);
}

function trendText(context) {
  return [
    context.trendIntelligence.weeklySummary,
    ...context.trendIntelligence.compactSummary,
    ...context.trendIntelligence.topTrends.map((item) => item.reason),
    ...context.trendIntelligence.habitDrifts.map((item) => item.reason),
  ].join(" ");
}

function assertSafeTrendText(text, label) {
  assert(!/\byou have\b|\bwill happen\b|\bguaranteed\b|\bdisease\b|\bprescribe\b|\bchange (?:your )?dose\b|\bstop medication\b/i.test(text), `${label}: no unsafe diagnostic or treatment wording`);
  assert(!/\bdiagnos(?:e|is)\b/i.test(text) || /\bnot\b.{0,32}\bdiagnos/i.test(text), `${label}: diagnosis wording only appears as limitation`);
}

async function main() {
  const improvingSteps = contextWithTrend(summariesFrom([
    { steps: 4200, activeMinutes: 16, sleepMinutes: 420, hydrationMl: 1400 },
    { steps: 5000, activeMinutes: 19, sleepMinutes: 425, hydrationMl: 1500 },
    { steps: 5800, activeMinutes: 22, sleepMinutes: 430, hydrationMl: 1600 },
    { steps: 6500, activeMinutes: 25, sleepMinutes: 430, hydrationMl: 1700 },
    { steps: 7200, activeMinutes: 28, sleepMinutes: 435, hydrationMl: 1800 },
    { steps: 7800, activeMinutes: 32, sleepMinutes: 438, hydrationMl: 1900 },
  ]), { steps: 8200, activeMinutes: 34, weeklyActivityMinutes: 210 });
  assert(metric(improvingSteps.trendIntelligence, "steps").direction === "improving", "improving steps trend");
  assert(metric(improvingSteps.trendIntelligence, "steps").confidence !== "low", "improving steps confidence");

  const decliningSteps = contextWithTrend(summariesFrom([
    { steps: 9000, activeMinutes: 40, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 7800, activeMinutes: 34, sleepMinutes: 425, hydrationMl: 1700 },
    { steps: 6500, activeMinutes: 28, sleepMinutes: 420, hydrationMl: 1600 },
    { steps: 5200, activeMinutes: 22, sleepMinutes: 415, hydrationMl: 1500 },
    { steps: 4100, activeMinutes: 18, sleepMinutes: 410, hydrationMl: 1400 },
    { steps: 3200, activeMinutes: 14, sleepMinutes: 405, hydrationMl: 1300 },
  ]), { steps: 2800, activeMinutes: 12, weeklyActivityMinutes: 98 });
  assert(metric(decliningSteps.trendIntelligence, "steps").direction === "declining", "declining steps trend");
  assert(decliningSteps.trendIntelligence.habitDrifts.some((drift) => drift.type === "activity_drop"), "habit drift: steps down for 3+ days");

  const stableSleep = contextWithTrend(summariesFrom([
    { steps: 7000, activeMinutes: 28, sleepMinutes: 421, hydrationMl: 1700 },
    { steps: 7100, activeMinutes: 29, sleepMinutes: 423, hydrationMl: 1700 },
    { steps: 7050, activeMinutes: 27, sleepMinutes: 420, hydrationMl: 1720 },
    { steps: 7200, activeMinutes: 30, sleepMinutes: 424, hydrationMl: 1710 },
    { steps: 7150, activeMinutes: 29, sleepMinutes: 422, hydrationMl: 1700 },
    { steps: 7180, activeMinutes: 29, sleepMinutes: 423, hydrationMl: 1690 },
  ]), { sleepMinutes: 422 });
  assert(metric(stableSleep.trendIntelligence, "sleep_minutes").direction === "stable", "stable sleep trend");

  const hydrationDrift = contextWithTrend(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 2200 },
    { steps: 7300, activeMinutes: 30, sleepMinutes: 428, hydrationMl: 2000 },
    { steps: 7100, activeMinutes: 28, sleepMinutes: 426, hydrationMl: 1700 },
    { steps: 7050, activeMinutes: 27, sleepMinutes: 425, hydrationMl: 1300 },
    { steps: 7000, activeMinutes: 26, sleepMinutes: 422, hydrationMl: 1100 },
    { steps: 6900, activeMinutes: 25, sleepMinutes: 420, hydrationMl: 900 },
  ]), { hydrationGlasses: 3, hydrationGoal: 8 });
  assert(hydrationDrift.trendIntelligence.habitDrifts.some((drift) => drift.type === "hydration_below_baseline"), "low hydration drift");

  const insufficient = contextWithTrend(summariesFrom([
    { steps: 5000, activeMinutes: 20, sleepMinutes: 390, hydrationMl: 1200 },
  ]), { steps: 5100 });
  assert(metric(insufficient.trendIntelligence, "steps").direction === "insufficient_data", "insufficient data trend");
  assert(metric(insufficient.trendIntelligence, "steps").confidence === "low", "insufficient data confidence low");

  const stale = contextWithTrend(summariesFrom([
    { steps: 7000, activeMinutes: 30, sleepMinutes: 420, hydrationMl: 1700 },
    { steps: 6800, activeMinutes: 29, sleepMinutes: 418, hydrationMl: 1650 },
    { steps: 6500, activeMinutes: 27, sleepMinutes: 410, hydrationMl: 1600 },
    { steps: 6200, activeMinutes: 25, sleepMinutes: 405, hydrationMl: 1550 },
  ], true), {
    deviceDataSource: "cache",
    deviceDataStatus: "connected_cached",
    lastDeviceSyncAt: "2026-06-20T08:00:00.000Z",
  });
  assert(metric(stale.trendIntelligence, "steps").dataQuality === "stale", "stale data quality detected");
  assert(metric(stale.trendIntelligence, "steps").confidence !== "high", "stale data downgrades confidence");
  assert(stale.predictions.metrics.dataQualityIssues > 0, "predictive refinement: stale trend affects data quality");

  const personalizedRecommendations = generatePersonalizedRecommendations({
    context: decliningSteps,
    intent: "fitness",
    profile: decliningSteps.profile,
    memories: decliningSteps.memory,
    trends: decliningSteps.trends,
    insights: [],
  });
  const personalizedText = personalizedRecommendations.map((item) => `${item.message} ${item.reason}`).join(" ");
  assert(/improve energy|gentle movement|short walk/i.test(personalizedText), "personalization affects recommendation wording");
  assert(/steps is declining|trend|confidence/i.test(personalizedText), "recommendation uses trend confidence");

  connectivityService.setManualStatus(false);
  const offline = await new OfflineAIProvider().sendMessage({
    message: "What trend should I focus on today?",
    intent: "general",
    context: hydrationDrift,
    prompt: "validation",
    conversation: [],
    traceId: "trend-validation",
  });
  assert(offline.provider === "offline", "offline trend generation works");
  assert(offline.metadata.offline === true, "offline trend response marks offline");
  assert(offline.metadata.trendConfidence === hydrationDrift.trendIntelligence.confidence, "offline trend metadata preserved");
  assert(/trend summary|habit drift|hydration/i.test(offline.response.toLowerCase()), "offline trend response includes trend signal");

  const prompt = buildPrompt({
    message: "How has my activity been this week?",
    intent: "activity_query",
    context: decliningSteps,
    prompt: "",
    conversation: [],
    traceId: "trend-prompt-validation",
  });
  const trendSection = (prompt.split("Trend Intelligence:")[1] ?? "").split("Recent Insights:")[0] ?? "";
  assert(trendSection.length < 900, "trend context is compact");
  assert(trendSection.includes("Weekly Trend Summary"), "trend context included in prompt");

  assertSafeTrendText(trendText(decliningSteps), "trend engine safety");
  assertSafeTrendText(personalizedText, "trend recommendation safety");

  console.log("Trend intelligence validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
