import { database } from "../database/connection";
import type { HealthSummaryRecord } from "../types/api";

type HealthSummaryRow = {
  id: string;
  user_id: string;
  date: string;
  source: string;
  device_source: string;
  display_source: string;
  summary_type: string;
  metrics_json: string;
  scores_json: string;
  sync_metadata_json: string;
  updated_at: string;
};

const parseRecord = (value: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(value) as unknown;

    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
};

const numericRecord = (value: string): Record<string, number> => {
  const parsed = parseRecord(value);
  const entries = Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === "number");

  return Object.fromEntries(entries);
};

const toSummary = (row: HealthSummaryRow): HealthSummaryRecord => ({
  id: row.id,
  userId: row.user_id,
  date: row.date,
  source: row.source,
  deviceSource: row.device_source,
  displaySource: row.display_source,
  summaryType: row.summary_type,
  metrics: numericRecord(row.metrics_json),
  scores: numericRecord(row.scores_json),
  syncMetadata: parseRecord(row.sync_metadata_json),
  updatedAt: row.updated_at,
});

export class HealthSummaryRepository {
  list(userId: string): HealthSummaryRecord[] {
    const rows = database.prepare(`
      SELECT * FROM health_summaries
      WHERE user_id = ?
      ORDER BY date DESC, updated_at DESC
    `).all(userId) as HealthSummaryRow[];

    return rows.map(toSummary);
  }

  upsert(userId: string, summary: Omit<HealthSummaryRecord, "userId">): HealthSummaryRecord {
    database.prepare(`
      INSERT INTO health_summaries (
        id, user_id, date, source, device_source, display_source, summary_type,
        metrics_json, scores_json, sync_metadata_json, updated_at
      )
      VALUES (
        @id, @userId, @date, @source, @deviceSource, @displaySource, @summaryType,
        @metricsJson, @scoresJson, @syncMetadataJson, @updatedAt
      )
      ON CONFLICT(user_id, date, summary_type) DO UPDATE SET
        id = excluded.id,
        source = excluded.source,
        device_source = excluded.device_source,
        display_source = excluded.display_source,
        metrics_json = excluded.metrics_json,
        scores_json = excluded.scores_json,
        sync_metadata_json = excluded.sync_metadata_json,
        updated_at = excluded.updated_at
      WHERE excluded.updated_at >= health_summaries.updated_at
    `).run({
      ...summary,
      userId,
      metricsJson: JSON.stringify(summary.metrics),
      scoresJson: JSON.stringify(summary.scores),
      syncMetadataJson: JSON.stringify(summary.syncMetadata),
    });

    const row = database.prepare(`
      SELECT * FROM health_summaries
      WHERE user_id = ? AND date = ? AND summary_type = ?
    `).get(userId, summary.date, summary.summaryType) as HealthSummaryRow | undefined;

    return row ? toSummary(row) : { ...summary, userId };
  }

  delete(userId: string, id: string): void {
    database.prepare("DELETE FROM health_summaries WHERE user_id = ? AND id = ?").run(userId, id);
  }
}
