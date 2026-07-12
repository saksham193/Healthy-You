const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const http = require("node:http");

const tempDir = mkdtempSync(join(tmpdir(), "healthy-you-ai-context-"));
const databasePath = join(tempDir, "ai-context-smoke.sqlite");

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_SECRET = "ai-context-smoke-secret-change-before-production";
process.env.OPENAI_API_KEY = "";
process.env.AI_PROVIDER = "mock";
process.env.AI_FALLBACK_PROVIDER = "mock";
process.env.AI_SAFETY_GUARD_ENABLED = "true";
process.env.AI_PROVIDER_TIMEOUT_MS = "15000";
process.env.OLLAMA_BASE_URL = "http://localhost:11434";
process.env.OLLAMA_MODEL = "llama3.1";
process.env.CORS_ORIGIN = "*";
process.env.RATE_LIMIT_ENABLED = "true";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_DEFAULT_MAX = "100";
process.env.RATE_LIMIT_AI_MAX = "20";
process.env.RATE_LIMIT_SYNC_MAX = "100";
process.env.RATE_LIMIT_EXPORT_DELETE_MAX = "100";
process.env.RATE_LIMIT_AUTH_MAX = "10";
process.env.REQUEST_BODY_LIMIT_JSON = "12kb";
process.env.REQUEST_BODY_LIMIT_AI_IMAGE = "2mb";
process.env.LOG_LEVEL = "error";

const { app } = require("../backend/dist/app");

const server = http.createServer(app);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const requestJson = async (baseUrl, method, path, body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    status: response.status,
    json,
    requestId: response.headers.get("x-request-id"),
  };
};

const assertNoSensitiveExposure = (value) => {
  const serialized = JSON.stringify(value ?? {}).toLowerCase();

  [
    "authorization",
    "bearer",
    "api_key",
    "openai_api_key",
    "jwt",
    "secret",
    "sk-",
    databasePath.toLowerCase(),
    "private context marker",
    "stack",
  ].forEach((term) => {
    assert(!serialized.includes(term), `AI context smoke response exposed sensitive term: ${term}`);
  });
};

const buildContext = (summary = "Today summary without private context marker.") => ({
  generatedAt: new Date().toISOString(),
  scope: "today",
  summary,
  today: {
    steps: 7421,
    stepGoal: 10000,
    mealsLogged: 2,
    caloriesLogged: 850,
    workoutsLogged: 1,
    activeMinutes: 32,
    waterGlasses: 5,
    waterGoal: 8,
  },
  recent: {
    nutritionSummary: "Today's logged meals include breakfast and lunch.",
    fitnessSummary: "Today's workout is a brisk walk.",
    routineSummary: "Custom routines include morning stretch.",
    reminderSummary: "Enabled reminders include hydration check-in.",
  },
  safety: {
    medicalAdviceDisclaimer: "This is general wellness information, not a medical diagnosis or treatment plan.",
    dataMayBeIncomplete: true,
    contextMinimized: true,
  },
});

const run = async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const noContext = await requestJson(baseUrl, "POST", "/ai/chat", {
    message: "How many steps did I complete today?",
    mode: "chat",
  });
  assert(noContext.status === 200, "AI chat without context should return 200");
  assert(noContext.json?.data?.contextUsed === false, "AI chat without context should report contextUsed false");
  assertNoSensitiveExposure(noContext.json);

  const withContext = await requestJson(baseUrl, "POST", "/ai/chat", {
    message: "How many steps did I complete today?",
    mode: "chat",
    healthContext: buildContext(),
  });
  assert(withContext.status === 200, "AI chat with context should return 200");
  assert(withContext.json?.data?.contextUsed === true, "AI chat with context should report contextUsed true");
  assert(/7421/.test(withContext.json?.data?.reply ?? ""), "mock provider should answer with context step count");
  assert(
    withContext.json?.data?.safetyNotice === "This is general wellness information, not a medical diagnosis or treatment plan.",
    "context chat should keep safety notice",
  );
  assert(Boolean(withContext.json?.data?.requestId), "context chat should include request ID");
  assertNoSensitiveExposure(withContext.json);

  const nutrition = await requestJson(baseUrl, "POST", "/ai/chat", {
    message: "What did I eat today?",
    mode: "nutrition",
    healthContext: buildContext(),
  });
  assert(nutrition.status === 200, "nutrition context chat should return 200");
  assert(/2 meal/i.test(nutrition.json?.data?.reply ?? ""), "mock provider should answer with meal count");
  assertNoSensitiveExposure(nutrition.json);

  const oversized = await requestJson(baseUrl, "POST", "/ai/chat", {
    message: "Use this context",
    mode: "chat",
    healthContext: buildContext("x".repeat(1300)),
  });
  assert(oversized.status === 400, "oversized context should be rejected safely");
  assert(oversized.json?.error?.code === "invalid_request", "oversized context should use safe validation code");
  assertNoSensitiveExposure(oversized.json);

  console.log("AI health context smoke test passed");
};

const closeServer = async () => {
  if (!server.listening) return;

  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "AI health context smoke test failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeServer();
    require("../backend/dist/database/connection").database.close();
    rmSync(tempDir, { recursive: true, force: true });
  });
