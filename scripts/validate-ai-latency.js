const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

process.env.EXPO_PUBLIC_AI_PROVIDER_TIMEOUT_MS = "50";
process.env.NODE_ENV = "test";

const storage = new Map();
const originalLoad = Module._load;
const counters = {
  aiProviderCalls: 0,
  memoryFetches: 0,
  memorySaves: 0,
  profileSyncs: 0,
  healthSyncs: 0,
};
let asyncStorageSetDelayMs = 0;
let asyncStorageSetFails = false;
let aiProviderMode = "success";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "@react-native-async-storage/async-storage") {
    return {
      __esModule: true,
      default: {
        getItem: async (key) => storage.get(key) ?? null,
        setItem: async (key, value) => {
          if (asyncStorageSetDelayMs > 0) {
            await wait(asyncStorageSetDelayMs);
          }
          if (asyncStorageSetFails) {
            throw new Error("simulated async storage write failure");
          }
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
          listener({ isConnected: true, isInternetReachable: true });

          return () => undefined;
        },
        fetch: async () => ({ isConnected: true, isInternetReachable: true }),
      },
    };
  }

  if (request === "react-native") {
    return {
      Platform: { OS: "android" },
      Alert: { alert: () => undefined },
    };
  }

  if (request.includes("store/authStore")) {
    return {
      useAuthStore: {
        getState: () => ({ user: { id: "latency-user", email: "latency@example.com" } }),
      },
    };
  }

  if (request.includes("api/AIApi")) {
    return {
      sendAIRequest: async (aiRequest) => {
        counters.aiProviderCalls += 1;
        if (aiProviderMode === "timeout") {
          return new Promise(() => undefined);
        }

        return {
          id: "cloud-latency-validation",
          intent: aiRequest.intent,
          response: "Cloud wellness response.",
          suggestions: ["Keep one small wellness action today."],
          provider: "openai",
          metadata: { source: "cloud", safetyLevel: "routine" },
        };
      },
    };
  }

  if (request.includes("api/MemoryApi")) {
    return {
      fetchMemories: async () => {
        counters.memoryFetches += 1;
        return new Promise(() => undefined);
      },
      saveMemory: async (memory) => {
        counters.memorySaves += 1;
        throw new Error("simulated remote memory save failure");
      },
      deleteMemory: async () => undefined,
    };
  }

  if (request.includes("api/ProfileApi")) {
    return {
      syncProfile: async () => {
        counters.profileSyncs += 1;
        return undefined;
      },
    };
  }

  if (request.includes("services/devices/deviceService")) {
    return {
      getConnectedDevices: async () => ({ data: [] }),
      startPeriodicHealthSync: () => undefined,
      syncHealthData: async () => {
        counters.healthSyncs += 1;
        return { data: null };
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
const { sendMessage } = require(path.join(root, "src/services/ai/aiService"));
const { useHealthStore } = require(path.join(root, "src/store/healthStore"));

const now = new Date().toISOString();

function seedHealthStore() {
  useHealthStore.setState({
    healthScore: { score: 82, status: "Good", change: "+2" },
    nutrition: {
      summary: {
        score: 76,
        scoreLabel: "Good",
        caloriesConsumed: 1600,
        calorieGoal: 2200,
        caloriesRemaining: 600,
        waterGlasses: 6,
        waterGoal: 8,
        waterGoalAchieved: false,
      },
      macros: [],
      meals: [],
      insights: [],
      actions: [],
    },
    fitness: {
      summary: {
        score: 79,
        scoreLabel: "Good",
        weeklyActivityMinutes: 210,
        weeklyTrend: "Stable",
        caloriesBurned: 530,
        calorieGoal: 700,
        caloriesRemaining: 170,
        workoutProgress: 70,
        workoutsCompleted: 3,
        workoutsTotal: 4,
        height: "170 cm",
        weight: "70 kg",
        bmi: 24.2,
        bmiStatus: "Healthy Weight",
        steps: 8500,
        stepGoal: 10000,
        stepProgress: 85,
      },
      weeklyActivity: [{ day: "Today", minutes: 42 }],
      workoutPlans: [],
      exerciseCategories: [],
      recoveryInsights: [],
      actions: [],
    },
    sleep: {
      insights: [],
      schedule: {
        bedtime: "10:30 PM",
        wakeTime: "6:30 AM",
        goalHours: 8,
        plannedHours: 7,
        progressPercent: 72,
      },
    },
    schedule: {
      summary: { completedTasks: 0, totalTasks: 0, remainingTasks: 0, completionPercent: 100, waterGlasses: 6, waterGoal: 8 },
      timelineEvents: [],
      medications: [],
      appointments: [],
      habits: [],
      sleepSchedule: {
        bedtime: "10:30 PM",
        wakeTime: "6:30 AM",
        goalHours: 8,
        plannedHours: 7,
        progressPercent: 72,
      },
      adherenceData: { labels: [], values: [] },
      actions: [],
    },
    profile: {
      summary: { name: "Latency User", age: 34, gender: "female", bloodGroup: "O+", healthScore: 82, healthStatus: "Good", monthlyChange: "+2" },
      bodyMetrics: [],
      vitalMetrics: [],
      healthGoals: [],
      medicalInfo: [],
      emergencyContacts: [],
      achievements: [],
      actions: [],
    },
    vitals: {
      healthSummaries: [],
      homeFeatures: [],
      bodyMetrics: [],
      vitalMetrics: [{ id: "heart-rate", title: "Heart Rate", value: "72 bpm", subtitle: "Latest", iconName: "heart-outline", tone: "primary" }],
      bloodPressurePoints: [],
      glucosePoints: [],
      labels: [],
    },
    devices: [{
      id: "health-connect",
      name: "Health Connect",
      detail: "Android Health Connect",
      status: "Connected",
      iconName: "fitness-outline",
      provider: "Health Connect",
      lastSyncedAt: now,
      syncStatus: "synced",
    }],
    deviceSyncStatus: "synced",
    deviceDataSource: "live",
    deviceDataStale: false,
    lastHealthSyncAt: now,
    deviceSyncError: null,
    loading: false,
    error: null,
  });
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
  seedHealthStore();

  process.env.EXPO_PUBLIC_AI_PROVIDER = "openai";
  aiProviderMode = "timeout";
  let before = { ...counters };
  const direct = await timed("direct metric", () => sendMessage("How many steps do I have today?"));
  assert(direct.elapsedMs < 500, "direct metric: completes under latency threshold");
  assert(/8,500 steps/i.test(direct.value.response), "direct metric: answers with steps");
  assert(counters.aiProviderCalls === before.aiProviderCalls, "direct metric: does not call provider");
  assert(counters.memoryFetches === before.memoryFetches, "direct metric: does not fetch remote memory");
  assert(counters.healthSyncs === before.healthSyncs, "direct metric: does not trigger Health Connect sync");

  asyncStorageSetDelayMs = 1500;
  asyncStorageSetFails = true;
  process.env.EXPO_PUBLIC_AI_PROVIDER = "mock";
  const backgroundFailure = await timed("background memory write failure", () => sendMessage("I want to improve energy"));
  assert(backgroundFailure.elapsedMs < 500, "memory/session save failure: does not delay response");
  asyncStorageSetDelayMs = 0;
  asyncStorageSetFails = false;

  process.env.EXPO_PUBLIC_AI_PROVIDER = "openai";
  aiProviderMode = "timeout";
  before = { ...counters };
  const fallback = await timed("provider timeout fallback", () => sendMessage("Give me a general wellness tip"));
  assert(fallback.elapsedMs < 1000, "backend timeout: falls back within configured timeout");
  assert(counters.aiProviderCalls === before.aiProviderCalls + 1, "backend timeout: provider attempted once");
  assert(fallback.value.provider === "offline", "backend timeout: offline fallback returned");
  assert(fallback.value.metadata?.fallback === true, "backend timeout: fallback metadata set");

  before = { ...counters };
  const urgent = await timed("urgent safety", () => sendMessage("I have chest pain and cannot breathe"));
  assert(urgent.elapsedMs < 500, "urgent safety: returns immediately");
  assert(/urgent medical attention/i.test(urgent.value.response), "urgent safety: protected response");
  assert(counters.aiProviderCalls === before.aiProviderCalls, "urgent safety: does not call provider");

  assert(counters.healthSyncs === 0, "Health Connect sync is not triggered by chat messages");

  console.log("AI latency validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
