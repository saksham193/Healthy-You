const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const databasePath = path.join(root, "backend", "data", "cloud-profile-sync-validation.sqlite");

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = databasePath;
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_ACCESS_SECRET = "cloud-profile-validation-access-secret-minimum-32";
process.env.JWT_REFRESH_SECRET = "cloud-profile-validation-refresh-secret-minimum-32";
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
      name: `Profile ${label}`,
      email: `phase2b-${label}-${Date.now()}@example.com`,
      password: "Password123!",
    },
  });

  assert(response.status === 201, `${label}: register succeeds`);
  assert(Boolean(response.body?.data?.tokens?.accessToken), `${label}: receives access token`);

  return response.body.data;
}

function assertMobileQueueImplementation() {
  const source = fs.readFileSync(path.join(root, "src/services/profile/ProfileCloudSync.ts"), "utf8");
  const healthStoreSource = fs.readFileSync(path.join(root, "src/store/healthStore.ts"), "utf8");

  assert(source.includes("@react-native-async-storage/async-storage"), "mobile queue uses AsyncStorage");
  assert(source.includes("queueProfileUpdateWhenOffline"), "mobile queue function exists");
  assert(source.includes("flushQueuedProfileUpdates"), "mobile flush function exists");
  assert(source.includes("reconcileProfiles"), "mobile conflict resolver exists");
  assert(source.includes("QUEUE_LIMIT = 10"), "mobile queue is capped");
  assert(!source.includes("accessToken") && !source.includes("refreshToken"), "mobile queue does not store auth tokens");
  assert(healthStoreSource.includes("syncProfileToCloud"), "health store exposes cloud sync action");
}

async function main() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const firstUser = await register(baseUrl, "user-one");
    const secondUser = await register(baseUrl, "user-two");
    const firstToken = firstUser.tokens.accessToken;
    const secondToken = secondUser.tokens.accessToken;

    const emptyProfile = await request(baseUrl, "GET", "/profile", { token: firstToken });
    assert(emptyProfile.status === 200, "GET /profile succeeds for authenticated user");
    assert(emptyProfile.body?.data === null, "GET /profile handles empty profile");

    const firstUpdatedAt = "2026-06-29T08:00:00.000Z";
    const profile = {
      name: "Profile User",
      email: firstUser.user.email,
      demographics: { age: 34, gender: "female" },
      bodyMetrics: { height: 168, weight: 62 },
      goals: ["Improve sleep"],
      allergies: ["Peanuts"],
      chronicConditions: ["Asthma"],
      medications: ["Inhaler"],
      dietaryPreferences: ["Vegetarian"],
      profileCompletenessScore: 82,
      updatedAt: firstUpdatedAt,
      source: "manual",
    };

    const putProfile = await request(baseUrl, "PUT", "/profile", {
      token: firstToken,
      body: { profile, updatedAt: firstUpdatedAt },
    });
    assert(putProfile.status === 200, "PUT /profile succeeds");
    assert(putProfile.body?.data?.profile?.name === profile.name, "PUT /profile returns structured profile");
    assert(putProfile.body?.data?.updatedAt === firstUpdatedAt, "PUT /profile returns updatedAt");

    const roundTrip = await request(baseUrl, "GET", "/profile", { token: firstToken });
    assert(roundTrip.status === 200, "GET /profile after PUT succeeds");
    assert(roundTrip.body?.data?.profile?.allergies?.[0] === "Peanuts", "GET /profile round trips arrays");

    const newerUpdatedAt = "2026-06-29T09:00:00.000Z";
    const newerProfile = {
      ...profile,
      goals: ["Improve sleep", "Walk daily"],
      updatedAt: newerUpdatedAt,
      profileCompletenessScore: 90,
    };
    const newerPut = await request(baseUrl, "PUT", "/profile", {
      token: firstToken,
      body: { profile: newerProfile, updatedAt: newerUpdatedAt },
    });
    assert(newerPut.status === 200, "newer PUT succeeds");
    assert(newerPut.body?.data?.profile?.goals?.length === 2, "newer PUT updates profile");

    const stalePut = await request(baseUrl, "PUT", "/profile", {
      token: firstToken,
      body: {
        profile: {
          ...profile,
          goals: ["Stale goal"],
          updatedAt: firstUpdatedAt,
          profileCompletenessScore: 10,
        },
        updatedAt: firstUpdatedAt,
      },
    });
    assert(stalePut.status === 200, "older PUT does not fail hard");
    assert(stalePut.body?.data?.updatedAt === newerUpdatedAt, "older PUT returns current newer profile");
    assert(stalePut.body?.data?.profile?.goals?.includes("Walk daily"), "older PUT does not overwrite newer profile");

    const isolatedSecondUserProfile = await request(baseUrl, "GET", "/profile", { token: secondToken });
    assert(isolatedSecondUserProfile.status === 200, "second user profile request succeeds");
    assert(isolatedSecondUserProfile.body?.data === null, "second user cannot read first user's profile");

    const unauthenticated = await request(baseUrl, "GET", "/profile");
    assert(unauthenticated.status === 401, "unauthenticated profile request rejected");

    const malformed = await request(baseUrl, "PUT", "/profile", {
      token: firstToken,
      body: {
        profile: { demographics: { age: -1 } },
        updatedAt: "not-a-date",
      },
    });
    assert(malformed.status === 400, "malformed profile rejected");

    assertMobileQueueImplementation();

    console.log("Cloud profile sync validation completed.");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    database.close();
    cleanupDatabaseFiles();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
