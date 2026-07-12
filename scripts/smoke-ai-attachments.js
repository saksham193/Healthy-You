const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const http = require("node:http");

const tempDir = mkdtempSync(join(tmpdir(), "healthy-you-ai-attachments-"));
const databasePath = join(tempDir, "ai-attachments-smoke.sqlite");

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_SECRET = "ai-attachments-smoke-jwt-change-before-production";
process.env.OPENAI_API_KEY = "";
process.env.AI_PROVIDER = "mock";
process.env.AI_FALLBACK_PROVIDER = "mock";
process.env.AI_SAFETY_GUARD_ENABLED = "true";
process.env.AI_PROVIDER_TIMEOUT_MS = "15000";
process.env.OLLAMA_BASE_URL = "http://localhost:11434";
process.env.OLLAMA_MODEL = "llama3.1";
process.env.ATTACHMENT_ANALYSIS_ENABLED = "true";
process.env.ATTACHMENT_MAX_BYTES = "1048576";
process.env.ATTACHMENT_TEXT_MAX_CHARS = "8000";
process.env.ATTACHMENT_ALLOWED_MIME_TYPES = "text/plain,text/markdown,application/json";
process.env.ATTACHMENT_ALLOW_PDF_TEXT = "false";
process.env.CORS_ORIGIN = "*";
process.env.RATE_LIMIT_ENABLED = "true";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_DEFAULT_MAX = "100";
process.env.RATE_LIMIT_AI_MAX = "20";
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

const parseResponse = async (response) => {
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

const requestJson = async (baseUrl, method, path, body, token) => parseResponse(await fetch(`${baseUrl}${path}`, {
  method,
  headers: {
    ...(body === undefined ? {} : { "content-type": "application/json" }),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  },
  body: body === undefined ? undefined : JSON.stringify(body),
}));

const requestAttachment = async (baseUrl, token, contentType, body, headers = {}) => parseResponse(await fetch(
  `${baseUrl}/ai/attachments/analyze`,
  {
    method: "POST",
    headers: {
      "content-type": contentType,
      authorization: `Bearer ${token}`,
      ...headers,
    },
    body,
  },
));

const requestStructuredAttachment = async (baseUrl, token, body) => parseResponse(await fetch(
  `${baseUrl}/ai/attachments/analyze`,
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  },
));

const assertNoSensitiveExposure = (value) => {
  const serialized = JSON.stringify(value ?? {}).toLowerCase();

  [
    "authorization",
    "bearer",
    "api_key",
    "openai_api_key",
    "jwt",
    "sk-",
    databasePath.toLowerCase(),
    "private attachment marker",
    "attachment text for summary",
    "stack",
  ].forEach((term) => {
    assert(!serialized.includes(term), `AI attachment smoke response exposed sensitive term: ${term}`);
  });
};

const registerUser = async (baseUrl) => {
  const register = await requestJson(baseUrl, "POST", "/auth/register", {
    email: "ai-attachment-smoke@example.com",
    name: "AI Attachment Smoke",
    password: "smoke-password-123",
  });

  assert(register.status === 201, "registration should succeed for attachment smoke");
  return register.json.data.tokens.accessToken;
};

const run = async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const token = await registerUser(baseUrl);

  const supported = await requestAttachment(
    baseUrl,
    token,
    "text/plain",
    "Daily hydration notes with private attachment marker and a walking goal.",
    { "x-healthy-you-filename": "notes.txt" },
  );
  assert(supported.status === 200, "supported text attachment should return 200");
  assert(supported.json?.data?.supported === true, "supported text attachment should be marked supported");
  assert(supported.json?.data?.provider === "mock", "supported text attachment should use mock provider");
  assert(supported.json?.data?.fallbackUsed === false, "mock attachment analysis should not need fallback");
  assert(
    supported.json?.data?.safetyNotice === "This is general wellness information, not a medical diagnosis or treatment plan.",
    "supported text attachment should include safety notice",
  );
  assert(Boolean(supported.json?.data?.requestId), "supported text attachment should include request ID");
  assertNoSensitiveExposure(supported.json);

  const structured = await requestStructuredAttachment(baseUrl, token, {
    filename: "notes.txt",
    mimeType: "text/plain",
    mode: "attachment",
    sizeBytes: 93,
    text: "Daily hydration notes with private attachment marker and a walking goal.",
  });
  assert(structured.status === 200, "structured text attachment should return 200");
  assert(structured.json?.data?.supported === true, "structured text attachment should be marked supported");
  assert(structured.json?.data?.provider === "mock", "structured text attachment should use mock provider");
  assertNoSensitiveExposure(structured.json);

  const jsonAttachment = await requestAttachment(
    baseUrl,
    token,
    "application/json",
    JSON.stringify({ summary: "meal planning", private: "private attachment marker" }),
    { "x-healthy-you-filename": "summary.json" },
  );
  assert(jsonAttachment.status === 200, "supported JSON attachment should return 200");
  assert(jsonAttachment.json?.data?.supported === true, "supported JSON attachment should be marked supported");
  assertNoSensitiveExposure(jsonAttachment.json);

  const unsupported = await requestAttachment(
    baseUrl,
    token,
    "application/pdf",
    "%PDF-private attachment marker",
    { "x-healthy-you-filename": "scan.pdf" },
  );
  assert(unsupported.status === 200, "unsupported attachment should return safe 200 fallback");
  assert(unsupported.json?.data?.supported === false, "unsupported attachment should be marked unsupported");
  assert(/not supported/i.test(unsupported.json?.data?.summary), "unsupported attachment should use clear copy");
  assertNoSensitiveExposure(unsupported.json);

  const invalidJson = await requestAttachment(
    baseUrl,
    token,
    "application/json",
    "{",
    { "x-healthy-you-filename": "invalid.json" },
  );
  assert(invalidJson.status === 400, "invalid JSON attachment should return 400");
  assert(invalidJson.json?.error?.code === "invalid_json_attachment", "invalid JSON should use safe error code");
  assertNoSensitiveExposure(invalidJson.json);

  const oversized = await requestAttachment(
    baseUrl,
    token,
    "text/plain",
    "x".repeat(1048577),
    { "x-healthy-you-filename": "large.txt" },
  );
  assert(oversized.status === 413, "oversized attachment should return 413");
  assertNoSensitiveExposure(oversized.json);

  const unauthenticated = await fetch(`${baseUrl}/ai/attachments/analyze`, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "not authenticated",
  }).then(parseResponse);
  assert(unauthenticated.status === 401, "attachment analysis should require authentication");

  console.log("AI attachment smoke test passed");
};

const closeServer = async () => {
  if (!server.listening) return;

  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "AI attachment smoke test failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeServer();
    require("../backend/dist/database/connection").database.close();
    rmSync(tempDir, { recursive: true, force: true });
  });
