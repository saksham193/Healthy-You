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
        getState: () => ({ user: { id: "prevention-user", email: "prevention@example.com" } }),
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
const { preventiveHealthEngine } = require(path.join(root, "src/services/prevention/PreventiveHealthEngine"));
const { trendIntelligenceEngine } = require(path.join(root, "src/services/prediction/TrendIntelligenceEngine"));
const { goalHabitCoachingEngine } = require(path.join(root, "src/services/coaching/GoalHabitCoachingEngine"));
const { aiInsightEngine } = require(path.join(root, "src/services/insights/AIInsightEngine"));
const { dailyHealthBriefingEngine } = require(path.join(root, "src/services/briefing/DailyHealthBriefingEngine"));
const { predictionOrchestrator } = require(path.join(root, "src/services/prediction/PredictionOrchestrator"));
const { recommendationDecisionOrchestrator } = require(path.join(root, "src/services/ai/recommendation/RecommendationDecisionOrchestrator"));
const { buildUserIntelligenceProfile } = require(path.join(root, "src/services/ai/personalization/PersonalizationEngine"));
const { buildPrompt } = require(path.join(root, "src/services/ai/promptBuilder"));
const { OfflineAIProvider } = require(path.join(root, "src/services/ai/providers/OfflineAIProvider"));

const now = new Date("2026-06-30T08:00:00.000Z");

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
      lastDeviceSyncAt: values.lastDeviceSyncAt ?? `${date}T08:00:00.000Z`,
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

function emptyDecision(context) {
  const createdAt = now.toISOString();

  return {
    id: "prevention-placeholder-decision",
    primary: {
      id: "prevention-placeholder-candidate",
      title: "Choose one small wellness action",
      summary: "Placeholder decision.",
      category: "general_wellness",
      source: "fallback",
      supportingSources: ["fallback"],
      priority: "low",
      confidence: "low",
      action: "Choose one small wellness action today.",
      reason: "Placeholder decision.",
      safetyLevel: "normal",
      dedupeKey: "general_wellness:choose small wellness action",
      createdAt,
    },
    alternatives: [],
    suppressed: [],
    rankingReason: `Placeholder for ${context.deviceDataSource}.`,
    confidence: "low",
    generatedAt: createdAt,
  };
}

