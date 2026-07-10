import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MemoryRecord } from "../../types";
import { connectivityService } from "../connectivity/ConnectivityService";
import { offlineAnalytics } from "../observability/OfflineAnalytics";
import { deleteMemory as deleteRemoteMemory, fetchMemories, saveMemory as saveRemoteMemory } from "../api/MemoryApi";
import { isCloudSafeMemory } from "../ai/memory/MemoryPrivacy";
import { isCloudSyncEnabled } from "../sync/syncFeatureFlags";
import type { OfflineMemoryQueueItem } from "./types";

const QUEUE_KEY = "healthy-you.local-ai.memory-sync-queue";
const MAX_QUEUE_ITEMS = 50;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stableTimestamp = (value: string | undefined): number => {
  const parsed = value ? Date.parse(value) : Number.NaN;

  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeText = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ");

export const memoryFingerprint = (memory: MemoryRecord): string =>
  `${memory.category}:${normalizeText(memory.value)}:${stableTimestamp(memory.createdAt) || stableTimestamp(memory.updatedAt)}`;

const mergeMetadata = (
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!left && !right) return undefined;

  return {
    ...(left ?? {}),
    ...(right ?? {}),
  };
};

export const mergeMemoryRecords = (localRecord: MemoryRecord, remoteRecord: MemoryRecord): MemoryRecord => {
  const localNewer = localRecord.updatedAt.localeCompare(remoteRecord.updatedAt) >= 0;
  const winner = localNewer ? localRecord : remoteRecord;
  const fallback = localNewer ? remoteRecord : localRecord;

  return {
    ...fallback,
    ...winner,
    metadata: mergeMetadata(fallback.metadata, winner.metadata),
    embedding: winner.embedding ?? fallback.embedding,
    content: winner.content ?? fallback.content,
    summary: winner.summary ?? fallback.summary,
    type: winner.type ?? fallback.type,
    source: winner.source ?? fallback.source,
    importance: winner.importance ?? fallback.importance,
  };
};

export const mergeLocalAndRemoteMemories = (
  localRecords: MemoryRecord[],
  remoteRecords: MemoryRecord[],
): MemoryRecord[] => {
  const byId = new Map<string, MemoryRecord>();
  const byFingerprint = new Map<string, string>();

  for (const record of [...localRecords, ...remoteRecords]) {
    const fingerprint = memoryFingerprint(record);
    const matchingId = byId.has(record.id) ? record.id : byFingerprint.get(fingerprint);

    if (matchingId) {
      const existing = byId.get(matchingId);

      if (existing) {
        const merged = mergeMemoryRecords(existing, record);
        byId.delete(matchingId);
        byId.set(merged.id, merged);
        byFingerprint.set(fingerprint, merged.id);
      }
    } else {
      byId.set(record.id, record);
      byFingerprint.set(fingerprint, record.id);
    }
  }

  return Array.from(byId.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};

const isQueuedMemoryItem = (value: unknown): value is OfflineMemoryQueueItem => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.timestamp === "string" &&
    isRecord(value.memory) &&
    typeof value.memory.id === "string"
  );
};

export class OfflineMemoryQueue {
  private flushing = false;

  constructor() {
    if (!isCloudSyncEnabled()) return;

    connectivityService.subscribe((status) => {
      if (status.isOnline) {
        void this.flushQueuedMemoryWrites();
      }
    });
  }

  async syncOrQueue(memory: MemoryRecord): Promise<void> {
    if (!isCloudSyncEnabled()) return;
    if (!isCloudSafeMemory(memory)) return;

    const online = await connectivityService.isOnline();

    if (!online) {
      offlineAnalytics.trackMemoryQueue();
      await this.queueMemoryWrites(memory, "offline");
      return;
    }

    try {
      await saveRemoteMemory(memory);
      await this.flushQueuedMemoryWrites();
    } catch {
      offlineAnalytics.trackMemoryQueue();
      await this.queueMemoryWrites(memory, "sync-failure");
    }
  }

  async syncMemoriesToCloud(memories: MemoryRecord[]): Promise<void> {
    if (!isCloudSyncEnabled()) return;

    const safeMemories = memories.filter(isCloudSafeMemory);

    if (!(await connectivityService.isOnline())) {
      await this.queueMemoryWrites(safeMemories, "offline");
      return;
    }

    await this.flushQueuedMemoryWrites();
    await Promise.allSettled(safeMemories.map((memory) => this.syncOrQueue(memory)));
  }

