const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const http = require("node:http");

const tempDir = mkdtempSync(join(tmpdir(), "healthy-you-sync-smoke-"));
const databasePath = join(tempDir, "sync-smoke.sqlite");

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.PORT = "4001";
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_SECRET = "sync-smoke-test-secret-change-before-production";
process.env.OPENAI_API_KEY = "sync-smoke-openai-placeholder";
process.env.CORS_ORIGIN = "*";

const { app } = require("../backend/dist/app");

const server = http.createServer(app);

const requestJson = async (baseUrl, method, path, body, token) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  return { status: response.status, json };
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const syncItem = (overrides = {}) => ({
  id: "smoke-sync-item-1",
  entityType: "nutrition_log",
  entityId: "meal-1",
  operation: "create",
  payload: {
    label: "sync smoke fixture",
    calories: 123,
  },
  localUpdatedAt: "2026-01-01T00:00:00.000Z",
  queuedAt: "2026-01-01T00:00:01.000Z",
  retryCount: 0,
  ...overrides,
});

const run = async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const unauthenticatedPull = await requestJson(baseUrl, "GET", "/sync/pull");
  assert(unauthenticatedPull.status === 401, "sync pull must require authentication");

  const register = await requestJson(baseUrl, "POST", "/auth/register", {
    email: "sync-smoke@example.com",
    name: "Sync Smoke",
    password: "smoke-password-123",
  });
  assert(register.status === 201, "registration should succeed");
  const token = register.json.data.tokens.accessToken;

  const push = await requestJson(baseUrl, "POST", "/sync/push", { items: [syncItem()] }, token);
  assert(push.status === 200, "sync push should return 200");
  assert(push.json.data.status === "ok", "sync push should be accepted");
  assert(push.json.data.results[0].status === "accepted", "sync item should be accepted");

  const pull = await requestJson(baseUrl, "GET", "/sync/pull", undefined, token);
  assert(pull.status === 200, "sync pull should return 200");
  assert(pull.json.data.status === "ok", "sync pull should be enabled on backend");
  assert(pull.json.data.items.length === 1, "sync pull should return persisted item");
  assert(pull.json.data.items[0].entityId === "meal-1", "sync pull should preserve entity identity");

  const conflict = await requestJson(baseUrl, "POST", "/sync/push", {
    items: [syncItem({
      id: "smoke-sync-item-stale",
      operation: "update",
      localUpdatedAt: "2025-12-31T23:59:59.000Z",
    })],
  }, token);
  assert(conflict.status === 200, "sync conflict response should return 200");
  assert(conflict.json.data.status === "partial", "stale sync push should be partial");
  assert(conflict.json.data.results[0].status === "conflict", "stale sync item should conflict");

  const deletion = await requestJson(baseUrl, "POST", "/sync/push", {
    items: [syncItem({
      id: "smoke-sync-item-delete",
      operation: "delete",
      payload: null,
      localUpdatedAt: "2026-01-02T00:00:00.000Z",
      queuedAt: "2026-01-02T00:00:01.000Z",
    })],
  }, token);
  assert(deletion.status === 200, "sync delete should return 200");
  assert(deletion.json.data.results[0].status === "accepted", "sync delete should be accepted");

  const afterDelete = await requestJson(baseUrl, "GET", "/sync/pull", undefined, token);
  assert(afterDelete.json.data.items[0].operation === "delete", "sync pull should expose delete tombstone");

  console.log("sync endpoint smoke test passed");
};

const closeServer = async () => {
  if (!server.listening) return;

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeServer();
    require("../backend/dist/database/connection").database.close();
    rmSync(tempDir, { recursive: true, force: true });
  });
