const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const http = require("node:http");

const tempDir = mkdtempSync(join(tmpdir(), "healthy-you-ai-voice-"));
const databasePath = join(tempDir, "ai-voice-smoke.sqlite");

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_SECRET = "ai-voice-smoke-jwt-change-before-production";
process.env.OPENAI_API_KEY = "";
process.env.AI_PROVIDER = "mock";
process.env.AI_FALLBACK_PROVIDER = "mock";
process.env.AI_SAFETY_GUARD_ENABLED = "true";
process.env.STT_PROVIDER = "mock";
process.env.STT_FALLBACK_PROVIDER = "mock";
process.env.STT_MAX_AUDIO_BYTES = "5242880";
process.env.STT_MAX_DURATION_SECONDS = "30";
process.env.STT_PROVIDER_TIMEOUT_MS = "20000";
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

const requestVoice = async (baseUrl, token, contentType, body, headers = {}) => parseResponse(await fetch(
  `${baseUrl}/ai/voice/transcribe`,
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
    "voice private marker",
    "stack",
  ].forEach((term) => {
    assert(!serialized.includes(term), `AI voice smoke response exposed sensitive term: ${term}`);
  });
};

const registerUser = async (baseUrl) => {
  const register = await requestJson(baseUrl, "POST", "/auth/register", {
    email: "ai-voice-smoke@example.com",
    name: "AI Voice Smoke",
    password: "smoke-password-123",
  });

  assert(register.status === 201, "registration should succeed for voice smoke");
  return register.json.data.tokens.accessToken;
};

const run = async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const token = await registerUser(baseUrl);

  const supported = await requestVoice(
    baseUrl,
    token,
    "audio/mp4",
    Buffer.from("voice private marker demo audio bytes"),
    { "x-healthy-you-audio-duration-seconds": "2" },
  );
  assert(supported.status === 200, "supported voice clip should return 200");
  assert(supported.json?.data?.provider === "mock", "voice smoke should use mock STT provider");
  assert(supported.json?.data?.fallbackUsed === true, "mock STT should clearly be a demo fallback");
  assert(/demo transcript/i.test(supported.json?.data?.transcript), "voice smoke should return demo transcript");
  assert(/review and edit/i.test(supported.json?.data?.safetyNotice), "voice smoke should include review notice");
  assert(Boolean(supported.json?.data?.requestId), "voice smoke should include request ID");
  assertNoSensitiveExposure(supported.json);

  const unsupported = await requestVoice(
    baseUrl,
    token,
    "application/octet-stream",
    Buffer.from("voice private marker"),
  );
  assert(unsupported.status === 415, "unsupported voice MIME should return 415");
  assert(unsupported.json?.error?.code === "unsupported_audio_type", "unsupported voice MIME should use safe error code");
  assertNoSensitiveExposure(unsupported.json);

  const oversized = await requestVoice(
    baseUrl,
    token,
    "audio/mp4",
    Buffer.alloc(5242881, "x"),
  );
  assert(oversized.status === 413, "oversized voice clip should return 413");
  assertNoSensitiveExposure(oversized.json);

  const tooLong = await requestVoice(
    baseUrl,
    token,
    "audio/mp4",
    Buffer.from("voice private marker"),
    { "x-healthy-you-audio-duration-seconds": "45" },
  );
  assert(tooLong.status === 400, "over-duration voice clip should return 400");
  assert(tooLong.json?.error?.code === "audio_too_long", "over-duration voice clip should use safe error code");
  assertNoSensitiveExposure(tooLong.json);

  const unauthenticated = await fetch(`${baseUrl}/ai/voice/transcribe`, {
    method: "POST",
    headers: { "content-type": "audio/mp4" },
    body: Buffer.from("not authenticated"),
  }).then(parseResponse);
  assert(unauthenticated.status === 401, "voice transcription should require authentication");

  console.log("AI voice smoke test passed");
};

const closeServer = async () => {
  if (!server.listening) return;

  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "AI voice smoke test failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeServer();
    require("../backend/dist/database/connection").database.close();
    rmSync(tempDir, { recursive: true, force: true });
  });
