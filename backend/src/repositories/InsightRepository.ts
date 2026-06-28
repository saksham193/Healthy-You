import { database } from "../database/connection";
import type { InsightRecord } from "../types/api";

type InsightRow = {
  id: string;
  user_id: string;
  payload_json: string;
  created_at: string;
};

const toRecord = (row: InsightRow): InsightRecord => ({
  id: row.id,
  userId: row.user_id,
  payloadJson: row.payload_json,
  createdAt: row.created_at,
});

export class InsightRepository {
  list(userId: string): InsightRecord[] {
    const rows = database.prepare("SELECT * FROM insights WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId) as InsightRow[];

    return rows.map(toRecord);
  }

  create(record: InsightRecord): InsightRecord {
    database.prepare(`
      INSERT OR REPLACE INTO insights (id, user_id, payload_json, created_at)
      VALUES (@id, @userId, @payloadJson, @createdAt)
    `).run(record);

    return record;
  }
}
