import { database } from "../database/connection";
import type { MemoryRecord } from "../types/api";

type MemoryRow = {
  id: string;
  user_id: string;
  category: string;
  value: string;
  source_message: string;
  confidence: number;
  created_at: string;
  updated_at: string;
};

const toMemory = (row: MemoryRow): MemoryRecord => ({
  id: row.id,
  category: row.category,
  value: row.value,
  sourceMessage: row.source_message,
  confidence: row.confidence,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class MemoryRepository {
  list(userId: string): MemoryRecord[] {
    const rows = database.prepare("SELECT * FROM memories WHERE user_id = ? ORDER BY updated_at DESC")
      .all(userId) as MemoryRow[];

    return rows.map(toMemory);
  }

  upsert(userId: string, memory: MemoryRecord): MemoryRecord {
    database.prepare(`
      INSERT INTO memories (
        id, user_id, category, value, source_message, confidence, created_at, updated_at
      )
      VALUES (@id, @userId, @category, @value, @sourceMessage, @confidence, @createdAt, @updatedAt)
      ON CONFLICT(id, user_id) DO UPDATE SET
        category = excluded.category,
        value = excluded.value,
        source_message = excluded.source_message,
        confidence = excluded.confidence,
        updated_at = excluded.updated_at
    `).run({
      ...memory,
      userId,
    });

    return memory;
  }

  delete(userId: string, id: string): void {
    database.prepare("DELETE FROM memories WHERE user_id = ? AND id = ?").run(userId, id);
  }
}