function emptyBriefing() {
  return {
    id: "prevention-briefing-placeholder",
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

function buildContext(summaries, overrides = {}) {
  const partial = baseContext(overrides);
  const intelligenceProfile = buildUserIntelligenceProfile({
    profile: partial.profile,
    context: partial,
    memories: partial.memory,
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
    recommendationDecision: emptyDecision(partial),
    preventiveSummary: {
      generatedAt: now.toISOString(),
      overallRisk: "low",
      focus: "none",
      confidence: "low",
      topActions: [],
      risks: [],
      compactSummary: [],
      safetyLevel: "normal",
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
  const contextBeforeInsights = { ...contextBeforePredictions, predictions };
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
  const preventiveForBriefing = preventiveHealthEngine.generate({
    summaries,
    context: contextBeforeInsights,
    trendIntelligence,
    goalHabitCoaching,
    aiInsights,
    predictions,
    intelligenceProfile,
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
    preventiveSummary: preventiveForBriefing,
    memories: partial.memory,
    now,
  });
  const contextBeforeDecision = {
    ...contextBeforeInsights,
    aiInsights,
    dailyBriefing,
    preventiveSummary: preventiveForBriefing,
  };
  const recommendationDecision = recommendationDecisionOrchestrator.generate({
    context: contextBeforeDecision,
    now,
  });
  const preventiveSummary = preventiveHealthEngine.generate({
    summaries,
    context: contextBeforeDecision,
    trendIntelligence,
    goalHabitCoaching,
    aiInsights,
    predictions,
    intelligenceProfile,
    dailyBriefing,
    recommendationDecision,
    now,
  });

  return {
    ...contextBeforeDecision,
    recommendationDecision,
    preventiveSummary,
  };
}

function risk(context, category) {
  return context.preventiveSummary.risks.find((item) => item.category === category);
}

function allPreventiveText(context) {
  const summary = context.preventiveSummary;

  return [
    ...summary.compactSummary,
    ...summary.risks.map((item) =>
      `${item.title} ${item.summary} ${item.explanation} ${item.suggestedAction} ${item.supportingSignals.join(" ")}`,
    ),
    context.dailyBriefing.summary,
    context.recommendationDecision.primary.action,
    context.recommendationDecision.rankingReason,
  ].join(" ");
}

function assertSafeText(text, label) {
  assert(!/\byou have diabetes\b|\byou have heart disease\b|\byou are depressed\b|\byou have anxiety\b|\bmedically diagnosed\b|\bclinically burned out\b/i.test(text), `${label}: no diagnosis wording`);
  assert(!/\byou have dehydration\b|\byou have burnout\b|\byou have chronic fatigue\b/i.test(text), `${label}: no wellness diagnosis labels`);
  assert(!/\b(double|increase|reduce|adjust|change|stop)\s+(your\s+)?(medication|medicine|dose|dosage)\b/i.test(text), `${label}: no medication dosage advice`);
}

async function main() {
  const sleepDebt = buildContext(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 1900 },
    { steps: 7400, activeMinutes: 31, sleepMinutes: 380, hydrationMl: 1900 },
    { steps: 7300, activeMinutes: 30, sleepMinutes: 360, hydrationMl: 1850 },
    { steps: 7100, activeMinutes: 28, sleepMinutes: 350, hydrationMl: 1850 },
    { steps: 7000, activeMinutes: 27, sleepMinutes: 340, hydrationMl: 1800 },
  ]), { sleepScore: 58, sleepMinutes: 340 });
  assert(Boolean(risk(sleepDebt, "sleep")), "sleep debt detection");

  const hydration = buildContext(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 2200 },
    { steps: 7100, activeMinutes: 29, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 7050, activeMinutes: 28, sleepMinutes: 425, hydrationMl: 1400 },
    { steps: 7000, activeMinutes: 27, sleepMinutes: 425, hydrationMl: 1000 },
    { steps: 6950, activeMinutes: 26, sleepMinutes: 420, hydrationMl: 800 },
  ]), { hydrationGlasses: 3, hydrationGoal: 8, hydrationStatus: "Below target" });
  assert(Boolean(risk(hydration, "hydration")), "hydration decline");

  const activity = buildContext(summariesFrom([
    { steps: 9400, activeMinutes: 42, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 7600, activeMinutes: 34, sleepMinutes: 428, hydrationMl: 1800 },
    { steps: 6100, activeMinutes: 28, sleepMinutes: 425, hydrationMl: 1750 },
    { steps: 4300, activeMinutes: 18, sleepMinutes: 420, hydrationMl: 1700 },
    { steps: 2600, activeMinutes: 10, sleepMinutes: 418, hydrationMl: 1650 },
  ]), { steps: 2400, activeMinutes: 10, weeklyActivityMinutes: 88, stepPercent: 27 });
  assert(Boolean(risk(activity, "activity")), "inactivity detection");

  const recovery = buildContext(summariesFrom([
    { steps: 10500, activeMinutes: 58, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 11200, activeMinutes: 62, sleepMinutes: 395, hydrationMl: 1800 },
    { steps: 11800, activeMinutes: 65, sleepMinutes: 370, hydrationMl: 1750 },
    { steps: 11600, activeMinutes: 64, sleepMinutes: 350, hydrationMl: 1700 },
    { steps: 11400, activeMinutes: 63, sleepMinutes: 335, hydrationMl: 1650 },
  ]), { weeklyActivityMinutes: 360, sleepScore: 60, sleepMinutes: 330, activeMinutes: 62 });
  assert(Boolean(risk(recovery, "recovery")), "recovery strain");

  const habitRelapse = buildContext(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 2200 },
    { steps: 7100, activeMinutes: 29, sleepMinutes: 430, hydrationMl: 2100 },
    { steps: 7050, activeMinutes: 28, sleepMinutes: 425, hydrationMl: 900 },
    { steps: 7000, activeMinutes: 27, sleepMinutes: 425, hydrationMl: 800 },
    { steps: 6950, activeMinutes: 26, sleepMinutes: 420, hydrationMl: 750 },
  ]), { hydrationGlasses: 2, hydrationGoal: 8 });
  assert(Boolean(risk(habitRelapse, "habit")), "habit relapse");

  const stale = buildContext(summariesFrom([
    { deviceSource: "cache", steps: 6000, activeMinutes: 24, sleepMinutes: 400, hydrationMl: 1400, lastDeviceSyncAt: "2026-06-25T08:00:00.000Z" },
    { deviceSource: "cache", steps: 6100, activeMinutes: 24, sleepMinutes: 400, hydrationMl: 1400, lastDeviceSyncAt: "2026-06-25T08:00:00.000Z" },
  ]), {
    deviceDataSource: "cache",
    deviceDataStatus: "connected_cached",
    lastDeviceSyncAt: "2026-06-25T08:00:00.000Z",
  });
  assert(/stale|sync/i.test(risk(stale, "device_quality")?.title ?? ""), "stale Health Connect");

  const demo = buildContext([], {
    deviceDataSource: "demo",
    deviceDataStatus: "demo",
    lastDeviceSyncAt: null,
  });
  assert(/demo/i.test(risk(demo, "device_quality")?.title ?? allPreventiveText(demo)), "demo data quality warning");

  const cloud = buildContext(summariesFrom([
    { deviceSource: "cloud_summary", steps: 6000, activeMinutes: 24, sleepMinutes: 400, hydrationMl: 1400 },
    { deviceSource: "cloud_summary", steps: 6100, activeMinutes: 25, sleepMinutes: 405, hydrationMl: 1450 },
    { deviceSource: "cloud_summary", steps: 6200, activeMinutes: 26, sleepMinutes: 410, hydrationMl: 1500 },
  ]), { deviceDataSource: "cache", deviceDataStatus: "connected_cached" });
  assert(/cloud/i.test(risk(cloud, "device_quality")?.title ?? allPreventiveText(cloud)), "cloud summary warning");

  const minimal = buildContext(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 2200 },
    { steps: 7100, activeMinutes: 29, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 7050, activeMinutes: 28, sleepMinutes: 425, hydrationMl: 1400 },
  ]), { memory: [memoryForStyle("minimal")], hydrationGlasses: 3, hydrationGoal: 8 });
  const scientific = buildContext(summariesFrom([
    { steps: 7200, activeMinutes: 30, sleepMinutes: 430, hydrationMl: 2200 },
    { steps: 7100, activeMinutes: 29, sleepMinutes: 430, hydrationMl: 1800 },
    { steps: 7050, activeMinutes: 28, sleepMinutes: 425, hydrationMl: 1400 },
  ]), { memory: [memoryForStyle("scientific")], hydrationGlasses: 3, hydrationGoal: 8 });
  assert(minimal.preventiveSummary.primaryRisk?.summary !== scientific.preventiveSummary.primaryRisk?.summary, "personalization wording");

  const prompt = buildPrompt({
    message: "What should I focus on today?",
    intent: "general_wellness",
    context: hydration,
    prompt: "",
    conversation: [],
    traceId: "prevention-prompt-validation",
  });
  const preventiveSection = (prompt.split("Preventive Wellness:")[1] ?? "").split("Predictive Wellness Signals:")[0] ?? "";
  assert(/Overall risk:/.test(preventiveSection), "AI context summary");
  assert(!/supportingSignals|suggestedAction|explanation/.test(preventiveSection), "AI context does not dump every risk");

  assert(hydration.recommendationDecision.primary.category === "hydration", "recommendation integration");
  assert(/preventive wellness|preventive risk|hydration/i.test(hydration.recommendationDecision.rankingReason), "recommendation references preventive signal");

  assert(/preventive wellness|hydration/i.test(hydration.dailyBriefing.summary.toLowerCase()), "briefing integration");
  assert((hydration.dailyBriefing.summary.match(/Preventive wellness:/g) ?? []).length <= 1, "briefing mentions one preventive risk");

  const offline = await new OfflineAIProvider().sendMessage({
    message: "What should I focus on today?",
    intent: "general_wellness",
    context: hydration,
    prompt: "validation",
    conversation: [],
    traceId: "prevention-offline-validation",
  });
  assert(offline.provider === "offline", "offline provider");
  assert(/preventive wellness|overall .* risk/i.test(offline.response), "offline provider includes preventive summary");
  assert(offline.metadata.preventiveOverallRisk === hydration.preventiveSummary.overallRisk, "offline metadata includes preventive summary");

  const unsafe = preventiveHealthEngine.generate({
    summaries: [],
    context: baseContext({ deviceDataSource: "no_data", deviceDataStatus: "connected_no_data" }),
    trendIntelligence: {
      generatedAt: now.toISOString(),
      source: "local",
      weeklySummary: "Unsafe validation.",
      compactSummary: [],
      topTrends: [],
      metrics: [],
      habitDrifts: [],
      confidence: "medium",
      dataQuality: "limited",
    },
    goalHabitCoaching: {
      generatedAt: now.toISOString(),
      source: "local",
      goals: [{
        id: "unsafe-med-goal",
        domain: "medication_adherence",
        title: "Medication reminder",
        cadence: "daily",
        progressPercent: 20,
        difficulty: "easy",
        status: "at_risk",
        confidence: "medium",
        reason: "Never double your medication dose.",
        updatedAt: now.toISOString(),
      }],
      habits: [],
      recommendations: [{
        id: "unsafe-med-rec",
        domain: "medication_adherence",
        message: "Double your medication dose tonight.",
        reason: "Unsafe test.",
        priority: "high",
        confidence: "medium",
        source: "goal",
      }],
      compactSummary: [],
      progressScore: 20,
      atRiskCount: 1,
      confidence: "medium",
      dataQuality: "limited",
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
        dataQualityIssues: 1,
      },
    },
    intelligenceProfile: buildUserIntelligenceProfile({
      profile: baseProfile,
      context: baseContext(),
      memories: [],
      now,
    }),
    now,
  });
  const unsafeText = [
    allPreventiveText(hydration),
    allPreventiveText(recovery),
    ...unsafe.risks.map((item) => `${item.title} ${item.summary} ${item.explanation} ${item.suggestedAction}`),
  ].join(" ");
  assertSafeText(unsafeText, "unsafe diagnosis wording blocked");
  assertSafeText(unsafeText, "medication dosage advice blocked");

  console.log("Preventive health validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
