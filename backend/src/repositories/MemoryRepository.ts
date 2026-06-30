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
  content: string | null;
  summary: string | null;
  type: string | null;
  source: string | null;
  importance: number | null;
  metadata_json: string | null;
  embedding_json: string | null;
};

const parseJsonRecord = (value: string | null): Record<string, unknown> | undefined => {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as unknown;

    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
};

const parseJsonArray = (value: string | null): number[] | null | undefined => {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as unknown;

    return Array.isArray(parsed) && parsed.every((item) => typeof item === "number") ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const toMemory = (row: MemoryRow): MemoryRecord => ({
  id: row.id,
  category: row.category,
  value: row.value,
  sourceMessage: row.source_message,
  confidence: row.confidence,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  content: row.content ?? undefined,
  summary: row.summary ?? undefined,
  type: row.type ?? undefined,
  source: row.source ?? undefined,
  importance: row.importance ?? undefined,
  metadata: parseJsonRecord(row.metadata_json),
  embedding: parseJsonArray(row.embedding_json),
});

const normalizeText = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ");

const mergeMetadata = (
  current: Record<string, unknown> | undefined,
  incoming: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!current && !incoming) return undefined;

  return {
    ...(current ?? {}),
    ...(incoming ?? {}),
  };
};

const mergeMemories = (current: MemoryRecord | null, incoming: MemoryRecord): MemoryRecord => {
  if (!current) return incoming;

  const incomingNewer = incoming.updatedAt.localeCompare(current.updatedAt) >= 0;
  const winner = incomingNewer ? incoming : current;
  const fallback = incomingNewer ? current : incoming;

  return {
    ...fallback,
    ...winner,
    id: current.id,
    metadata: mergeMetadata(fallback.metadata, winner.metadata),
    embedding: winner.embedding ?? fallback.embedding,
    content: winner.content ?? fallback.content,
    summary: winner.summary ?? fallback.summary,
    type: winner.type ?? fallback.type,
    source: winner.source ?? fallback.source,
    importance: winner.importance ?? fallback.importance,
  };
};

export class MemoryRepository {
  list(userId: string): MemoryRecord[] {
    const rows = database.prepare("SELECT * FROM memories WHERE user_id = ? ORDER BY updated_at DESC")
      .all(userId) as MemoryRow[];

    return rows.map(toMemory);
  }

  upsert(userId: string, memory: MemoryRecord): MemoryRecord {
    const duplicate = database.prepare(`
      SELECT * FROM memories
      WHERE user_id = ?
        AND lower(category) = lower(?)
        AND lower(value) = lower(?)
      ORDER BY created_at ASC
      LIMIT 1
    `).get(userId, memory.category, normalizeText(memory.value)) as MemoryRow | undefined;
    const currentById = database.prepare("SELECT * FROM memories WHERE user_id = ? AND id = ?")
      .get(userId, duplicate?.id ?? memory.id) as MemoryRow | undefined;
    const current = currentById ? toMemory(currentById) : null;
    const nextMemory = mergeMemories(current, {
      ...memory,
      id: duplicate?.id ?? memory.id,
      content: memory.content ?? memory.value,
      summary: memory.summary ?? memory.value,
      type: memory.type ?? memory.category,
      source: memory.source ?? "conversation",
      importance: memory.importance ?? Math.round(memory.confidence * 100),
      metadata: mergeMetadata({ category: memory.category }, memory.metadata),
    });

    database.prepare(`
      INSERT INTO memories (
        id, user_id, category, value, source_message, confidence, created_at, updated_at,
        content, summary, type, source, importance, metadata_json, embedding_json
      )
      VALUES (
        @id, @userId, @category, @value, @sourceMessage, @confidence, @createdAt, @updatedAt,
        @content, @summary, @type, @source, @importance, @metadataJson, @embeddingJson
      )
      ON CONFLICT(id, user_id) DO UPDATE SET
        category = excluded.category,
        value = excluded.value,
        source_message = excluded.source_message,
        confidence = excluded.confidence,
        updated_at = excluded.updated_at,
        content = excluded.content,
        summary = excluded.summary,
        type = excluded.type,
        source = excluded.source,
        importance = excluded.importance,
        metadata_json = excluded.metadata_json,
        embedding_json = excluded.embedding_json
      WHERE excluded.updated_at >= memories.updated_at
    `).run({
      ...nextMemory,
      userId,
      metadataJson: nextMemory.metadata ? JSON.stringify(nextMemory.metadata) : null,
      embeddingJson: nextMemory.embedding ? JSON.stringify(nextMemory.embedding) : null,
    });

    const saved = database.prepare("SELECT * FROM memories WHERE user_id = ? AND id = ?")
      .get(userId, nextMemory.id) as MemoryRow | undefined;

    return saved ? toMemory(saved) : nextMemory;
  }

  delete(userId: string, id: string): void {
    database.prepare("DELETE FROM memories WHERE user_id = ? AND id = ?").run(userId, id);
  }
}
