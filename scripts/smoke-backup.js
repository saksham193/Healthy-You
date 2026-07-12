const { existsSync, mkdtempSync, rmSync, statSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const tempDir = mkdtempSync(join(tmpdir(), "healthy-you-backup-smoke-"));
const databasePath = join(tempDir, "backup-smoke.sqlite");
const backupDirectory = join(tempDir, "backups");

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_SECRET = "backup-smoke-secret-change-before-production";
process.env.OPENAI_API_KEY = "backup-smoke-openai-placeholder";
process.env.CORS_ORIGIN = "*";
process.env.SQLITE_BACKUP_DIR = backupDirectory;

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const run = async () => {
  const { database } = require("../backend/dist/database/connection");
  const { runMigrations, getMigrationStatus } = require("../backend/dist/database/migrationRunner");
  const { createSqliteBackup } = require("./backup-sqlite-db");

  runMigrations(database);

  const status = getMigrationStatus(database);
  assert(status.pending.length === 0, "expected zero pending migrations before backup smoke");

  database.prepare(`
    INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    "backup-smoke-user",
    "backup-smoke@example.invalid",
    "Backup Smoke User",
    "backup-smoke-hash",
    "2026-07-11T00:00:00.000Z",
    "2026-07-11T00:00:00.000Z",
  );

  database.close();

  let capturedOutput = "";
  const originalLog = console.log;
  console.log = (message) => {
    capturedOutput += `${String(message)}\n`;
  };

  let result;
  try {
    result = await createSqliteBackup({
      databasePath,
      backupDirectory,
      timestamp: "smoke",
    });
  } finally {
    console.log = originalLog;
  }

  assert(existsSync(result.backupPath), "backup file should exist");
  assert(statSync(result.backupPath).size > 0, "backup file should not be empty");
  assert(result.bytes > 0, "backup result should include file size only");

  [
    "Backup Smoke User",
    "backup-smoke@example.invalid",
    "backup-smoke-hash",
  ].forEach((sensitiveValue) => {
    assert(!capturedOutput.includes(sensitiveValue), `backup output exposed ${sensitiveValue}`);
  });

  console.log("backup smoke test passed");
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "backup smoke test failed");
    process.exitCode = 1;
  })
  .finally(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });
