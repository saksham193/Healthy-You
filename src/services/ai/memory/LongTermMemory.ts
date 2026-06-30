import type { MemoryInput, MemoryRecord, MemorySearchOptions } from "../types";
import {
  mergeLocalAndRemoteMemories,
  offlineMemoryQueue,
} from "../../local-ai/OfflineMemoryQueue";
import { extractMemoriesFromMessage } from "./MemoryExtractor";
import { filterCloudSafeMemories, isCloudSafeMemory } from "./MemoryPrivacy";
import { memoryStore, type MemoryPersistence } from "./MemoryStore";

const createId = (memory: MemoryInput): string =>
  `${memory.category}-${memory.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const matchesQuery = (record: MemoryRecord, query: string): boolean => {
  const normalized = query.toLowerCase();

  return (
    record.value.toLowerCase().includes(normalized) ||
    record.sourceMessage.toLowerCase().includes(normalized) ||
    record.category.toLowerCase().includes(normalized)
  );
};

const categoryTypeMap: Record<MemoryRecord["category"], NonNullable<MemoryRecord["type"]>> = {
  goal: "goal",
  dietary_preference: "preference",
  allergy: "health",
  health_concern: "health",
  medication_habit: "medication",
  exercise_preference: "fitness",
  recurring_topic: "conversation",
  important_recommendation: "other",
};

const enrichMemoryRecord = (memory: MemoryInput, existing: MemoryRecord | undefined, now: string): MemoryRecord => ({
  ...(existing ?? {}),
  ...memory,
  id: existing?.id ?? createId(memory),
  content: memory.content ?? memory.value,
  summary: memory.summary ?? memory.value,
  type: memory.type ?? categoryTypeMap[memory.category] ?? "other",
  source: memory.source ?? "conversation",
  importance: memory.importance ?? Math.round(memory.confidence * 100),
  metadata: {
    ...(existing?.metadata ?? {}),
    ...(memory.metadata ?? {}),
    category: memory.category,
  },
  createdAt: existing?.createdAt ?? now,
  updatedAt: now,
});

export class LongTermMemory {
  constructor(private readonly store: MemoryPersistence = memoryStore) {}

  async saveMemory(memory: MemoryInput): Promise<MemoryRecord> {
    const records = await this.store.read();
    const id = createId(memory);
    const existing = records.find((record) => record.id === id);
    const now = new Date().toISOString();
    const nextRecord = enrichMemoryRecord({
      ...memory,
      confidence: existing ? Math.max(existing.confidence, memory.confidence) : memory.confidence,
    }, existing, now);

    const nextRecords = existing
      ? records.map((record) => (record.id === id ? nextRecord : record))
      : [...records, nextRecord];

    await this.store.write(nextRecords);
    if (isCloudSafeMemory(nextRecord)) {
      void offlineMemoryQueue.syncOrQueue(nextRecord).catch(() => undefined);
    }

    return nextRecord;
  }

  async saveMemories(memories: MemoryInput[]): Promise<MemoryRecord[]> {
    const saved: MemoryRecord[] = [];

    for (const memory of filterCloudSafeMemories(memories)) {
      saved.push(await this.saveMemory(memory));
    }

    return saved;
  }

  async saveMemoriesFromMessage(message: string): Promise<MemoryRecord[]> {
    return this.saveMemories(extractMemoriesFromMessage(message));
  }

  async getMemories(): Promise<MemoryRecord[]> {
    return this.store.read();
  }

  async syncMemoriesToCloud(): Promise<void> {
    await offlineMemoryQueue.syncMemoriesToCloud(await this.store.read());
  }

  async loadMemoriesFromCloud(): Promise<MemoryRecord[]> {
    const merged = await offlineMemoryQueue.loadMemoriesFromCloud(await this.store.read());

    await this.store.write(merged);

    return merged;
  }

  async queueMemoryWrites(memories: MemoryRecord | MemoryRecord[]): Promise<void> {
    await offlineMemoryQueue.queueMemoryWrites(memories);
  }

  async flushQueuedMemoryWrites(): Promise<void> {
    await offlineMemoryQueue.flushQueuedMemoryWrites();
  }

  mergeLocalAndRemoteMemories(localRecords: MemoryRecord[], remoteRecords: MemoryRecord[]): MemoryRecord[] {
    return mergeLocalAndRemoteMemories(localRecords, remoteRecords);
  }

  async searchMemories(options: MemorySearchOptions): Promise<MemoryRecord[]> {
    const records = await this.getMemories();
    const filtered = records.filter((record) => {
      const categoryMatch = options.categories ? options.categories.includes(record.category) : true;
      const queryMatch = options.query ? matchesQuery(record, options.query) : true;

      return categoryMatch && queryMatch;
    });

    return filtered.slice(0, options.limit ?? filtered.length);
  }

  async getRelevantMemories(message: string, limit = 6): Promise<MemoryRecord[]> {
    return this.scoreRelevantMemories(message, limit, await this.getMemories());
  }

  async getRelevantLocalMemories(message: string, limit = 6): Promise<MemoryRecord[]> {
    return this.scoreRelevantMemories(message, limit, await this.store.read());
  }

  private scoreRelevantMemories(message: string, limit: number, records: MemoryRecord[]): MemoryRecord[] {
    const tokens = message
      .toLowerCase()
      .split(/\W+/)
      .filter((token) => token.length > 3);
    const scored = records
      .map((record) => {
        const haystack = `${record.category} ${record.value} ${record.sourceMessage}`.toLowerCase();
        const score = tokens.filter((token) => haystack.includes(token)).length;

        return { record, score };
      })
      .sort((left, right) => right.score - left.score || right.record.updatedAt.localeCompare(left.record.updatedAt));

    return scored
      .filter((item) => item.score > 0)
      .map((item) => item.record)
      .slice(0, limit);
  }

  async deleteMemory(id: string): Promise<void> {
    const records = await this.store.read();

    await this.store.write(records.filter((record) => record.id !== id));
    void offlineMemoryQueue.deleteSyncedMemory(id).catch(() => undefined);
  }
}

export const longTermMemory = new LongTermMemory();
