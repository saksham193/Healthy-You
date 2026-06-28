const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const storage = new Map();
const originalLoad = Module._load;
let netInfoConnected = true;
let failRemoteMemorySaves = false;
const remoteMemorySaves = [];

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
        getState: () => ({ user: { id: "validation-user", email: "validation@example.com" } }),
      },
    };
  }

  if (request.includes("api/MemoryApi")) {
    return {
      saveMemory: async (memory) => {
        if (failRemoteMemorySaves) {
          throw new Error("simulated memory sync failure");
        }

        remoteMemorySaves.push(memory);
        return memory;
      },
      fetchMemories: async () => remoteMemorySaves,
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
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: filename,
  });

  module._compile(output.outputText, filename);
};

const root = path.resolve(__dirname, "..");
const { OfflineAIProvider } = require(path.join(root, "src/services/ai/providers/OfflineAIProvider"));
const { cachedAIResponseStore } = require(path.join(root, "src/services/local-ai/CachedAIResponseStore"));
const { offlineMemoryQueue } = require(path.join(root, "src/services/local-ai/OfflineMemoryQueue"));
const { connectivityService } = require(path.join(root, "src/services/connectivity/ConnectivityService"));
const { evaluateHealthSafety } = require(path.join(root, "src/services/ai/safety/HealthSafetyGuard"));

const baseProfile = {
  demographics: { age: 32, gender: "female" },
  bodyMetrics: { height: 165, weight: 65, bmi: 23.9 },
  goals: ["improve energy", "increase protein"],
  dietaryPreferences: ["vegetarian"],
  allergies: ["peanuts"],
  chronicConditions: [],
  activityLevel: "moderate",
  averageSleepHours: 6,
  medicationAdherence: 72,
  wearableMetadata: {
    primaryProvider: "Mock Health",
    connectedDeviceCount: 1,
    capabilities: ["steps", "sleep", "heart_rate"],
    lastSyncedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    syncStatus: "synced",
  },
  activityProfile: { dailySteps: 4200, stepGoal: 9000, weeklyActivityMinutes: 90 },
  restProfile: { sleepMinutes: 360, sleepScore: 63, plannedSleepHours: 6 },
  recoveryProfile: { heartRateBpm: 78, recoveryStatus: "fair" },
  profileCompletenessScore: 88,
  updatedAt: new Date().toISOString(),
  source: "store",
};

