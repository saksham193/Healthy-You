const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const tempDir = mkdtempSync(join(tmpdir(), "healthy-you-migrations-"));
const databasePath = join(tempDir, "migration-smoke.sqlite");

process.env.ENVIRONMENT = "test";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.JWT_SECRET = "migration-smoke-secret-change-before-production";
process.env.OPENAI_API_KEY = "migration-smoke-openai-placeholder";
process.env.CORS_ORIGIN = "*";

const fail = (message) => {
  throw new Error(message);
};

const main = async () => {
  const { database } = require("../backend/dist/database/connection");
  const { getMigrationStatus, runMigrations } = require("../backend/dist/database/migrationRunner");

  runMigrations(database);
  runMigrations(database);

  const status = getMigrationStatus(database);
  if (status.pending.length !== 0) {
    fail(`expected zero pending migrations, got ${status.pending.length}`);
  }

  const appliedRows = database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get();
  if (!appliedRows || appliedRows.count < 3) {
    fail("expected schema_migrations to contain applied migration records");
  }

  const indexes = database.pragma("index_list(sync_entities)").map((index) => index.name);
  [
    "idx_sync_entities_user_id",
    "idx_sync_entities_user_server_updated",
    "idx_sync_entities_user_entity_type",
    "idx_sync_entities_user_local_updated",
    "idx_sync_entities_user_deleted_at",
  ].forEach((indexName) => {
    if (!indexes.includes(indexName)) {
      fail(`missing sync_entities index ${indexName}`);
    }
  });

  const { app } = require("../backend/dist/app");
  const server = app.listen(0);

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      fail("unable to bind migration smoke server");
    }

    const baseUrl = `http://127.0.0.1:${address.port}`;
    const health = await fetch(`${baseUrl}/health`);
    const statusResponse = await fetch(`${baseUrl}/status`);

    if (health.status !== 200) {
      fail(`/health returned ${health.status}`);
    }

    if (statusResponse.status !== 200) {
      fail(`/status returned ${statusResponse.status}`);
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }

  database.close();
  console.log("migration smoke test passed");
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "migration smoke test failed");
    process.exitCode = 1;
  })
  .finally(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });
