const { existsSync, mkdirSync, statSync } = require("node:fs");
const { basename, dirname, extname, join, resolve } = require("node:path");
const Database = require("better-sqlite3");

const createTimestamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const normalizePath = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.replace(/^file:/, "").replace(/^sqlite:/, "");
};

const createBackupPath = (databasePath, backupDirectory, timestamp = createTimestamp()) => {
  const sourceBaseName = basename(databasePath, extname(databasePath)) || "healthy-you";

  return join(backupDirectory, `${sourceBaseName}-backup-${timestamp}.sqlite`);
};

const createSqliteBackup = async ({ databasePath, backupDirectory, timestamp } = {}) => {
  const normalizedDatabasePath = normalizePath(databasePath);

  if (!normalizedDatabasePath) {
    throw new Error("SQLite database path is missing.");
  }

  const resolvedDatabasePath = resolve(normalizedDatabasePath);
  const resolvedBackupDirectory = resolve(backupDirectory || "backend/backups");

  if (!existsSync(resolvedDatabasePath)) {
    throw new Error("SQLite database file does not exist.");
  }

  mkdirSync(resolvedBackupDirectory, { recursive: true });

  const backupPath = createBackupPath(resolvedDatabasePath, resolvedBackupDirectory, timestamp);
  const database = new Database(resolvedDatabasePath, { readonly: true, fileMustExist: true });

  try {
    await database.backup(backupPath);
  } finally {
    database.close();
  }

  const stats = statSync(backupPath);
  const sidecars = {
    walPresent: existsSync(`${resolvedDatabasePath}-wal`),
    shmPresent: existsSync(`${resolvedDatabasePath}-shm`),
  };

  return {
    backupPath,
    backupDirectory: dirname(backupPath),
    bytes: stats.size,
    timestamp: timestamp ?? basename(backupPath).replace(/^.*-backup-/, "").replace(/\.sqlite$/, ""),
    sidecars,
  };
};

const runCli = async () => {
  const { env } = require("../backend/dist/config/env");
  const result = await createSqliteBackup({
    databasePath: env.DATABASE_PATH,
    backupDirectory: process.env.SQLITE_BACKUP_DIR || "backend/backups",
  });

  console.log(JSON.stringify({
    status: "ok",
    backupPath: result.backupPath,
    bytes: result.bytes,
    timestamp: result.timestamp,
    walPresent: result.sidecars.walPresent,
    shmPresent: result.sidecars.shmPresent,
  }, null, 2));
};

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : "SQLite backup failed.");
    process.exitCode = 1;
  });
}

module.exports = {
  createSqliteBackup,
};
