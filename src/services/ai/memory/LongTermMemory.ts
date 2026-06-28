import type { MemoryInput, MemoryRecord, MemorySearchOptions } from "../types";
import { deleteMemory as deleteRemoteMemory, fetchMemories, saveMemory as saveRemoteMemory } from "../../api/MemoryApi";
import { offlineMemoryQueue } from "../../local-ai/OfflineMemoryQueue";
import { extractMemoriesFromMessage } from "./MemoryExtractor";
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

export class LongTermMemory {
  constructor(private readonly store: MemoryPersistence = memoryStore) {}

  async saveMemory(memory: MemoryInput): Promise<MemoryRecord> {
    const records = await this.store.read();
    const id = createId(memory);
    const existing = records.find((record) => record.id === id);
    const now = new Date().toISOString();
    const nextRecord: MemoryRecord = existing
      ? {
          ...existing,
          sourceMessage: memory.sourceMessage,
          confidence: Math.max(existing.confidence, memory.confidence),
          updatedAt: now,
        }
      : {
          ...memory,
          id,
          createdAt: now,
          updatedAt: now,
        };

    const nextRecords = existing
      ? records.map((record) => (record.id === id ? nextRecord : record))
      : [...records, nextRecord];

    await this.store.write(nextRecords);
    void offlineMemoryQueue.syncOrQueue(nextRecord).catch(() => undefined);

    return nextRecord;
  }

  async saveMemories(memories: MemoryInput[]): Promise<MemoryRecord[]> {
    const saved: MemoryRecord[] = [];

    for (const memory of memories) {
      saved.push(await this.saveMemory(memory));
    }

    return saved;
  }

  async saveMemoriesFromMessage(message: string): Promise<MemoryRecord[]> {
    return this.saveMemories(extractMemoriesFromMessage(message));
  }

  async getMemories(): Promise<MemoryRecord[]> {
    const localRecords = await this.store.read();

    try {
      const remoteRecords = await fetchMemories();
      const merged = mergeRecords(localRecords, remoteRecords);
      const remoteRecordsById = new Map(remoteRecords.map((record) => [record.id, record]));
      const localRecordsToSync = localRecords.filter((record) => {
        const remoteRecord = remoteRecordsById.get(record.id);

        return !remoteRecord || record.updatedAt.localeCompare(remoteRecord.updatedAt) > 0;
      });

      await Promise.allSettled(localRecordsToSync.map((record) => saveRemoteMemory(record)));

      await this.store.write(merged);

      return merged;
    } catch {
      return localRecords;
    }
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
    void deleteRemoteMemory(id).catch(() => undefined);
  }
}

export const longTermMemory = new LongTermMemory();

const mergeRecords = (localRecords: MemoryRecord[], remoteRecords: MemoryRecord[]): MemoryRecord[] => {
  const recordsById = new Map<string, MemoryRecord>();

  [...localRecords, ...remoteRecords].forEach((record) => {
    const existing = recordsById.get(record.id);

    if (!existing || record.updatedAt.localeCompare(existing.updatedAt) >= 0) {
      recordsById.set(record.id, record);
    }
  });

  return Array.from(recordsById.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};
