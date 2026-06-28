import { database } from "../database/connection";
import type { HealthProfileRecord } from "../types/api";

type ProfileRow = {
  user_id: string;
  profile_json: string;
  updated_at: string;
};

const toRecord = (row: ProfileRow): HealthProfileRecord => ({
  userId: row.user_id,
  profileJson: row.profile_json,
  updatedAt: row.updated_at,
});

export class HealthProfileRepository {
  get(userId: string): HealthProfileRecord | null {
    const row = database.prepare("SELECT * FROM health_profiles WHERE user_id = ?").get(userId) as ProfileRow | undefined;

    return row ? toRecord(row) : null;
  }

  upsert(record: HealthProfileRecord): HealthProfileRecord {
    database.prepare(`
      INSERT INTO health_profiles (user_id, profile_json, updated_at)
      VALUES (@userId, @profileJson, @updatedAt)
      ON CONFLICT(user_id) DO UPDATE SET
        profile_json = excluded.profile_json,
        updated_at = excluded.updated_at
      WHERE excluded.updated_at >= health_profiles.updated_at
    `).run(record);

    return this.get(record.userId) ?? record;
  }
}
