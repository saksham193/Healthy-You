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
        getState: () => ({ user: { id: "personalization-user", email: "personalization@example.com" } }),
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
const {
  adaptCoachingStyle,
  buildUserIntelligenceProfile,
  calculatePersonalizationScore,
  explainRecommendation,
  learnPreferencesFromInteraction,
} = require(path.join(root, "src/services/ai/personalization/PersonalizationEngine"));
const { longTermMemory } = require(path.join(root, "src/services/ai/memory/LongTermMemory"));
const { generatePersonalizedRecommendations } = require(path.join(root, "src/services/ai/recommendation/RecommendationEngineV2"));
const { OfflineAIProvider } = require(path.join(root, "src/services/ai/providers/OfflineAIProvider"));
const { connectivityService } = require(path.join(root, "src/services/connectivity/ConnectivityService"));

const now = new Date().toISOString();

const baseProfile = {
  demographics: { age: 31, gender: "female" },
  bodyMetrics: { height: 166, weight: 64, bmi: 23.2 },
  goals: ["Improve energy", "Build consistent morning activity"],
  dietaryPreferences: ["vegetarian"],
  allergies: [],
  chronicConditions: [],
  activityLevel: "moderate",
  averageSleepHours: 7,
  medicationAdherence: 92,
  wearableMetadata: {
    primaryProvider: "Mock Health",
    connectedDeviceCount: 1,
    capabilities: ["steps", "sleep", "heart_rate", "hydration"],
    lastSyncedAt: now,
    syncStatus: "synced",
  },
  activityProfile: { dailySteps: 6400, stepGoal: 9000, weeklyActivityMinutes: 180, exerciseMinutes: 35 },
  restProfile: { sleepMinutes: 420, sleepScore: 74, plannedSleepHours: 7 },
  recoveryProfile: { heartRateBpm: 72, recoveryStatus: "steady" },
  profileCompletenessScore: 86,
  updatedAt: now,
  source: "store",
};

