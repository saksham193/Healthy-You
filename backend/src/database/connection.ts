import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../config/env";
import { runMigrations } from "./migrationRunner";

mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });

export const database = new Database(env.DATABASE_PATH);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

export function initializeDatabase(): void {
  runMigrations(database);
}
