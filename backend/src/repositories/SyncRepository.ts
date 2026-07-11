import { database } from "../database/connection";
import type { SyncEntityType, SyncOperation, SyncQueueItem } from "../types/contracts";

type SyncEntityRow = {
  user_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  sync_item_id: string;
  operation: SyncOperation;
  payload_json: string | null;
  local_updated_at: string;
  queued_at: string;
  retry_count: number;
  server_updated_at: string;
  deleted_at: string | null;
};

export type SyncEntityRecord = {
  userId: string;
  entityType: SyncEntityType;
  entityId: string;
  syncItemId: string;
  operation: SyncOperation;
  payload: unknown;
  localUpdatedAt: string;
  queuedAt: string;
  retryCount: number;
  serverUpdatedAt: string;
  deletedAt: string | null;
};

export type SyncEntityExportRecord = {
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  localUpdatedAt: string;
  queuedAt: string;
  retryCount: number;
  serverUpdatedAt: string;
  deletedAt: string | null;
};

const parsePayload = (value: string | null): unknown => {
  if (value === null) return null;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const toRecord = (row: SyncEntityRow): SyncEntityRecord => ({
  userId: row.user_id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  syncItemId: row.sync_item_id,
  operation: row.operation,
  payload: parsePayload(row.payload_json),
  localUpdatedAt: row.local_updated_at,
  queuedAt: row.queued_at,
  retryCount: row.retry_count,
  serverUpdatedAt: row.server_updated_at,
  deletedAt: row.deleted_at,
});

const toQueueItem = (record: SyncEntityRecord): SyncQueueItem => ({
  id: record.syncItemId,
  entityType: record.entityType,
  entityId: record.entityId,
  operation: record.operation,
  payload: record.payload,
  localUpdatedAt: record.localUpdatedAt,
  queuedAt: record.queuedAt,
  retryCount: record.retryCount,
});

const toExportRecord = (record: SyncEntityRecord): SyncEntityExportRecord => ({
  entityType: record.entityType,
  entityId: record.entityId,
  operation: record.operation,
  localUpdatedAt: record.localUpdatedAt,
  queuedAt: record.queuedAt,
  retryCount: record.retryCount,
  serverUpdatedAt: record.serverUpdatedAt,
  deletedAt: record.deletedAt,
});

export class SyncRepository {
  find(userId: string, entityType: SyncEntityType, entityId: string): SyncEntityRecord | null {
    const row = database.prepare(`
      SELECT * FROM sync_entities
      WHERE user_id = ? AND entity_type = ? AND entity_id = ?
    `).get(userId, entityType, entityId) as SyncEntityRow | undefined;

    return row ? toRecord(row) : null;
  }

  list(userId: string, updatedAfter?: string): SyncQueueItem[] {
    const rows = updatedAfter
      ? database.prepare(`
          SELECT * FROM sync_entities
          WHERE user_id = ? AND server_updated_at > ?
          ORDER BY server_updated_at ASC
        `).all(userId, updatedAfter) as SyncEntityRow[]
      : database.prepare(`
          SELECT * FROM sync_entities
          WHERE user_id = ?
          ORDER BY server_updated_at ASC
        `).all(userId) as SyncEntityRow[];

    return rows.map(toRecord).map(toQueueItem);
  }

  listExportRecords(userId: string): SyncEntityExportRecord[] {
    const rows = database.prepare(`
      SELECT * FROM sync_entities
      WHERE user_id = ?
      ORDER BY server_updated_at ASC
      LIMIT 1000
    `).all(userId) as SyncEntityRow[];

    return rows.map(toRecord).map(toExportRecord);
  }

  deleteAllForUser(userId: string): number {
    const result = database.prepare(`
      DELETE FROM sync_entities
      WHERE user_id = ?
    `).run(userId);

    return result.changes;
  }

  upsert(userId: string, item: SyncQueueItem, serverUpdatedAt: string): SyncEntityRecord {
    const deletedAt = item.operation === "delete" ? serverUpdatedAt : null;
    const payloadJson = item.operation === "delete" ? null : JSON.stringify(item.payload ?? null);

    database.prepare(`
      INSERT INTO sync_entities (
        user_id, entity_type, entity_id, sync_item_id, operation, payload_json,
        local_updated_at, queued_at, retry_count, server_updated_at, deleted_at
      )
      VALUES (
        @userId, @entityType, @entityId, @syncItemId, @operation, @payloadJson,
        @localUpdatedAt, @queuedAt, @retryCount, @serverUpdatedAt, @deletedAt
      )
      ON CONFLICT(user_id, entity_type, entity_id) DO UPDATE SET
        sync_item_id = excluded.sync_item_id,
        operation = excluded.operation,
        payload_json = excluded.payload_json,
        local_updated_at = excluded.local_updated_at,
        queued_at = excluded.queued_at,
        retry_count = excluded.retry_count,
        server_updated_at = excluded.server_updated_at,
        deleted_at = excluded.deleted_at
    `).run({
      userId,
      entityType: item.entityType,
      entityId: item.entityId,
      syncItemId: item.id,
      operation: item.operation,
      payloadJson,
      localUpdatedAt: item.localUpdatedAt,
      queuedAt: item.queuedAt,
      retryCount: item.retryCount,
      serverUpdatedAt,
      deletedAt,
    });

    return this.find(userId, item.entityType, item.entityId) ?? {
      userId,
      entityType: item.entityType,
      entityId: item.entityId,
      syncItemId: item.id,
      operation: item.operation,
      payload: item.operation === "delete" ? null : item.payload,
      localUpdatedAt: item.localUpdatedAt,
      queuedAt: item.queuedAt,
      retryCount: item.retryCount,
      serverUpdatedAt,
      deletedAt,
    };
  }
}
