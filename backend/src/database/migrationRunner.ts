import type { Database } from "better-sqlite3";
import { migrations } from "./migrations";

export type AppliedMigration = {
  id: string;
  name: string;
  appliedAt: string;
};

export type MigrationStatus = {
  applied: AppliedMigration[];
  pending: Array<{ id: string; name: string }>;
};

const ensureSchemaMigrationsTable = (database: Database): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
};

const readAppliedMigrationIds = (database: Database): Set<string> => {
  ensureSchemaMigrationsTable(database);

  const rows = database.prepare(`
    SELECT id FROM schema_migrations
    ORDER BY id ASC
  `).all() as Array<{ id: string }>;

  return new Set(rows.map((row) => row.id));
};

export const runMigrations = (database: Database): MigrationStatus => {
  ensureSchemaMigrationsTable(database);

  const appliedIds = readAppliedMigrationIds(database);
  const pending = migrations.filter((migration) => !appliedIds.has(migration.id));
  const applyMigration = database.transaction((migration: (typeof migrations)[number]) => {
    migration.up(database);
    database.prepare(`
      INSERT INTO schema_migrations (id, name, applied_at)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(migration.id, migration.name, new Date().toISOString());
  });

  pending.forEach((migration) => applyMigration(migration));

  return getMigrationStatus(database);
};

export const getMigrationStatus = (database: Database): MigrationStatus => {
  ensureSchemaMigrationsTable(database);

  const applied = database.prepare(`
    SELECT id, name, applied_at AS appliedAt
    FROM schema_migrations
    ORDER BY id ASC
  `).all() as AppliedMigration[];
  const appliedIds = new Set(applied.map((migration) => migration.id));
  const pending = migrations
    .filter((migration) => !appliedIds.has(migration.id))
    .map((migration) => ({ id: migration.id, name: migration.name }));

  return { applied, pending };
};