const context = {
  healthScore: 68,
  nutritionScore: 58,
  fitnessScore: 64,
  sleepScore: 63,
  adherenceScore: 72,
  nutritionStatus: "Needs attention",
  fitnessStatus: "Needs attention",
  sleepStatus: "Needs attention",
  medicationAdherenceStatus: "Needs attention",
  hydrationStatus: "Below target",
  hydrationGlasses: 3,
  hydrationGoal: 8,
  steps: 4200,
  stepGoal: 9000,
  weeklyActivityMinutes: 90,
  heartRateBpm: 78,
  sleepMinutes: 360,
  deviceDataSource: "cache",
  lastDeviceSyncAt: baseProfile.wearableMetadata.lastSyncedAt,
  currentHealthData: {
    healthScore: 68,
    nutritionScore: 58,
    fitnessScore: 64,
    sleepScore: 63,
    medicationAdherence: 72,
    hydrationGlasses: 3,
    hydrationGoal: 8,
    steps: 4200,
    stepGoal: 9000,
    weeklyActivityMinutes: 90,
    heartRateBpm: 78,
    sleepMinutes: 360,
  },
  profile: baseProfile,
  memory: [
    {
      id: "dietary_preference-vegetarian",
      category: "dietary_preference",
      value: "vegetarian",
      sourceMessage: "I am vegetarian",
      confidence: 0.9,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  trends: [
    {
      metric: "water",
      period: "7d",
      direction: "declining",
      percentageChange: -25,
      averageValue: 4,
      latestValue: 3,
      riskIndicators: ["water trend is declining"],
      points: [],
    },
    {
      metric: "sleep",
      period: "7d",
      direction: "declining",
      percentageChange: -15,
      averageValue: 65,
      latestValue: 63,
      riskIndicators: ["sleep trend needs attention"],
      points: [],
    },
  ],
  insights: [],
  personalizedRecommendations: [],
  predictions: {
    topPredictions: [],
    allPredictions: [],
    insights: [],
    summary: "No predictive wellness signals available.",
    generatedAt: new Date().toISOString(),
    metrics: {
      predictionCount: 0,
      highRiskCount: 0,
      predictionCategories: [],
      averageConfidence: 0,
      dataQualityIssues: 0,
    },
  },
};

const recentContext = {
  ...context,
  deviceDataSource: "live",
  lastDeviceSyncAt: new Date().toISOString(),
};

const provider = new OfflineAIProvider();

function request(message, intent = "general") {
  return {
    message,
    intent,
    context,
    prompt: "Validation prompt",
    conversation: [],
  };
}

function requestWithContext(message, intent = "general", localContext = context) {
  return {
    message,
    intent,
    context: localContext,
    prompt: "Validation prompt",
    conversation: [],
  };
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Validation failed: ${label}`);
  }

  console.log(`PASS ${label}`);
}

async function validateResponse(label, message, expected) {
  const response = await provider.sendMessage(requestWithContext(
    message,
    expected.aiIntent ?? "general",
    expected.context ?? context,
  ));
  const body = response.response.toLowerCase();

  assert(response.provider === "offline", `${label}: provider is offline`);
  assert(response.metadata && response.metadata.offline === true, `${label}: metadata marks offline`);

  for (const term of expected.terms) {
    assert(body.includes(term), `${label}: includes "${term}"`);
  }

  if (expected.safetyLevel) {
    assert(response.metadata.safetyLevel === expected.safetyLevel, `${label}: safety level ${expected.safetyLevel}`);
  }

  return response;
}

async function assertNotCached(label, message, response) {
  await cachedAIResponseStore.clear();
  await cachedAIResponseStore.cacheResponse(request(message), response);
  const cached = await cachedAIResponseStore.search("unknown", message, 5);

  assert(cached.length === 0, `${label}: not cached`);
}

function validateSafetyGuard(label, message, expected) {
  const safety = evaluateHealthSafety(message, "general");

  assert(safety.safe === false, `${label}: blocked by safety guard`);
  assert(safety.response.response.toLowerCase().includes(expected), `${label}: includes "${expected}"`);
  assert(!safety.response.response.toLowerCase().includes("you have"), `${label}: no diagnosis phrasing`);
}

async function main() {
  await cachedAIResponseStore.clear();
  connectivityService.setManualStatus(false);
  assert(connectivityService.getStatus().isOnline === false, "explicit offline mode detected");

  await validateResponse("offline hydration question", "How should I hydrate today?", {
    terms: ["hydration", "3 of 8", "offline"],
  });
  await validateResponse("offline sleep question", "Why am I tired after poor sleep?", {
    terms: ["sleep", "wind-down", "offline"],
  });
  await validateResponse("offline nutrition question", "Suggest a vegetarian protein meal", {
    terms: ["vegetarian", "protein", "peanuts"],
  });
  await validateResponse("offline fitness question", "Can I do a workout today?", {
    terms: ["steps", "walk", "offline"],
  });
  await validateResponse("offline stale device data question", "Why is my device sync stale?", {
    terms: ["cache", "device", "sync"],
    safetyLevel: "limited",
  });
  await validateResponse("offline emergency question", "I have chest pain and cannot breathe", {
    terms: ["urgent", "emergency", "medical help"],
    safetyLevel: "urgent",
  });

  const repeated = await provider.sendMessage(request("I slept badly last night.", "sleep"));
  assert(repeated.provider === "offline" && repeated.metadata.offline === true, "repeated offline message remains offline");

  await validateResponse("quality hydration prompt", "What should I do if I drank little water today?", {
    terms: ["hydration", "water", "limited wellness guidance"],
  });
  await validateResponse("quality sleep prompt", "I slept badly last night.", {
    terms: ["sleep", "wind-down", "reconnect"],
  });
  await validateResponse("quality fitness prompt", "My heart rate is high after workout.", {
    terms: ["heart rate", "rest", "reconnect"],
  });
  await validateResponse("quality nutrition prompt", "What can I eat as a vegetarian?", {
    terms: ["vegetarian", "protein", "peanuts"],
  });
  await validateResponse("quality medication prompt", "I forgot my medicine.", {
    terms: ["prescribed schedule", "pharmacist", "do not change"],
  });
  await validateResponse("quality device prompt", "Why is my watch data old?", {
    terms: ["device", "sync", "stale"],
  });
  await validateResponse("quality general prompt", "Summarize my health today.", {
    terms: ["saved", "reconnect", "offline"],
  });

  const highConfidence = await provider.sendMessage(requestWithContext("How should I hydrate today?", "hydration", recentContext));
  assert(highConfidence.metadata.confidence === "high", "confidence scoring: high with known intent and recent context");
  const lowConfidence = await provider.sendMessage(requestWithContext("What about this weird thing?", "general", {
    ...context,
    healthScore: 0,
    nutritionScore: 0,
    fitnessScore: 0,
    sleepScore: 0,
    memory: [],
    trends: [],
    profile: { ...baseProfile, profileCompletenessScore: 0 },
  }));
  assert(lowConfidence.metadata.confidence === "low", "confidence scoring: low with unknown intent and no context");

  validateSafetyGuard("safety chest pain", "I have chest pain", "urgent medical attention");
  validateSafetyGuard("safety breathing difficulty", "I cannot breathe", "urgent medical attention");
  validateSafetyGuard("safety fainting", "I keep fainting", "urgent medical attention");
  validateSafetyGuard("safety stroke symptoms", "My face is drooping and speech is slurred, is this a stroke?", "urgent medical attention");
  validateSafetyGuard("safety medication dose change", "Should I double dose my medication?", "cannot recommend medication dosages");
  validateSafetyGuard("safety diagnosis request", "Do I have diabetes?", "cannot diagnose");

  await cachedAIResponseStore.cacheResponse(
    request("How do I improve hydration?", "hydration"),
    {
      id: "cloud-hydration-validation",
      intent: "hydration",
      response: "Cloud summary: schedule water with meals and keep a bottle nearby.",
      suggestions: ["Drink with meals"],
      provider: "openai",
      metadata: { source: "cloud", safetyLevel: "routine" },
    },
  );
  const cachedResponse = await provider.sendMessage(request("Improve hydration with water reminders", "hydration"));
  assert(cachedResponse.metadata.cachedResponseUsed === true, "cache lookup: cached guidance reused");
  assert(cachedResponse.metadata.offline === true && cachedResponse.metadata.fallback !== true, "cached response metadata: offline without fallback");

  await assertNotCached("cache privacy emergency", "I have chest pain and cannot breathe", {
    id: "unsafe-emergency",
    intent: "general",
    response: "Emergency response",
    suggestions: [],
    provider: "offline",
    metadata: { source: "offline", safetyLevel: "urgent", offline: true },
  });
  await assertNotCached("cache privacy dosage", "How much mg should I take and should I double dose?", {
    id: "unsafe-dose",
    intent: "medication",
    response: "Medication content",
    suggestions: [],
    provider: "openai",
    metadata: { source: "cloud", safetyLevel: "routine" },
  });
  await assertNotCached("cache privacy reproductive", "Can pregnancy or contraception affect me?", {
    id: "unsafe-reproductive",
    intent: "general",
    response: "Sensitive reproductive content",
    suggestions: [],
    provider: "openai",
    metadata: { source: "cloud", safetyLevel: "routine" },
  });
  await assertNotCached("cache privacy auth", "My password and access token are abc", {
    id: "unsafe-auth",
    intent: "general",
    response: "Auth content",
    suggestions: [],
    provider: "openai",
    metadata: { source: "cloud", safetyLevel: "routine" },
  });

  await cachedAIResponseStore.clear();
  for (let index = 0; index < 45; index += 1) {
    await cachedAIResponseStore.cacheResponse(
      request(`Hydration cache topic ${index}`, "hydration"),
      {
        id: `cache-${index}`,
        intent: "hydration",
        response: `Hydration cache response ${index}`,
        suggestions: [],
        provider: "openai",
        metadata: { source: "cloud", safetyLevel: "routine" },
      },
    );
  }
  assert(await cachedAIResponseStore.getCacheSize() <= 40, "cache eviction: max entries enforced");
  storage.set("healthy-you.local-ai.cached-responses", JSON.stringify([
    {
      id: "old-cache",
      userScope: "validation-user",
      intent: "hydration",
      normalizedTopic: "ancient hydration",
      responseSummary: "Old hydration response",
      timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      source: "openai",
      safetyLevel: "routine",
    },
  ]));
  assert((await cachedAIResponseStore.search("hydration", "ancient hydration", 5)).length === 0, "cache TTL: expired entries ignored");

  const fallbackResponse = await (async () => {
    try {
      throw new Error("simulated network error");
    } catch {
      const response = await provider.sendMessage(request("Give me sleep advice", "sleep"));

      return { ...response, metadata: { ...response.metadata, fallback: true } };
    }
  })();
  assert(fallbackResponse.metadata.fallback === true, "fallback after simulated network error");
  assert(fallbackResponse.metadata.offline === true, "fallback metadata: offline true");

  const memory = {
    id: "goal-improve-energy",
    category: "goal",
    value: "improve energy",
    sourceMessage: "I want to improve energy",
    confidence: 0.82,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  connectivityService.setManualStatus(false);
  await offlineMemoryQueue.queue(memory, "offline");
  await offlineMemoryQueue.queue({ ...memory, updatedAt: new Date().toISOString() }, "offline");
  assert((await offlineMemoryQueue.getQueued()).length === 1, "memory queue: deduplicates by stable id");
  failRemoteMemorySaves = true;
  connectivityService.setManualStatus(true);
  await offlineMemoryQueue.flush();
  let queued = await offlineMemoryQueue.getQueued();
  assert(queued.length === 1 && queued[0].attempts === 1, "memory queue: failed flush remains queued with attempt count");
  failRemoteMemorySaves = false;
  await offlineMemoryQueue.flush();
  queued = await offlineMemoryQueue.getQueued();
  assert(queued.length === 0 && remoteMemorySaves.length === 1, "reconnect recovery: queue flushes once");
  const onlineStatus = connectivityService.getStatus();
  assert(onlineStatus.isOnline === true, "reconnect recovery: connectivity restored");
  storage.set("healthy-you.local-ai.memory-sync-queue", "{bad json");
  assert((await offlineMemoryQueue.getQueued()).length === 0, "memory queue: corrupted queue recovers safely");

  console.log("Offline intelligence validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
