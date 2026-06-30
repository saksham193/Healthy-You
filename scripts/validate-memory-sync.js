const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const databasePath = path.join(root, "backend", "data", "memory-sync-validation.sqlite");

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = databasePath;
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_ACCESS_SECRET = "memory-sync-validation-access-secret-minimum-32";
process.env.JWT_REFRESH_SECRET = "memory-sync-validation-refresh-secret-minimum-32";
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
      name: `Memory ${label}`,
      email: `phase2c-${label}-${Date.now()}@example.com`,
      password: "Password123!",
    },
  });

  assert(response.status === 201, `${label}: register succeeds`);

  return response.body.data;
}

const createMemory = (overrides = {}) => ({
  id: "goal-walk-daily",
  category: "goal",
  value: "walk daily",
  sourceMessage: "I want to walk daily",
  confidence: 0.9,
  createdAt: "2026-06-29T08:00:00.000Z",
  updatedAt: "2026-06-29T08:00:00.000Z",
  content: "walk daily",
  summary: "User wants to walk daily",
  type: "goal",
  source: "conversation",
  importance: 90,
  metadata: { device: "A" },
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

    const created = await request(baseUrl, "POST", "/memories", {
      token: firstToken,
      body: createMemory(),
    });
    assert(created.status === 201, "create memory succeeds");
    assert(created.body?.data?.id === "goal-walk-daily", "create memory preserves stable id");
    assert(created.body?.data?.metadata?.device === "A", "create memory preserves metadata");

    const fetched = await request(baseUrl, "GET", "/memories", { token: firstToken });
    assert(fetched.status === 200, "fetch memories succeeds");
    assert(fetched.body?.data?.length === 1, "fetch memories returns saved memory");

    const duplicate = await request(baseUrl, "POST", "/memories", {
      token: firstToken,
      body: createMemory({
        id: "different-id-same-memory",
        updatedAt: "2026-06-29T08:05:00.000Z",
        metadata: { device: "B" },
      }),
    });
    assert(duplicate.status === 201, "duplicate semantic memory save succeeds");
    assert(duplicate.body?.data?.id === "goal-walk-daily", "duplicate semantic memory returns canonical id");

    const afterDuplicate = await request(baseUrl, "GET", "/memories", { token: firstToken });
    assert(afterDuplicate.body?.data?.length === 1, "duplicate prevention avoids extra cloud rows");
    assert(afterDuplicate.body?.data?.[0]?.metadata?.device === "B", "duplicate save merges newer metadata");

    const newer = await request(baseUrl, "POST", "/memories", {
      token: firstToken,
      body: createMemory({
        value: "walk daily",
        sourceMessage: "I want to walk daily after dinner",
        updatedAt: "2026-06-29T09:00:00.000Z",
        metadata: { device: "B", mood: "motivated" },
      }),
    });
    assert(newer.status === 201, "newer memory update succeeds");
    assert(newer.body?.data?.sourceMessage.includes("after dinner"), "newer update wins");

    const stale = await request(baseUrl, "POST", "/memories", {
      token: firstToken,
      body: createMemory({
        sourceMessage: "stale source",
        updatedAt: "2026-06-29T07:00:00.000Z",
        metadata: { stale: true },
      }),
    });
    assert(stale.status === 201, "stale memory update does not fail hard");
    assert(stale.body?.data?.updatedAt === "2026-06-29T09:00:00.000Z", "stale update does not overwrite newer record");
    assert(stale.body?.data?.metadata?.mood === "motivated", "stale update preserves existing metadata");

    const isolatedSecondUser = await request(baseUrl, "GET", "/memories", { token: secondToken });
    assert(isolatedSecondUser.status === 200, "second user memory fetch succeeds");
    assert(isolatedSecondUser.body?.data?.length === 0, "second user cannot read first user's memories");

    const unauthenticated = await request(baseUrl, "GET", "/memories");
    assert(unauthenticated.status === 401, "unauthenticated memory request rejected");

    const malformed = await request(baseUrl, "POST", "/memories", {
      token: firstToken,
      body: createMemory({ confidence: 2, updatedAt: "not-a-date" }),
    });
    assert(malformed.status === 400, "malformed memory rejected");
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

    if (requestName.includes("api/MemoryApi")) {
      return {
        fetchMemories: async () => Array.from(remote.values()),
        saveMemory: async (memory) => {
          remote.set(memory.id, memory);

          return memory;
        },
        deleteMemory: async (id) => {
          remote.delete(id);
        },
      };
    }

    if (requestName.includes("observability/OfflineAnalytics")) {
      return {
        offlineAnalytics: {
          trackMemoryQueue: () => undefined,
          trackReconnectSuccess: () => undefined,
        },
      };
    }

    return originalLoad.call(this, requestName, parent, isMain);
  };

  try {
    const { connectivityService } = require(path.join(root, "src/services/connectivity/ConnectivityService"));
    const {
      mergeLocalAndRemoteMemories,
      offlineMemoryQueue,
    } = require(path.join(root, "src/services/local-ai/OfflineMemoryQueue"));
    const { isCloudSafeMemory } = require(path.join(root, "src/services/ai/memory/MemoryPrivacy"));

    await offlineMemoryQueue.clearQueue();
    connectivityService.setManualStatus(false);

    const offlineMemory = createMemory({
      id: "dietary-preference-vegetarian",
      category: "dietary_preference",
      value: "vegetarian",
      sourceMessage: "I am vegetarian",
    });
    await offlineMemoryQueue.queueMemoryWrites(offlineMemory);
    assert((await offlineMemoryQueue.getQueued()).length === 1, "offline queued write stored");

    await offlineMemoryQueue.queueMemoryWrites({
      ...offlineMemory,
      updatedAt: "2026-06-29T08:10:00.000Z",
    });
    assert((await offlineMemoryQueue.getQueued()).length === 1, "offline queue deduplicates stable id");

    const sensitiveMemory = createMemory({
      id: "sensitive-emergency",
      category: "health_concern",
      value: "chest pain",
      sourceMessage: "I have chest pain and cannot breathe",
      metadata: { safetyLevel: "urgent" },
    });
    assert(!isCloudSafeMemory(sensitiveMemory), "safety-filtered memory identified");
    await offlineMemoryQueue.queueMemoryWrites(sensitiveMemory);
    assert((await offlineMemoryQueue.getQueued()).length === 1, "safety-filtered memory excluded from cloud queue");

    connectivityService.setManualStatus(true);
    await offlineMemoryQueue.flushQueuedMemoryWrites();
    assert((await offlineMemoryQueue.getQueued()).length === 0, "queue flush clears successful writes");
    assert(remote.has(offlineMemory.id), "queue flush writes memory to cloud API");

    const merged = mergeLocalAndRemoteMemories(
      [
        createMemory({
          id: "same-id",
          value: "sleep earlier",
          sourceMessage: "I want to sleep earlier",
          updatedAt: "2026-06-29T08:00:00.000Z",
          metadata: { local: true },
        }),
      ],
      [
        createMemory({
          id: "same-id",
          value: "sleep earlier",
          sourceMessage: "I want to sleep earlier around 10pm",
          updatedAt: "2026-06-29T09:00:00.000Z",
          metadata: { remote: true },
        }),
      ],
    );
    assert(merged.length === 1, "merge behavior deduplicates same id");
    assert(merged[0].sourceMessage.includes("10pm"), "merge behavior newer updatedAt wins");
    assert(merged[0].metadata.local === true && merged[0].metadata.remote === true, "merge behavior combines metadata");

    const source = fs.readFileSync(path.join(root, "src/services/local-ai/OfflineMemoryQueue.ts"), "utf8");
    assert(source.includes("MAX_QUEUE_ITEMS = 50"), "memory queue is capped");
    assert(!source.includes("accessToken") && !source.includes("refreshToken"), "memory queue does not store auth tokens");
  } finally {
    Module._load = originalLoad;
  }
}

async function main() {
  await validateBackend();
  await validateMobileSync();
  console.log("Memory sync validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
