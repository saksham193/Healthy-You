const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const envFile = path.join(projectRoot, ".env.staging");
const androidDir = path.join(projectRoot, "android");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing environment file: ${filePath}`);
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return env;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      env[key] = value;
      return env;
    }, {});
}

const stagingEnv = parseEnvFile(envFile);
const requiredKeys = ["EXPO_PUBLIC_ENVIRONMENT", "EXPO_PUBLIC_API_BASE_URL"];
const missingKeys = requiredKeys.filter((key) => !stagingEnv[key]);

if (missingKeys.length > 0) {
  throw new Error(`Missing required staging env values: ${missingKeys.join(", ")}`);
}

const cliArgs = process.argv.slice(2);
const allArchitectures = cliArgs.includes("--all-architectures");
const architectureArg = cliArgs.find((arg) => arg.startsWith("--architectures="));
const requestedArchitectures =
  architectureArg?.split("=")[1] || process.env.ANDROID_RC_ARCHITECTURES || "x86_64";

const gradleCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const gradleArgs = ["assembleRelease"];

if (!allArchitectures) {
  gradleArgs.push(`-PreactNativeArchitectures=${requestedArchitectures}`);
}

const child = spawn(gradleCommand, gradleArgs, {
  cwd: androidDir,
  env: {
    ...process.env,
    ...stagingEnv,
    NODE_ENV: process.env.NODE_ENV || "production",
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