  async loadMemoriesFromCloud(localMemories: MemoryRecord[]): Promise<MemoryRecord[]> {
    if (!isCloudSyncEnabled()) return localMemories;
    if (!(await connectivityService.isOnline())) return localMemories;

    try {
      const remoteMemories = await fetchMemories();
      const merged = mergeLocalAndRemoteMemories(localMemories, remoteMemories);
      const remoteById = new Map(remoteMemories.map((record) => [record.id, record]));
      const remoteFingerprints = new Set(remoteMemories.map(memoryFingerprint));
      const missingOrNewerLocal = merged.filter((record) => {
        const remote = remoteById.get(record.id);

        return (
          isCloudSafeMemory(record) &&
          (!remote || record.updatedAt.localeCompare(remote.updatedAt) > 0) &&
          !remoteFingerprints.has(memoryFingerprint(record))
        );
      });

      void this.syncMemoriesToCloud(missingOrNewerLocal).catch(() => undefined);

      return merged;
    } catch {
      return localMemories;
    }
  }

  async queueMemoryWrites(
    memories: MemoryRecord | MemoryRecord[],
    source: OfflineMemoryQueueItem["source"] = "offline",
  ): Promise<void> {
    if (!isCloudSyncEnabled()) return;

    const safeMemories = (Array.isArray(memories) ? memories : [memories]).filter(isCloudSafeMemory);

    if (safeMemories.length === 0) return;

    const queue = await this.read();
    const items = safeMemories.map((memory): OfflineMemoryQueueItem => {
      const existing = queue.find((queued) => queued.id === memory.id);

      return {
        id: memory.id,
        memory,
        source,
        timestamp: new Date().toISOString(),
        attempts: existing?.attempts ?? 0,
        lastAttemptAt: existing?.lastAttemptAt,
      };
    });
    const itemIds = new Set(items.map((item) => item.id));
    const next = this.dedupe([...items, ...queue.filter((queued) => !itemIds.has(queued.id))])
      .slice(0, MAX_QUEUE_ITEMS);

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  }

  async flushQueuedMemoryWrites(): Promise<void> {
    if (!isCloudSyncEnabled()) return;
    if (this.flushing) return;
    if (!(await connectivityService.isOnline())) return;

    this.flushing = true;

    try {
      const queue = await this.read();
      const remaining: OfflineMemoryQueueItem[] = [];

      for (const item of queue) {
        if (!isCloudSafeMemory(item.memory)) continue;

        try {
          await saveRemoteMemory(item.memory);
        } catch {
          remaining.push({
            ...item,
            attempts: item.attempts + 1,
            lastAttemptAt: new Date().toISOString(),
          });
        }
      }

      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
      if (queue.length > 0 && remaining.length === 0) {
        offlineAnalytics.trackReconnectSuccess();
      }
    } finally {
      this.flushing = false;
    }
  }

  async deleteSyncedMemory(id: string): Promise<void> {
    if (!isCloudSyncEnabled()) return;

    void deleteRemoteMemory(id).catch(() => undefined);
  }

  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }

  async queue(memory: MemoryRecord, source: OfflineMemoryQueueItem["source"] = "offline"): Promise<void> {
    await this.queueMemoryWrites(memory, source);
  }

  async flush(): Promise<void> {
    await this.flushQueuedMemoryWrites();
  }

  async getQueued(): Promise<OfflineMemoryQueueItem[]> {
    return this.read();
  }

  private async read(): Promise<OfflineMemoryQueueItem[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);

    if (!raw) return [];

    try {
      const parsed: unknown = JSON.parse(raw);

      return Array.isArray(parsed)
        ? this.dedupe(parsed.filter(isQueuedMemoryItem).map((item) => ({
            ...item,
            attempts: typeof item.attempts === "number" ? item.attempts : 0,
          }))).slice(0, MAX_QUEUE_ITEMS)
        : [];
    } catch {
      await AsyncStorage.removeItem(QUEUE_KEY);
      return [];
    }
  }

  private dedupe(queue: OfflineMemoryQueueItem[]): OfflineMemoryQueueItem[] {
    const byId = new Map<string, OfflineMemoryQueueItem>();
    const byFingerprint = new Map<string, string>();

    for (const item of queue) {
      const fingerprint = memoryFingerprint(item.memory);
      const matchingId = byId.has(item.id) ? item.id : byFingerprint.get(fingerprint);

      if (matchingId) {
        const existing = byId.get(matchingId);

        if (!existing || item.timestamp.localeCompare(existing.timestamp) >= 0) {
          byId.set(matchingId, item);
          byFingerprint.set(fingerprint, matchingId);
        }
      } else {
        byId.set(item.id, item);
        byFingerprint.set(fingerprint, item.id);
      }
    }

    return Array.from(byId.values()).sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }
}

export const offlineMemoryQueue = new OfflineMemoryQueue();
