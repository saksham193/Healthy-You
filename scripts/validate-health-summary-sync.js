const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const databasePath = path.join(root, "backend", "data", "health-summary-sync-validation.sqlite");

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = databasePath;
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_ACCESS_SECRET = "health-summary-validation-access-secret-minimum-32";
process.env.JWT_REFRESH_SECRET = "health-summary-validation-refresh-secret-minimum-32";
process.env.ACCESS_TOKEN_TTL = "15m";
process.env.REFRESH_TOKEN_TTL = "30d";
process.env.CORS_ORIGIN = "*";

function cleanupDatabaseFiles() {
  for (const suffix of ["", "-wal", "-shm"]) {
    const target = `${databasePath}${suffix}`;

    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }
  }
}

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

cleanupDatabaseFiles();

const { app } = require(path.join(root, "backend/src/app"));
const { database } = require(path.join(root, "backend/src/database/connection"));

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Validation failed: ${label}`);
  }

  console.log(`PASS ${label}`);
}

async function request(baseUrl, method, route, options = {}) {
  const headers = { Accept: "application/json" };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return { body, status: response.status };
}

async function register(baseUrl, label) {
  const response = await request(baseUrl, "POST", "/auth/register", {
    body: {
      name: `Summary ${label}`,
      email: `phase2d-${label}-${Date.now()}@example.com`,
      password: "Password123!",
    },
  });

  assert(response.status === 201, `${label}: register succeeds`);

  return response.body.data;
}

const createSummary = (overrides = {}) => ({
  id: "summary_2026-06-29_daily",
  date: "2026-06-29",
  source: "health_connect",
  deviceSource: "live",
  displaySource: "Live Device Summary",
  summaryType: "daily",
  metrics: {
    steps: 1446,
    caloriesBurned: 61,
    activeMinutes: 22,
    sleepMinutes: 240,
    hydrationMl: 1200,
    heartRateAvg: 78,
  },
  scores: {
    healthScore: 82,
    sleepScore: 70,
    fitnessScore: 75,
  },
  syncMetadata: {
    lastDeviceSyncAt: "2026-06-29T08:00:00.000Z",
    provider: "Health Connect",
    status: "live",
  },
  updatedAt: "2026-06-29T08:00:00.000Z",
  ...overrides,
});

async function validateBackend() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const firstUser = await register(baseUrl, "user-one");
    const secondUser = await register(baseUrl, "user-two");
    const firstToken = firstUser.tokens.accessToken;
    const secondToken = secondUser.tokens.accessToken;

    const unauthenticated = await request(baseUrl, "GET", "/sync/health-summary");
    assert(unauthenticated.status === 401, "unauthenticated summary route rejected");

    const created = await request(baseUrl, "POST", "/sync/health-summary", {
      token: firstToken,
      body: createSummary(),
    });
    assert(created.status === 201, "POST health summary succeeds");
    assert(created.body?.data?.metrics?.steps === 1446, "POST returns aggregate metrics");

    const fetched = await request(baseUrl, "GET", "/sync/health-summary", { token: firstToken });
    assert(fetched.status === 200, "GET health summaries succeeds");
    assert(fetched.body?.data?.length === 1, "GET returns saved summary");

    const secondUserFetch = await request(baseUrl, "GET", "/sync/health-summary", { token: secondToken });
    assert(secondUserFetch.status === 200, "second user summary request succeeds");
    assert(secondUserFetch.body?.data?.length === 0, "second user isolation validated");

    const newer = await request(baseUrl, "POST", "/sync/health-summary", {
      token: firstToken,
      body: createSummary({
        metrics: { ...createSummary().metrics, steps: 2500 },
        updatedAt: "2026-06-29T09:00:00.000Z",
      }),
    });
    assert(newer.status === 201, "newer update succeeds");
    assert(newer.body?.data?.metrics?.steps === 2500, "newer update overwrites older summary");

    const stale = await request(baseUrl, "POST", "/sync/health-summary", {
      token: firstToken,
      body: createSummary({
        metrics: { ...createSummary().metrics, steps: 10 },
        updatedAt: "2026-06-29T07:00:00.000Z",
      }),
    });
    assert(stale.status === 201, "stale update does not fail hard");
    assert(stale.body?.data?.metrics?.steps === 2500, "stale update does not overwrite newer summary");

    const malformed = await request(baseUrl, "POST", "/sync/health-summary", {
      token: firstToken,
      body: createSummary({
        metrics: { steps: -1 },
        updatedAt: "not-a-date",
      }),
    });
    assert(malformed.status === 400, "malformed summary rejected");

    const rawPayload = await request(baseUrl, "POST", "/sync/health-summary", {
      token: firstToken,
      body: {
        ...createSummary({ updatedAt: "2026-06-29T10:00:00.000Z" }),
        rawHeartRateRecords: [{ at: "2026-06-29T08:00:00.000Z", bpm: 80 }],
      },
    });
    assert(rawPayload.status === 400, "raw high-frequency payload rejected");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    database.close();
    cleanupDatabaseFiles();
  }
}

async function validateMobileSync() {
  const storage = new Map();
  const remote = new Map();
  const originalLoad = Module._load;

  Module._load = function patchedLoad(requestName, parent, isMain) {
    if (requestName === "@react-native-async-storage/async-storage") {
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

    if (requestName === "@react-native-community/netinfo") {
      return {
        __esModule: true,
        default: {
          addEventListener: () => () => undefined,
          fetch: async () => ({ isConnected: true, isInternetReachable: true }),
        },
      };
    }

    if (requestName.includes("secure/TokenStorage")) {
      return {
        getStoredTokens: async () => ({ accessToken: "access", refreshToken: "refresh" }),
        saveStoredTokens: async () => undefined,
        clearStoredTokens: async () => undefined,
      };
    }

    if (requestName.includes("api/HealthSummaryApi")) {
      return {
        fetchHealthSummaries: async () => Array.from(remote.values()),
        saveHealthSummary: async (summary) => {
          remote.set(`${summary.date}:${summary.summaryType}`, summary);

          return summary;
        },
        deleteHealthSummary: async () => undefined,
      };
    }

    return originalLoad.call(this, requestName, parent, isMain);
  };

  try {
    const { connectivityService } = require(path.join(root, "src/services/connectivity/ConnectivityService"));
    const {
      backupHealthSummaryToCloud,
      buildHealthSummaryBackup,
      flushQueuedHealthSummaryBackups,
      loadHealthSummariesFromCloud,
      mergeLocalAndRemoteHealthSummaries,
      queueHealthSummaryBackup,
    } = require(path.join(root, "src/services/health/HealthSummaryCloudSync"));

    const built = buildHealthSummaryBackup({
      healthScore: { score: 82, status: "Good", change: "+2" },
      fitness: {
        summary: {
          score: 75,
          scoreLabel: "Good",
          weeklyActivityMinutes: 120,
          weeklyTrend: "Stable",
          caloriesBurned: 61,
          calorieGoal: 700,
          caloriesRemaining: 639,
          workoutProgress: 50,
          workoutsCompleted: 1,
          workoutsTotal: 4,
          height: "170 cm",
          weight: "70 kg",
          bmi: 24.2,
          bmiStatus: "Healthy",
          steps: 1446,
          stepGoal: 10000,
          stepProgress: 14,
        },
        weeklyActivity: [{ day: "Today", minutes: 22 }],
        workoutPlans: [],
        exerciseCategories: [],
        recoveryInsights: [],
        actions: [],
      },
      nutrition: {
        summary: {
          score: 80,
          scoreLabel: "Good",
          caloriesConsumed: 1500,
          calorieGoal: 2200,
          caloriesRemaining: 700,
          waterGlasses: 5,
          waterGoal: 8,
          waterGoalAchieved: false,
        },
        macros: [],
        meals: [],
        insights: [],
        actions: [],
      },
      sleep: {
        insights: [],
        schedule: {
          bedtime: "10:30 PM",
          wakeTime: "6:30 AM",
          goalHours: 8,
          plannedHours: 4,
          progressPercent: 50,
        },
      },
      schedule: null,
      deviceMetrics: {
        providerId: "health-connect",
        providerName: "Health Connect",
        source: "live",
        sourcePlatform: "android",
        permissionStatus: "granted",
        syncStatus: "synced",
        syncedAt: "2026-06-29T08:00:00.000Z",
        steps: 1446,
        caloriesKcal: 61,
        heartRateBpm: 78,
        sleepMinutes: 240,
        hydrationMl: 1200,
        exerciseMinutes: 22,
      },
      lastHealthSyncAt: "2026-06-29T08:00:00.000Z",
    });
    assert(Boolean(built), "mobile builds aggregate summary");
    assert(!("rawHeartRateRecords" in built), "mobile summary excludes raw high-frequency records");

    connectivityService.setManualStatus(false);
    await queueHealthSummaryBackup(built);
    await queueHealthSummaryBackup({ ...built, updatedAt: "2026-06-29T08:30:00.000Z" });
    let queuedRaw = Array.from(storage.values()).find((value) => String(value).includes("summary_"));
    assert(String(queuedRaw).includes("1446"), "offline queued summary stored");
    assert(!String(queuedRaw).includes("accessToken") && !String(queuedRaw).includes("refreshToken"), "offline queue stores no tokens");

    connectivityService.setManualStatus(true);
    const flushed = await flushQueuedHealthSummaryBackups();
    assert(flushed.queuedCount === 0, "queued summary flushes");
    assert(remote.size === 1, "queued summary dedupes by date and type");

    await backupHealthSummaryToCloud({ ...built, updatedAt: "2026-06-29T09:00:00.000Z" });
    assert(remote.size === 1, "cloud backup upserts same daily summary");

    const remoteSummary = {
      ...built,
      id: "remote_summary",
      deviceSource: "live",
      displaySource: "Live Device Summary",
      updatedAt: "2026-06-29T10:00:00.000Z",
    };
    remote.set(`${remoteSummary.date}:${remoteSummary.summaryType}`, remoteSummary);
    const loaded = await loadHealthSummariesFromCloud();
    assert(loaded.latestSummary?.displaySource === "Cloud Summary", "remote summary marked as cloud summary");
    assert(loaded.latestSummary?.deviceSource === "cloud_summary", "remote summary does not masquerade as live data");

    const merged = mergeLocalAndRemoteHealthSummaries(
      [{ ...built, updatedAt: "2026-06-29T11:00:00.000Z", metrics: { ...built.metrics, steps: 3000 } }],
      [{ ...built, updatedAt: "2026-06-29T10:00:00.000Z", metrics: { ...built.metrics, steps: 100 } }],
    );
    assert(merged.length === 1, "merge dedupes by date and summary type");
    assert(merged[0].metrics.steps === 3000, "merge keeps newer local summary over older remote");
  } finally {
    Module._load = originalLoad;
  }
}

async function main() {
  await validateBackend();
  await validateMobileSync();
  console.log("Health summary sync validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
