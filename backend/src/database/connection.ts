import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../config/env";

mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });

export const database = new Database(env.DATABASE_PATH);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

export function initializeDatabase(): void {
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
  `);

  const memoryColumns = database.pragma("table_info(memories)") as Array<{ name: string }>;
  const existingMemoryColumns = new Set(memoryColumns.map((column) => column.name));
  const addMemoryColumn = (name: string, definition: string): void => {
    if (!existingMemoryColumns.has(name)) {
      database.prepare(`ALTER TABLE memories ADD COLUMN ${name} ${definition}`).run();
    }
  };

  addMemoryColumn("content", "TEXT");
  addMemoryColumn("summary", "TEXT");
  addMemoryColumn("type", "TEXT");
  addMemoryColumn("source", "TEXT");
  addMemoryColumn("importance", "REAL");
  addMemoryColumn("metadata_json", "TEXT");
  addMemoryColumn("embedding_json", "TEXT");
}
