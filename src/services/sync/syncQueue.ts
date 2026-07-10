import AsyncStorage from "@react-native-async-storage/async-storage";
import { isCloudSyncEnabled } from "./syncFeatureFlags";
import type { SyncQueueItem, SyncQueueResult } from "./syncTypes";

const SYNC_QUEUE_KEY = "healthy-you.cloud-sync.queue-v1";
const MAX_QUEUE_ITEMS = 100;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSyncQueueItem = (value: unknown): value is SyncQueueItem =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.entityType === "string" &&
  typeof value.entityId === "string" &&
  typeof value.operation === "string" &&
  typeof value.localUpdatedAt === "string" &&
  typeof value.queuedAt === "string" &&
  typeof value.retryCount === "number";

export async function readSyncQueue(): Promise<SyncQueueItem[]> {
  if (!isCloudSyncEnabled()) return [];

  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter(isSyncQueueItem).slice(0, MAX_QUEUE_ITEMS) : [];
  } catch {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    return [];
  }
}

export async function enqueueSyncItem(item: SyncQueueItem): Promise<SyncQueueResult> {
  if (!isCloudSyncEnabled()) {
    return { status: "not_enabled", queuedCount: 0 };
  }

  const current = await readSyncQueue();
  const next = [item, ...current.filter((queued) => queued.id !== item.id)].slice(0, MAX_QUEUE_ITEMS);

  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(next));

  return { status: "queued", queuedCount: next.length };
}

export async function replaceSyncQueue(items: SyncQueueItem[]): Promise<void> {
  if (!isCloudSyncEnabled()) return;

  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items.slice(0, MAX_QUEUE_ITEMS)));
}

export async function clearSyncQueue(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
}
