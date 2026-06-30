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
        getState: () => ({ user: { id: "decision-user", email: "decision@example.com" } }),
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
const {
  normalizeRecommendationText,
  recommendationDecisionOrchestrator,
} = require(path.join(root, "src/services/ai/recommendation/RecommendationDecisionOrchestrator"));
const { OfflineAIProvider } = require(path.join(root, "src/services/ai/providers/OfflineAIProvider"));
const { buildDirectMetricAnswer } = require(path.join(root, "src/services/ai/directMetricAnswer"));

const now = new Date("2026-06-30T08:00:00.000Z");

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Validation failed: ${label}`);
  }

  console.log(`PASS ${label}`);
}

function candidate(overrides) {
  const category = overrides.category ?? "general_wellness";
  const action = overrides.action ?? "Choose one small wellness action today.";

  return {
    id: overrides.id ?? `candidate-${category}-${normalizeRecommendationText(action)}`,
    title: overrides.title ?? action,
    summary: overrides.summary ?? overrides.reason ?? "Validation candidate.",
    category,
    source: overrides.source ?? "fallback",
    supportingSources: overrides.supportingSources ?? [overrides.source ?? "fallback"],
    priority: overrides.priority ?? "medium",
    confidence: overrides.confidence ?? "medium",
    action,
    reason: overrides.reason ?? "Validation signal.",
    safetyLevel: overrides.safetyLevel ?? "normal",
    dedupeKey: overrides.dedupeKey ?? `${category}:${normalizeRecommendationText(action)}`,
    createdAt: overrides.createdAt ?? now.toISOString(),
  };
}

const emptyPredictions = {
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

function emptyDecision() {
  const primary = candidate({
    id: "placeholder-decision-candidate",
    category: "general_wellness",
    source: "fallback",
    priority: "low",
    confidence: "low",
    action: "Choose one small wellness action today.",
  });

  return {
    id: "placeholder-decision",
    primary,
    alternatives: [],
    suppressed: [],
    rankingReason: "Placeholder decision for validation fixtures.",
    confidence: "low",
    generatedAt: now.toISOString(),
  };
}

function baseContext(overrides = {}) {
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
    profile: {
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
    },
    memory: [],
    trends: [],
    trendIntelligence: {
      generatedAt: now.toISOString(),
      source: "local",
      weeklySummary: "Stable week.",
      compactSummary: [],
      topTrends: [],
      metrics: [],
      habitDrifts: [],
      confidence: "medium",
      dataQuality: "fresh",
    },
    goalHabitCoaching: {
      generatedAt: now.toISOString(),
      source: "local",
      goals: [],
      habits: [],
      recommendations: [],
      compactSummary: [],
      progressScore: 80,
      atRiskCount: 0,
      confidence: "medium",
      dataQuality: "fresh",
    },
    aiInsights: {
      generatedAt: now.toISOString(),
      source: "local",
      topInsights: [],
      allInsights: [],
      compactSummary: [],
      confidence: "medium",
      dataQuality: "fresh",
    },
    dailyBriefing: {
      id: "briefing-validation",
      date: "2026-06-30",
      title: "Daily health briefing",
      greeting: "Today's briefing.",
      summary: "Signals look steady.",
      focusArea: "general wellness",
      recommendedActions: ["Choose one small wellness action today."],
      dataSourceNote: "This briefing uses local validation context.",
      confidence: "medium",
      safetyLevel: "normal",
      generatedAt: now.toISOString(),
    },
    recommendationDecision: emptyDecision(),
    insights: [],
    personalizedRecommendations: [],
    intelligenceProfile: {
      generatedAt: now.toISOString(),
      fitnessLevel: "moderate",
      activityPattern: "7600/9000 steps",
      sleepPattern: "7.2h",
      hydrationPattern: "6/8 glasses",
      nutritionPattern: "steady nutrition signals",
      stressPattern: "no strong local stress signal",
      motivationStyle: "supportive",
      preferredCoachingStyle: "friendly",
      preferredResponseLength: "concise",
      healthGoals: ["Improve energy"],
      riskFactors: [],
      behaviorConfidence: 80,
      learningConfidence: 0,
      personalizationScore: 78,
      learnedPreferences: [],
      signals: [],
    },
    predictions: emptyPredictions,
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

function decision(context, extraCandidates = [], extra = {}) {
  return recommendationDecisionOrchestrator.generate({
    context,
    extraCandidates,
    now,
    ...extra,
  });
}

function assertSafeText(text, label) {
  assert(!/\bdiagnos(?:e|is|tic)\b|\bdisease prediction\b|\bguarantee\b|\bprevent disease\b|\bmedical certainty\b/i.test(text), `${label}: no diagnostic promises`);
  assert(!/\bchange (?:your )?dose\b|\badjust (?:your )?dose\b|\bstop (?:your )?medication\b|\bdouble (?:your )?dose\b/i.test(text), `${label}: no medication dose changes`);
  assert(!/\bextreme calorie\b|\bcrash diet\b|\bhard workout\b|\bpush through pain\b/i.test(text), `${label}: no unsafe escalation`);
}

async function main() {
  const hydrationDedupe = decision(baseContext({
    dailyBriefing: { ...baseContext().dailyBriefing, recommendedActions: [] },
  }), [
    candidate({
      id: "hydration-a",
      category: "hydration",
      source: "briefing",
      priority: "high",
      confidence: "high",
      action: "Drink water before lunch.",
      reason: "Briefing hydration focus.",
    }),
    candidate({
      id: "hydration-b",
      category: "hydration",
      source: "insight",
      priority: "medium",
      confidence: "medium",
      action: "Have a glass of water before your next meal.",
      reason: "Insight hydration focus.",
      dedupeKey: "hydration:hydration before meal",
    }),
  ]);
  const hydrationActions = [hydrationDedupe.primary, ...hydrationDedupe.alternatives].filter((item) => item.category === "hydration");
  assert(hydrationActions.length === 1, "hydration candidates dedupe correctly");
  assert(hydrationDedupe.primary.supportingSources.includes("insight"), "dedupe preserves supporting source");

  const recoveryContext = baseContext({
    sleepScore: 58,
    goalHabitCoaching: {
      ...baseContext().goalHabitCoaching,
      recommendations: [{
        id: "recovery-risk",
        domain: "recovery",
        message: "Keep movement light today.",
        reason: "Recovery strain is high.",
        priority: "high",
        confidence: "high",
        source: "trend",
      }],
    },
  });
  const recoveryDecision = decision(recoveryContext, [
    candidate({
      id: "intense-activity",
      category: "activity",
      source: "goal",
      priority: "high",
      confidence: "high",
      action: "Do an intense HIIT workout today.",
      reason: "Activity goal needs progress.",
    }),
  ]);
  assert(/light|recovery/i.test(recoveryDecision.primary.action), `recovery recommendation outranks intense activity (${recoveryDecision.primary.action})`);
  assert(recoveryDecision.suppressed.some((item) => /intense|HIIT/i.test(item.action)), "intense activity postponed under recovery strain");

  const briefingContext = baseContext({
    hydrationGlasses: 3,
    hydrationGoal: 8,
    hydrationStatus: "Below target",
    dailyBriefing: {
      ...baseContext().dailyBriefing,
      focusArea: "hydration",
      summary: "Hydration is the strongest focus today.",
      recommendedActions: ["Pair a glass of water with your next meal."],
      confidence: "high",
    },
  });
  const briefingDecision = decision(briefingContext, [
    candidate({
      id: "activity-alt",
      category: "activity",
      source: "fallback",
      priority: "medium",
      confidence: "high",
      action: "Take a short walk after lunch.",
      reason: "General movement support.",
    }),
  ]);
  assert(briefingDecision.primary.category === "hydration", "briefing focus influences primary recommendation");

  const insightContext = baseContext({
    dailyBriefing: { ...baseContext().dailyBriefing, recommendedActions: [] },
    aiInsights: {
      ...baseContext().aiInsights,
      topInsights: [{
        id: "top-insight-sleep",
        category: "sleep",
        title: "Sleep consistency needs attention",
        summary: "Sleep is below your normal baseline.",
        priority: "high",
        confidence: "high",
        source: "local_summary",
        supportingSignals: ["Sleep minutes below baseline"],
        explanation: "Recent sleep summaries are below baseline.",
        suggestedAction: "Protect a consistent wind-down tonight.",
        safetyLevel: "normal",
        createdAt: now.toISOString(),
      }],
      allInsights: [],
    },
  });
  assert(decision(insightContext).primary.category === "sleep", "top insight influences primary recommendation");

  const habitContext = baseContext({
    dailyBriefing: { ...baseContext().dailyBriefing, recommendedActions: [] },
    goalHabitCoaching: {
      ...baseContext().goalHabitCoaching,
      habits: [{
        id: "hydration-habit",
        domain: "hydration",
        title: "Hydration check-ins",
        streakDays: 0,
        completionRate: 35,
        status: "slipping",
        confidence: "high",
        suggestedNextAction: "Restart hydration with one check-in before lunch.",
        updatedAt: now.toISOString(),
      }],
    },
  });
  assert(decision(habitContext).primary.source === "habit", "goal/habit risk influences ranking");

  const lowTrendContext = baseContext({
    dailyBriefing: { ...baseContext().dailyBriefing, recommendedActions: [] },
    trendIntelligence: {
      ...baseContext().trendIntelligence,
      topTrends: [{
        id: "low-confidence-trend",
        metric: "steps",
        label: "Steps",
        direction: "declining",
        period: "7d",
        percentageChange: -4,
        confidence: "low",
        dataPointsUsed: 2,
        dataQuality: "limited",
        source: "local_summary",
        reason: "Only two data points.",
        interpretation: "Step trend is uncertain.",
        abnormalChange: false,
        habitDrift: false,
      }],
    },
  });
  const lowTrendDecision = decision(lowTrendContext);
  assert(lowTrendDecision.suppressed.some((item) => item.source === "trend"), "low-confidence trend is suppressed");

  const liveDevice = decision(baseContext({ dailyBriefing: { ...baseContext().dailyBriefing, recommendedActions: [] } }), [
    candidate({
      id: "device-sync-live",
      category: "device_data",
      source: "device",
      priority: "high",
      confidence: "high",
      action: "Reconnect Health Connect.",
      reason: "Device sync candidate.",
    }),
  ]);
  assert(liveDevice.suppressed.some((item) => item.source === "device"), "live Health Connect suppresses device-sync recommendation");

  const noDataDevice = decision(baseContext({
    deviceDataSource: "no_data",
    deviceDataStatus: "connected_no_data",
    dailyBriefing: { ...baseContext().dailyBriefing, recommendedActions: [] },
  }));
  assert(noDataDevice.primary.category === "device_data", "no-data Health Connect allows device-data recommendation");

  const minimalDecision = decision(baseContext({
    dailyBriefing: {
      ...baseContext().dailyBriefing,
      focusArea: "hydration",
      recommendedActions: ["Pair a glass of water with your next meal."],
    },
    intelligenceProfile: {
      ...baseContext().intelligenceProfile,
      preferredCoachingStyle: "minimal",
    },
  }));
  const motivationalDecision = decision(baseContext({
    dailyBriefing: {
      ...baseContext().dailyBriefing,
      focusArea: "hydration",
      recommendedActions: ["Pair a glass of water with your next meal."],
    },
    intelligenceProfile: {
      ...baseContext().intelligenceProfile,
      preferredCoachingStyle: "motivational",
    },
  }));
  assert(minimalDecision.primary.action !== motivationalDecision.primary.action, "personalization changes wording");

  assert(/Supporting sources|Confidence|Alternatives/i.test(briefingDecision.rankingReason), "explanation includes supporting signals");

  const offlineContext = {
    ...briefingContext,
    recommendationDecision: briefingDecision,
  };
  const offline = await new OfflineAIProvider().sendMessage({
    message: "What is your top recommendation for me?",
    intent: "general_wellness",
    context: offlineContext,
    prompt: "validation",
    conversation: [],
    traceId: "decision-offline-validation",
  });
  assert(offline.provider === "offline", "offline provider returns offline response");
  assert(/recommendation decision|decision why/i.test(offline.response.toLowerCase()), "offline provider includes decision");
  assert(offline.metadata.recommendationPrimaryAction, "offline provider includes decision metadata");

  const unsafeMedication = decision(baseContext({
    dailyBriefing: { ...baseContext().dailyBriefing, recommendedActions: [] },
  }), [
    candidate({
      id: "unsafe-dose",
      category: "medication",
      source: "agent",
      priority: "high",
      confidence: "high",
      action: "Double your medication dose tonight.",
      reason: "Unsafe validation candidate.",
      safetyLevel: "caution",
    }),
  ]);
  assert(unsafeMedication.suppressed.some((item) => item.id === "unsafe-dose"), "unsafe medication dosage recommendation blocked");
  assertSafeText(`${unsafeMedication.primary.action} ${unsafeMedication.rankingReason}`, "decision safety");

  const directContext = baseContext();
  const started = Date.now();
  for (let index = 0; index < 1000; index += 1) {
    const direct = buildDirectMetricAnswer("How many steps do I have today?", "steps_query", directContext);
    assert(Boolean(direct), "direct metric answer still returns");
  }
  const elapsed = Date.now() - started;
  assert(elapsed < 2000, "direct metric latency remains unaffected");

  console.log("Recommendation decision validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
