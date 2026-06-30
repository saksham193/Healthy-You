const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const jwt = require("jsonwebtoken");

const root = path.resolve(__dirname, "..");
const databasePath = path.join(root, "backend", "data", "auth-flow-validation.sqlite");
const jwtAccessSecret = "auth-flow-validation-access-secret-minimum-32";
const jwtRefreshSecret = "auth-flow-validation-refresh-secret-minimum-32";

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = databasePath;
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_ACCESS_SECRET = jwtAccessSecret;
process.env.JWT_REFRESH_SECRET = jwtRefreshSecret;
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

async function main() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const email = `phase2a-${Date.now()}@example.com`;
  const password = "Password123!";

  try {
    const registered = await request(baseUrl, "POST", "/auth/register", {
      body: { name: "Test User", email, password },
    });
    assert(registered.status === 201, "register success: status 201");
    assert(registered.body?.data?.user?.email === email, "register success: returns user");
    assert(!("passwordHash" in registered.body.data.user), "register success: omits password hash");
    assert(Boolean(registered.body?.data?.tokens?.accessToken), "register success: returns access token");
    assert(Boolean(registered.body?.data?.tokens?.refreshToken), "register success: returns refresh token");

    const duplicate = await request(baseUrl, "POST", "/auth/register", {
      body: { name: "Test User", email, password },
    });
    assert(duplicate.status === 409, "duplicate register fails safely");

    const login = await request(baseUrl, "POST", "/auth/login", {
      body: { email, password },
    });
    assert(login.status === 200, "login success: status 200");
    assert(login.body?.data?.user?.email === email, "login success: returns user");
    const loginTokens = login.body.data.tokens;

    const invalidLogin = await request(baseUrl, "POST", "/auth/login", {
      body: { email, password: "WrongPassword123!" },
    });
    assert(invalidLogin.status === 401, "invalid login fails safely");

    const me = await request(baseUrl, "GET", "/users/me", { token: loginTokens.accessToken });
    assert(me.status === 200, "/users/me with valid token succeeds");
    assert(me.body?.data?.email === email, "/users/me returns current user safely");

    const invalidToken = await request(baseUrl, "GET", "/users/me", { token: "not-a-valid-token" });
    assert(invalidToken.status === 401, "/users/me with invalid token fails");

    const expiredToken = jwt.sign(
      { sub: login.body.data.user.id, email },
      jwtAccessSecret,
      { expiresIn: "-1s" },
    );
    const expired = await request(baseUrl, "GET", "/users/me", { token: expiredToken });
    assert(expired.status === 401, "/users/me with expired token fails");

    const refresh = await request(baseUrl, "POST", "/auth/refresh-token", {
      body: { refreshToken: loginTokens.refreshToken },
    });
    assert(refresh.status === 200, "refresh token succeeds");
    assert(Boolean(refresh.body?.data?.tokens?.accessToken), "refresh returns fresh access token");
    assert(Boolean(refresh.body?.data?.tokens?.refreshToken), "refresh returns fresh refresh token");
    assert(
      refresh.body.data.tokens.refreshToken !== loginTokens.refreshToken,
      "refresh rotates refresh token",
    );

    const oldRefresh = await request(baseUrl, "POST", "/auth/refresh-token", {
      body: { refreshToken: loginTokens.refreshToken },
    });
    assert(oldRefresh.status === 401, "old refresh token fails after rotation");

    const logout = await request(baseUrl, "POST", "/auth/logout", {
      body: { refreshToken: refresh.body.data.tokens.refreshToken },
    });
    assert(logout.status === 204, "logout succeeds");

    const invalidLogout = await request(baseUrl, "POST", "/auth/logout", {
      body: { refreshToken: "already-invalid-refresh-token" },
    });
    assert(invalidLogout.status === 204, "logout with invalid token does not crash");

    const refreshAfterLogout = await request(baseUrl, "POST", "/auth/refresh-token", {
      body: { refreshToken: refresh.body.data.tokens.refreshToken },
    });
    assert(refreshAfterLogout.status === 401, "refresh after logout fails");

    const missingToken = await request(baseUrl, "GET", "/users/me");
    assert(missingToken.status === 401, "protected route rejects missing token");

    console.log("Auth flow validation completed.");
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
