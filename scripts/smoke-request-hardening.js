const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const http = require("node:http");

const tempDir = mkdtempSync(join(tmpdir(), "healthy-you-hardening-"));
const databasePath = join(tempDir, "request-hardening-smoke.sqlite");

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_SECRET = "request-hardening-secret-change-before-production";
process.env.OPENAI_API_KEY = "request-hardening-openai-placeholder";
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

  return { status: response.status, json, text };
};

const assertNoSensitiveEcho = (value) => {
  const serialized = JSON.stringify(value ?? {});

  [
    "Authorization",
    "Bearer",
    "sync payload",
    "calories",
    "medication",
    "fitness",
    "nutrition",
    "profile notes",
    "openai",
    "secret",
    "api key",
  ].forEach((term) => {
    assert(!serialized.toLowerCase().includes(term.toLowerCase()), `response echoed sensitive term: ${term}`);
  });
};

const run = async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const health = await request(baseUrl, "GET", "/health");
  assert(health.status === 200, "/health should return 200");

  const status = await request(baseUrl, "GET", "/status");
  assert(status.status === 200, "/status should return 200");

  const malformed = await request(baseUrl, "POST", "/auth/login", "{", {
    "content-type": "application/json",
  });
  assert(malformed.status === 400, "malformed JSON should return 400");
  assert(malformed.json?.error?.code === "malformed_json", "malformed JSON should use safe code");
  assertNoSensitiveEcho(malformed.json);

  const unsupported = await request(baseUrl, "POST", "/sync/push", "sync payload with calories", {
    "content-type": "text/plain",
    authorization: "Bearer smoke-secret-token",
  });
  assert(unsupported.status === 415, "unsupported content type should return 415");
  assert(unsupported.json?.error?.code === "unsupported_media_type", "unsupported content type should use safe code");
  assertNoSensitiveEcho(unsupported.json);

  const firstSync = await request(baseUrl, "GET", "/sync/pull");
  const secondSync = await request(baseUrl, "GET", "/sync/pull");
  const thirdSync = await request(baseUrl, "GET", "/sync/pull");
  assert(firstSync.status === 401, "first unauthenticated sync request should hit auth before limit");
  assert(secondSync.status === 401, "second unauthenticated sync request should hit auth before limit");
  assert(thirdSync.status === 429, "third sync request should be rate limited in smoke config");
  assert(thirdSync.json?.code === "RATE_LIMITED", "rate limit response should use safe top-level code");
  assert(thirdSync.json?.error === "Too many requests. Please wait and try again.", "rate limit response should be generic");
  assertNoSensitiveEcho(thirdSync.json);

  console.log("request hardening smoke test passed");
};

const closeServer = async () => {
  if (!server.listening) return;

  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "request hardening smoke test failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeServer();
    require("../backend/dist/database/connection").database.close();
    rmSync(tempDir, { recursive: true, force: true });
  });
