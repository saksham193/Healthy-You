import type { Database } from "better-sqlite3";

export type Migration = {
  id: string;
  name: string;
  up: (database: Database) => void;
};

const columnExists = (database: Database, tableName: string, columnName: string): boolean => {
  const columns = database.pragma(`table_info(${tableName})`) as Array<{ name: string }>;

  return columns.some((column) => column.name === columnName);
};

const addColumnIfMissing = (
  database: Database,
  tableName: string,
  columnName: string,
  definition: string,
): void => {
  if (!columnExists(database, tableName, columnName)) {
    database.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run();
  }
};

export const migrations: Migration[] = [
  {
    id: "202607110001",
    name: "initial_backend_schema",
    up: (database) => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS refresh_tokens (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          revoked_at TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS memories (
          id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          category TEXT NOT NULL,
          value TEXT NOT NULL,
          source_message TEXT NOT NULL,
          confidence REAL NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          content TEXT,
          summary TEXT,
          type TEXT,
          source TEXT,
          importance REAL,
          metadata_json TEXT,
          embedding_json TEXT,
          PRIMARY KEY (id, user_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS health_profiles (
          user_id TEXT PRIMARY KEY,
          profile_json TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS health_summaries (
          id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          date TEXT NOT NULL,
          source TEXT NOT NULL,
          device_source TEXT NOT NULL,
          display_source TEXT NOT NULL,
          summary_type TEXT NOT NULL,
          metrics_json TEXT NOT NULL,
          scores_json TEXT NOT NULL,
          sync_metadata_json TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (user_id, date, summary_type),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS insights (
          id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (id, user_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sync_entities (
          user_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          sync_item_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          payload_json TEXT,
          local_updated_at TEXT NOT NULL,
          queued_at TEXT NOT NULL,
          retry_count INTEGER NOT NULL DEFAULT 0,
          server_updated_at TEXT NOT NULL,
          deleted_at TEXT,
          PRIMARY KEY (user_id, entity_type, entity_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
    },
  },
  {
    id: "202607110002",
    name: "memory_optional_columns",
    up: (database) => {
      addColumnIfMissing(database, "memories", "content", "TEXT");
      addColumnIfMissing(database, "memories", "summary", "TEXT");
      addColumnIfMissing(database, "memories", "type", "TEXT");
      addColumnIfMissing(database, "memories", "source", "TEXT");
      addColumnIfMissing(database, "memories", "importance", "REAL");
      addColumnIfMissing(database, "memories", "metadata_json", "TEXT");
      addColumnIfMissing(database, "memories", "embedding_json", "TEXT");
    },
  },
  {
    id: "202607110003",
    name: "sync_entity_indexes",
    up: (database) => {
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_sync_entities_user_id
          ON sync_entities (user_id);

        CREATE INDEX IF NOT EXISTS idx_sync_entities_user_server_updated
          ON sync_entities (user_id, server_updated_at);

        CREATE INDEX IF NOT EXISTS idx_sync_entities_user_entity_type
          ON sync_entities (user_id, entity_type);

        CREATE INDEX IF NOT EXISTS idx_sync_entities_user_local_updated
          ON sync_entities (user_id, local_updated_at);

        CREATE INDEX IF NOT EXISTS idx_sync_entities_user_deleted_at
          ON sync_entities (user_id, deleted_at);
      `);
    },
  },
];
