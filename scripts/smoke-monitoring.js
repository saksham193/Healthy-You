const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const http = require("node:http");

const tempDir = mkdtempSync(join(tmpdir(), "healthy-you-monitoring-"));
const databasePath = join(tempDir, "monitoring-smoke.sqlite");

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_SECRET = "monitoring-smoke-secret-change-before-production";
process.env.OPENAI_API_KEY = "monitoring-openai-placeholder";
process.env.CORS_ORIGIN = "*";
process.env.RATE_LIMIT_ENABLED = "true";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_DEFAULT_MAX = "100";
process.env.RATE_LIMIT_AI_MAX = "100";
process.env.RATE_LIMIT_SYNC_MAX = "2";
process.env.RATE_LIMIT_EXPORT_DELETE_MAX = "2";
process.env.RATE_LIMIT_AUTH_MAX = "10";
process.env.REQUEST_BODY_LIMIT_JSON = "1kb";
process.env.REQUEST_BODY_LIMIT_AI_IMAGE = "2mb";
process.env.LOG_LEVEL = "error";
process.env.REQUEST_ID_HEADER = "X-Request-Id";
process.env.MONITORING_ENABLED = "true";
process.env.MONITORING_SAFE_STATUS_ENABLED = "true";

const { app } = require("../backend/dist/app");

const server = http.createServer(app);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const request = async (baseUrl, method, path, body, headers = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body,
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
    text,
    requestId: response.headers.get("x-request-id"),
  };
};

const assertNoSensitiveExposure = (value) => {
  const serialized = JSON.stringify(value ?? {}).toLowerCase();

  [
    "authorization",
    "bearer",
    "cookie",
    "token",
    "api_key",
    "openai_api_key",
    "jwt",
    "secret",
    databasePath.toLowerCase(),
    "sync payload",
    "calories",
    "medication",
    "fitness",
    "nutrition",
    "profile notes",
    "ai prompt",
    "stack",
  ].forEach((term) => {
    assert(!serialized.includes(term), `response exposed sensitive term: ${term}`);
  });
};

const run = async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const incomingRequestId = "smoke-request-7d";
  const health = await request(baseUrl, "GET", "/health", undefined, {
    "x-request-id": incomingRequestId,
  });
  assert(health.status === 200, "/health should return 200");
  assert(health.requestId === incomingRequestId, "/health should preserve safe incoming request ID");
  assert(health.json?.data?.requestId === incomingRequestId, "/health should include request ID safely");
  assertNoSensitiveExposure(health.json);

  const status = await request(baseUrl, "GET", "/status");
  assert(status.status === 200, "/status should return 200");
  assert(Boolean(status.requestId), "/status should include X-Request-Id header");
  assert(status.json?.data?.service === "healthy-you-backend", "/status should expose service name");
  assert(typeof status.json?.data?.databaseReady === "boolean", "/status should include database readiness");
  assert(typeof status.json?.data?.migrationsReady === "boolean", "/status should include migration readiness");
  assert(typeof status.json?.data?.monitoring?.uptimeSeconds === "number", "/status should include uptime");
  assert(typeof status.json?.data?.monitoring?.requests?.total === "number", "/status should include aggregate request count");
  assertNoSensitiveExposure(status.json);

  const malformed = await request(baseUrl, "POST", "/auth/login", "{", {
    "content-type": "application/json",
    authorization: "Bearer monitoring-smoke-token",
  });
  assert(malformed.status === 400, "malformed JSON should return 400");
  assert(malformed.json?.error?.code === "malformed_json", "malformed JSON should use safe code");
  assert(Boolean(malformed.requestId), "malformed JSON should include X-Request-Id header");
  assert(malformed.json?.requestId === malformed.requestId, "malformed JSON body should include matching request ID");
  assertNoSensitiveExposure(malformed.json);

  const unsupported = await request(baseUrl, "POST", "/sync/push", "sync payload with calories", {
    "content-type": "text/plain",
    authorization: "Bearer monitoring-smoke-token",
  });
  assert(unsupported.status === 415, "unsupported content type should return 415");
  assert(unsupported.json?.error?.code === "unsupported_media_type", "unsupported content type should use safe code");
  assert(Boolean(unsupported.requestId), "unsupported content type should include X-Request-Id header");
  assertNoSensitiveExposure(unsupported.json);

  await request(baseUrl, "GET", "/sync/pull");
  await request(baseUrl, "GET", "/sync/pull");
  const limited = await request(baseUrl, "GET", "/sync/pull");
  assert(limited.status === 429, "third sync request should be rate limited in smoke config");
  assert(limited.json?.code === "RATE_LIMITED", "rate limit response should use safe code");
  assert(Boolean(limited.requestId), "rate limit response should include X-Request-Id header");
  assert(limited.json?.requestId === limited.requestId, "rate limit body should include matching request ID");
  assertNoSensitiveExposure(limited.json);

  const afterErrors = await request(baseUrl, "GET", "/status");
  assert(afterErrors.json?.data?.monitoring?.requests?.rateLimited >= 1, "/status should count rate limits");
  assert(afterErrors.json?.data?.monitoring?.requests?.malformed >= 1, "/status should count malformed requests");
  assertNoSensitiveExposure(afterErrors.json);

  console.log("monitoring smoke test passed");
};

const closeServer = async () => {
  if (!server.listening) return;

  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "monitoring smoke test failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeServer();
    require("../backend/dist/database/connection").database.close();
    rmSync(tempDir, { recursive: true, force: true });
  });
