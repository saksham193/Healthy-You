const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const http = require("node:http");

const tempDir = mkdtempSync(join(tmpdir(), "healthy-you-ai-provider-"));
const databasePath = join(tempDir, "ai-provider-smoke.sqlite");

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_SECRET = "ai-provider-smoke-secret-change-before-production";
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
process.env.RATE_LIMIT_AI_MAX = "5";
process.env.RATE_LIMIT_SYNC_MAX = "100";
process.env.RATE_LIMIT_EXPORT_DELETE_MAX = "100";
process.env.RATE_LIMIT_AUTH_MAX = "10";
process.env.REQUEST_BODY_LIMIT_JSON = "2kb";
process.env.REQUEST_BODY_LIMIT_AI_IMAGE = "2mb";
process.env.LOG_LEVEL = "error";

const { app } = require("../backend/dist/app");

const server = http.createServer(app);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const requestJson = async (baseUrl, method, path, body, headers = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
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
    "health context with calories",
    "prompt body secret",
    "stack",
  ].forEach((term) => {
    assert(!serialized.includes(term), `AI smoke response exposed sensitive term: ${term}`);
  });
};

const run = async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const status = await requestJson(baseUrl, "GET", "/ai/providers/status");
  assert(status.status === 200, "provider status should return 200");
  assert(status.json?.data?.provider === "mock", "provider status should show mock provider");
  assert(status.json?.data?.available === true, "mock provider should be available");
  assert(status.json?.data?.fallbackProvider === "mock", "fallback provider should be mock");
  assert(status.json?.data?.safetyGuardEnabled === true, "safety guard should be enabled");
  assert(Boolean(status.json?.data?.requestId), "provider status should include request ID");
  assertNoSensitiveExposure(status.json);

  const chat = await requestJson(baseUrl, "POST", "/ai/chat", {
    message: "Give me a safe hydration habit idea.",
    healthContextSummary: "health context with calories and private notes should not echo",
    mode: "chat",
  });
  assert(chat.status === 200, "mock chat should return 200");
  assert(chat.json?.data?.provider === "mock", "mock chat should use mock provider");
  assert(chat.json?.data?.fallbackUsed === false, "mock chat should not need fallback");
  assert(
    chat.json?.data?.safetyNotice === "This is general wellness information, not a medical diagnosis or treatment plan.",
    "mock chat should include safety notice",
  );
  assert(Boolean(chat.json?.data?.requestId), "mock chat should include request ID");
  assertNoSensitiveExposure(chat.json);

  const unsafe = await requestJson(baseUrl, "POST", "/ai/chat", {
    message: "What dose of my prescription should I take?",
  });
  assert(unsafe.status === 200, "unsafe medical request should return safe response");
  assert(unsafe.json?.data?.fallbackUsed === true, "unsafe medical response should be safety fallback");
  assert(/cannot recommend medication dosages/i.test(unsafe.json?.data?.reply), "unsafe response should redirect dosage request");
  assertNoSensitiveExposure(unsafe.json);

  const malformed = await fetch(`${baseUrl}/ai/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: "{",
  });
  const malformedJson = await malformed.json();
  assert(malformed.status === 400, "malformed AI JSON should return 400");
  assert(malformedJson?.error?.code === "malformed_json", "malformed AI JSON should use safe error code");
  assertNoSensitiveExposure(malformedJson);

  const invalid = await requestJson(baseUrl, "POST", "/ai/chat", {
    healthContextSummary: "prompt body secret",
  });
  assert(invalid.status === 400, "invalid AI chat request should return 400");
  assert(invalid.json?.error?.code === "invalid_request", "invalid AI request should use safe validation code");
  assertNoSensitiveExposure(invalid.json);

  const limitedOne = await requestJson(baseUrl, "POST", "/ai/chat", { message: "one" });
  const limitedTwo = await requestJson(baseUrl, "POST", "/ai/chat", { message: "two" });
  const limitedThree = await requestJson(baseUrl, "POST", "/ai/chat", { message: "three" });
  assert(limitedOne.status === 200 || limitedOne.status === 429, "AI limit smoke should receive controlled response");
  assert(limitedTwo.status === 429 || limitedThree.status === 429, "AI chat should be rate limited by smoke config");
  assertNoSensitiveExposure(limitedThree.json);

  console.log("AI provider smoke test passed");
};

const closeServer = async () => {
  if (!server.listening) return;

  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "AI provider smoke test failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeServer();
    require("../backend/dist/database/connection").database.close();
    rmSync(tempDir, { recursive: true, force: true });
  });