function predictions() {
  return {
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
}

function contextWith(memories = []) {
  const partialContext = {
    healthScore: 78,
    nutritionScore: 72,
    fitnessScore: 76,
    sleepScore: 74,
    adherenceScore: 92,
    nutritionStatus: "Good",
    fitnessStatus: "Good",
    sleepStatus: "Good",
    medicationAdherenceStatus: "Excellent",
    hydrationStatus: "Below target",
    hydrationGlasses: 4,
    hydrationGoal: 8,
    steps: 6400,
    stepGoal: 9000,
    weeklyActivityMinutes: 180,
    heartRateBpm: 72,
    sleepMinutes: 420,
    caloriesBurned: 430,
    activeMinutes: 35,
    sleepQuality: "Good",
    stepPercent: 71,
    deviceDataSource: "cache",
    deviceDataStatus: "connected_cached",
    devicePermissionStatus: "granted",
    lastDeviceSyncAt: now,
    currentHealthData: {
      healthScore: 78,
      nutritionScore: 72,
      fitnessScore: 76,
      sleepScore: 74,
      medicationAdherence: 92,
      hydrationGlasses: 4,
      hydrationGoal: 8,
      steps: 6400,
      stepGoal: 9000,
      weeklyActivityMinutes: 180,
      heartRateBpm: 72,
      sleepMinutes: 420,
      caloriesBurned: 430,
      activeMinutes: 35,
      sleepQuality: "Good",
      stepPercent: 71,
    },
    profile: baseProfile,
    memory: memories,
    trends: [
      {
        metric: "water",
        period: "7d",
        direction: "declining",
        percentageChange: -20,
        averageValue: 5,
        latestValue: 4,
        riskIndicators: ["hydration below weekly average"],
        points: [],
      },
    ],
    insights: [],
    personalizedRecommendations: [],
  };
  const intelligenceProfile = buildUserIntelligenceProfile({
    profile: baseProfile,
    context: partialContext,
    memories,
    conversation: [],
  });

  return {
    ...partialContext,
    intelligenceProfile,
    predictions: predictions(),
  };
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Validation failed: ${label}`);
  }

  console.log(`PASS ${label}`);
}

async function timed(label, work) {
  const startedAt = Date.now();
  const value = await work();
  const elapsedMs = Date.now() - startedAt;

  console.log(`INFO ${label}: ${elapsedMs}ms`);

  return { value, elapsedMs };
}

async function main() {
  connectivityService.setManualStatus(false);

  let context = contextWith([]);
  const initialScore = calculatePersonalizationScore({
    profile: baseProfile,
    context,
    memories: [],
    conversation: [],
  });

  await learnPreferencesFromInteraction({
    message: "Please keep replies concise. I prefer morning workouts, I enjoy yoga, and remind me about water.",
    context,
    conversation: [],
  });
  let memories = await longTermMemory.getMemories();
  assert(memories.some((memory) => memory.metadata?.preferenceKey === "preferred_response_length"), "preference learning: response length learned");
  assert(memories.some((memory) => memory.metadata?.preferenceKey === "preferred_workout_time"), "preference learning: workout time learned");
  assert(memories.some((memory) => memory.metadata?.preferenceKey === "favorite_activity"), "preference learning: favorite activity learned");
  assert(memories.some((memory) => memory.metadata?.preferenceKey === "motivation_style"), "preference learning: reminder motivation learned");

  const morningPreference = memories.find((memory) => memory.metadata?.preferenceKey === "preferred_workout_time");
  await learnPreferencesFromInteraction({
    message: "Morning workout works best for me. Keep it concise again.",
    context,
    conversation: [],
  });
  memories = await longTermMemory.getMemories();
  const updatedMorningPreference = memories.find((memory) => memory.metadata?.preferenceKey === "preferred_workout_time");
  assert(updatedMorningPreference.confidence >= morningPreference.confidence, "confidence updates: repeated evidence increases or preserves confidence");
  assert(updatedMorningPreference.metadata.evidenceCount >= 2, "confidence updates: evidence count increments");

  context = contextWith(memories);
  const intelligence = context.intelligenceProfile;
  assert(intelligence.personalizationScore > initialScore, "personalization score: improves with memory richness");
  assert(intelligence.preferredResponseLength === "concise", "intelligence profile: preferred response length generated");
  assert(intelligence.learnedPreferences.length >= 4, "memory integration: learned preferences included");
  assert(intelligence.activityPattern.toLowerCase().includes("morning"), "profile integration: activity pattern uses learned workout time");
  assert(intelligence.hydrationPattern.toLowerCase().includes("4/8"), "profile integration: hydration pattern generated");

  assert(adaptCoachingStyle("Can you explain the scientific reason?", intelligence.learnedPreferences) === "scientific", "coaching adaptation: scientific style");
  assert(adaptCoachingStyle("Motivate me with a challenge", intelligence.learnedPreferences) === "motivational", "coaching adaptation: motivational style");
  assert(adaptCoachingStyle("Quick answer please", intelligence.learnedPreferences) === "minimal", "coaching adaptation: minimal style");

  const recommendations = generatePersonalizedRecommendations({
    context,
    intent: "hydration",
    profile: baseProfile,
    memories,
    trends: context.trends,
    insights: [],
  });
  assert(recommendations.length > 0, "recommendations: personalized recommendations generated");
  assert(recommendations[0].reason.includes("I recommended this because"), "explanation generation: explanation layer added");
  assert(recommendations.some((recommendation) => recommendation.reason.toLowerCase().includes("hydration")), "explanation generation: hydration reason included");

  const explanation = explainRecommendation(recommendations[0], context);
  assert(explanation.includes("I recommended this because"), "explanation generation: direct explanation available");

  const provider = new OfflineAIProvider();
  const offline = await provider.sendMessage({
    message: "How should I hydrate today?",
    intent: "hydration",
    context,
    prompt: "validation",
    conversation: [],
    traceId: "personalization-validation",
  });
  assert(offline.provider === "offline", "offline behavior: provider remains offline");
  assert(offline.metadata.offline === true, "offline behavior: metadata marks offline");
  assert(offline.metadata.personalizationScore === intelligence.personalizationScore, "offline behavior: personalization metadata preserved");
  assert(offline.response.toLowerCase().includes("why this fits you"), "offline behavior: explanation included");

  const latency = await timed("personalization engine latency", async () => {
    for (let index = 0; index < 200; index += 1) {
      const localContext = contextWith(memories);
      generatePersonalizedRecommendations({
        context: localContext,
        intent: "hydration",
        profile: baseProfile,
        memories,
        trends: localContext.trends,
        insights: [],
      });
    }
  });
  assert(latency.elapsedMs < 2000, "latency: personalization stays under 2 seconds");

  console.log("Personalization engine validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
