const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const storage = new Map();
const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "@react-native-async-storage/async-storage") {
    return {
      __esModule: true,
      default: {
        getItem: async (key) => storage.get(key) ?? null,
        setItem: async (key, value) => {
          storage.set(key, value);
        },
        removeItem: async (key) => {
          storage.delete(key);
        },
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
const { classifyIntent } = require(path.join(root, "src/services/ai/intentClassifier"));
const { buildDirectMetricAnswer } = require(path.join(root, "src/services/ai/directMetricAnswer"));
const { evaluateHealthSafety } = require(path.join(root, "src/services/ai/safety/HealthSafetyGuard"));
const { buildPrompt } = require(path.join(root, "src/services/ai/promptBuilder"));
const { medibotSessionStore } = require(path.join(root, "src/services/ai/MedibotSessionStore"));

const now = new Date().toISOString();

const predictionSummary = {
  topPredictions: [],
  allPredictions: [],
  insights: [],
  summary: "No predictive wellness signals available.",
  generatedAt: now,
  metrics: {
    predictionCount: 0,
    highRiskCount: 0,
    predictionCategories: [],
    averageConfidence: 0,
    dataQualityIssues: 0,
  },
};

function createContext(overrides = {}) {
  const context = {
    healthScore: 82,
    nutritionScore: 76,
    fitnessScore: 79,
    sleepScore: 72,
    adherenceScore: 96,
    nutritionStatus: "Good",
    fitnessStatus: "Good",
    sleepStatus: "Good",
    medicationAdherenceStatus: "Excellent",
    hydrationStatus: "Near target",
    hydrationGlasses: 6,
    hydrationGoal: 8,
    steps: 8500,
    stepGoal: 10000,
    weeklyActivityMinutes: 210,
    heartRateBpm: 72,
    sleepMinutes: 420,
    caloriesBurned: 530,
    activeMinutes: 42,
    sleepQuality: "Good",
    stepPercent: 85,
    deviceDataSource: "live",
    deviceDataStatus: "connected_live",
    devicePermissionStatus: "granted",
    lastDeviceSyncAt: now,
    currentHealthData: {
      healthScore: 82,
      nutritionScore: 76,
      fitnessScore: 79,
      sleepScore: 72,
      medicationAdherence: 96,
      hydrationGlasses: 6,
      hydrationGoal: 8,
      steps: 8500,
      stepGoal: 10000,
      weeklyActivityMinutes: 210,
      heartRateBpm: 72,
      sleepMinutes: 420,
      caloriesBurned: 530,
      activeMinutes: 42,
      sleepQuality: "Good",
      stepPercent: 85,
    },
    profile: {
      demographics: { age: 34 },
      bodyMetrics: {},
      goals: ["Improve activity consistency"],
      dietaryPreferences: [],
      allergies: [],
      chronicConditions: [],
      activityLevel: "moderate",
      averageSleepHours: 7,
      medicationAdherence: 96,
      profileCompletenessScore: 84,
      updatedAt: now,
      source: "store",
    },
    memory: [],
    trends: [],
    insights: [],
    personalizedRecommendations: [],
    predictions: predictionSummary,
  };

  return {
    ...context,
    ...overrides,
    currentHealthData: {
      ...context.currentHealthData,
      ...(overrides.currentHealthData || {}),
    },
  };
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Validation failed: ${label}`);
  }

  console.log(`PASS ${label}`);
}

function assertNoDiagnosisDisclaimer(response, label) {
  assert(!/cannot diagnose symptoms|medical conditions/i.test(response), `${label}: no generic diagnosis disclaimer`);
}

function assertDirectMetric(label, message, expectedIntent, expectedPattern, context = createContext()) {
  const intent = classifyIntent(message);
  assert(intent === expectedIntent, `${label}: intent ${expectedIntent}`);

  const safety = evaluateHealthSafety(message, intent);
  assert(safety.safe === true, `${label}: safety allows factual data question`);

  const answer = buildDirectMetricAnswer(message, intent, context);
  assert(Boolean(answer), `${label}: direct answer returned`);
  assert(answer.metadata && answer.metadata.metricDirectAnswerUsed === true, `${label}: direct answer metadata`);
  assert(expectedPattern.test(answer.response), `${label}: expected metric answer`);
  assertNoDiagnosisDisclaimer(answer.response, label);

  return answer;
}

function assertSafety(label, message, expectedPattern) {
  const intent = classifyIntent(message);
  const safety = evaluateHealthSafety(message, intent);
  assert(safety.safe === false, `${label}: blocked by safety guard`);
  assert(expectedPattern.test(safety.response.response), `${label}: expected safety response`);
}

async function main() {
  assertDirectMetric(
    "steps with data",
    "How many steps do I have today?",
    "steps_query",
    /8,500 steps today.*10,000.*85% complete/i,
  );

  assertDirectMetric(
    "heart rate with data",
    "What is my heart rate?",
    "heart_rate_query",
    /72 bpm/i,
  );

  assertDirectMetric(
    "sleep with data",
    "How much sleep did I get?",
    "sleep_query",
    /420 minutes.*7 hours/i,
  );

  const conflict = buildDirectMetricAnswer(
    "I slept only 4 hours yesterday and feel tired",
    classifyIntent("I slept only 4 hours yesterday and feel tired"),
    createContext({ sleepMinutes: 480, currentHealthData: { sleepMinutes: 480 } }),
  );
  assert(Boolean(conflict), "sleep conflict: direct response returned");
  assert(/sleeping only 4 hours/i.test(conflict.response), "sleep conflict: acknowledges user-reported sleep first");
  assert(/latest synced sleep record shows about 8 hours|mismatch/i.test(conflict.response), "sleep conflict: notes device mismatch");

  const conflictPrompt = buildPrompt({
    message: "I slept only 4 hours yesterday and feel tired",
    intent: "sleep",
    context: createContext({ sleepMinutes: 480, currentHealthData: { sleepMinutes: 480 } }),
    prompt: "",
    conversation: [],
    traceId: "validation",
  });
  assert(
    conflictPrompt.indexOf("Current User Message") < conflictPrompt.indexOf("Directly Relevant Device Data"),
    "prompt priority: user message before device data",
  );
  assert(/conflicts with synced device data/i.test(conflictPrompt), "prompt priority: conflict instruction present");

  assertSafety("diagnosis diabetes", "Do I have diabetes?", /cannot diagnose/i);
  assertSafety("medication stop", "Should I stop my medication?", /cannot recommend medication dosages|dosages or changes/i);
  assertSafety("urgent chest pain", "I have chest pain and trouble breathing", /urgent medical attention|emergency/i);

  const noDataContext = createContext({
    steps: 0,
    stepPercent: 0,
    heartRateBpm: undefined,
    sleepMinutes: undefined,
    caloriesBurned: undefined,
    activeMinutes: undefined,
    deviceDataSource: "no_data",
    deviceDataStatus: "connected_no_data",
    currentHealthData: {
      steps: 0,
      stepPercent: 0,
      heartRateBpm: undefined,
      sleepMinutes: undefined,
      caloriesBurned: undefined,
      activeMinutes: undefined,
    },
  });
  const noData = assertDirectMetric(
    "steps no Health Connect records",
    "How many steps do I have today?",
    "steps_query",
    /do not see Health Connect step records/i,
    noDataContext,
  );
  assertNoDiagnosisDisclaimer(noData.response, "steps no Health Connect records");

  const offline = assertDirectMetric(
    "offline simple metric",
    "How many steps do I have today?",
    "steps_query",
    /8,500 steps today/i,
    createContext({ deviceDataSource: "cache", deviceDataStatus: "connected_cached" }),
  );
  assert(offline.provider === "mock", "offline simple metric: local provider shape without cloud key");

  await medibotSessionStore.clear();
  await medibotSessionStore.saveRecentMessages([
    { id: "user-steps", role: "user", message: "How many steps do I have today?" },
    { id: "assistant-steps", role: "assistant", message: "According to Health Connect, you have 8,500 steps today." },
    { id: "user-urgent", role: "user", message: "I have chest pain and cannot breathe" },
    {
      id: "safety-emergency",
      role: "assistant",
      message: "This may need urgent medical attention.",
      metadata: { safetyLevel: "urgent", source: "mock" },
    },
  ]);
  const storedMessages = await medibotSessionStore.loadRecentMessages();
  assert(storedMessages.length === 2, "session persistence: stores only non-sensitive recent chat");
  assert(storedMessages.some((message) => /steps/i.test(message.message)), "session persistence: keeps factual metric chat");
  assert(!storedMessages.some((message) => /chest pain|urgent medical attention/i.test(message.message)), "session persistence: skips urgent safety chat");

  console.log("AI health routing validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
