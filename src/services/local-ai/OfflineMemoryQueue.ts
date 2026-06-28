import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveMemory as saveRemoteMemory } from "../api/MemoryApi";
import { connectivityService } from "../connectivity/ConnectivityService";
import type { MemoryRecord } from "../../types";
import type { OfflineMemoryQueueItem } from "./types";
import { offlineAnalytics } from "../observability/OfflineAnalytics";

const QUEUE_KEY = "healthy-you.local-ai.memory-sync-queue";
const MAX_QUEUE_ITEMS = 50;

export class OfflineMemoryQueue {
  private flushing = false;

  constructor() {
    connectivityService.subscribe((status) => {
      if (status.isOnline) {
        void this.flush();
      }
    });
  }

  async syncOrQueue(memory: MemoryRecord): Promise<void> {
    const online = await connectivityService.isOnline();

    if (!online) {
      offlineAnalytics.trackMemoryQueue();
      await this.queue(memory, "offline");
      return;
    }

    try {
      await saveRemoteMemory(memory);
      await this.flush();
    } catch {
      offlineAnalytics.trackMemoryQueue();
      await this.queue(memory, "sync-failure");
    }
  }

  async queue(memory: MemoryRecord, source: OfflineMemoryQueueItem["source"] = "offline"): Promise<void> {
    const queue = await this.read();
    const item: OfflineMemoryQueueItem = {
      id: memory.id,
      memory,
      source,
      timestamp: new Date().toISOString(),
      attempts: 0,
    };
    const existing = queue.find((queued) => queued.id === item.id);
    const next = this.dedupe([
      {
        ...item,
        attempts: existing?.attempts ?? 0,
        lastAttemptAt: existing?.lastAttemptAt,
      },
      ...queue.filter((queued) => queued.id !== item.id),
    ]).slice(0, MAX_QUEUE_ITEMS);

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    if (!(await connectivityService.isOnline())) return;

    this.flushing = true;

    try {
      const queue = await this.read();
      const remaining: OfflineMemoryQueueItem[] = [];

      for (const item of queue) {
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

  async getQueued(): Promise<OfflineMemoryQueueItem[]> {
    return this.read();
  }

  private async read(): Promise<OfflineMemoryQueueItem[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);

    if (!raw) return [];

    try {
      const parsed: unknown = JSON.parse(raw);

      return Array.isArray(parsed)
        ? parsed.filter((item): item is OfflineMemoryQueueItem =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as OfflineMemoryQueueItem).id === "string" &&
            typeof (item as OfflineMemoryQueueItem).timestamp === "string",
          ).map((item) => ({
            ...item,
            attempts: typeof item.attempts === "number" ? item.attempts : 0,
          })).sort((left, right) => right.timestamp.localeCompare(left.timestamp)).slice(0, MAX_QUEUE_ITEMS)
        : [];
    } catch {
      await AsyncStorage.removeItem(QUEUE_KEY);
      return [];
    }
  }

  private dedupe(queue: OfflineMemoryQueueItem[]): OfflineMemoryQueueItem[] {
    const byId = new Map<string, OfflineMemoryQueueItem>();

    queue.forEach((item) => {
      const existing = byId.get(item.id);

      if (!existing || item.timestamp.localeCompare(existing.timestamp) >= 0) {
        byId.set(item.id, item);
      }
    });

    return Array.from(byId.values()).sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }
}

export const offlineMemoryQueue = new OfflineMemoryQueue();
