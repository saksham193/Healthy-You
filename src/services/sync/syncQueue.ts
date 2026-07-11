import AsyncStorage from "@react-native-async-storage/async-storage";
import { isManualCloudSyncEnabled } from "./syncFeatureFlags";
import type {
  LocalSyncQueueItem,
  SyncEntityType,
  SyncConflictReviewItem,
  SyncOperation,
  SyncQueueItem,
  SyncQueueMetadataExport,
  SyncQueueResult,
  SyncQueueSummary,
} from "./syncTypes";

const SYNC_QUEUE_KEY = "healthy-you.cloud-sync.queue-v1";
const MAX_QUEUE_ITEMS = 100;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSyncQueueItem = (value: unknown): value is LocalSyncQueueItem =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.entityType === "string" &&
  typeof value.entityId === "string" &&
  typeof value.operation === "string" &&
  typeof value.localUpdatedAt === "string" &&
  typeof value.queuedAt === "string" &&
  typeof value.retryCount === "number";

export async function readSyncQueue(): Promise<LocalSyncQueueItem[]> {
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
  if (!isManualCloudSyncEnabled()) {
    return { status: "not_enabled", queuedCount: 0 };
  }

  const current = await readSyncQueue();
  const nextItem: LocalSyncQueueItem = {
    ...item,
    queueStatus: "pending",
    conflict: undefined,
  };
  const next = [
    nextItem,
    ...current.filter(
      (queued) => queued.entityType !== item.entityType || queued.entityId !== item.entityId,
    ),
  ].slice(0, MAX_QUEUE_ITEMS);

  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(next));

  return { status: "queued", queuedCount: next.length };
}

export async function replaceSyncQueue(items: LocalSyncQueueItem[]): Promise<void> {
  if (!isManualCloudSyncEnabled()) return;

  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items.slice(0, MAX_QUEUE_ITEMS)));
}

export async function clearSyncQueue(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
}

export async function getSyncQueueSummary(): Promise<SyncQueueSummary> {
  const queue = await readSyncQueue();
  const conflictCount = queue.filter((item) => item.queueStatus === "conflict").length;
  const pendingCount = queue.length - conflictCount;

  return {
    pendingCount,
    conflictCount,
    totalCount: queue.length,
  };
}

export async function getSyncQueueMetadataExport(): Promise<SyncQueueMetadataExport> {
  const queue = await readSyncQueue();
  const conflictCount = queue.filter((item) => item.queueStatus === "conflict").length;

  return {
    exportedAt: new Date().toISOString(),
    boundary:
      "This is local sync queue metadata stored on this device. Payload values and local health record contents are not included.",
    pendingCount: queue.length - conflictCount,
    conflictCount,
    totalCount: queue.length,
    items: queue.map((item) => ({
      id: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      queueStatus: item.queueStatus ?? "pending",
      localUpdatedAt: item.localUpdatedAt,
      queuedAt: item.queuedAt,
      lastAttemptAt: item.lastAttemptAt,
      retryCount: item.retryCount,
      conflictReason: item.conflict?.reason,
    })),
  };
}

export async function getSyncConflictReviewItems(): Promise<SyncConflictReviewItem[]> {
  const queue = await readSyncQueue();

  return queue
    .filter((item) => item.queueStatus === "conflict")
    .map((item) => ({
      id: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      localUpdatedAt: item.localUpdatedAt,
      queuedAt: item.queuedAt,
      lastAttemptAt: item.lastAttemptAt,
      retryCount: item.retryCount,
      reason: item.conflict?.reason ?? "Server conflict requires review.",
      serverUpdatedAt: item.conflict?.serverUpdatedAt,
    }));
}

export async function markSyncConflictForRetry(itemId: string): Promise<void> {
  const queue = await readSyncQueue();
  const next = queue.map((item): LocalSyncQueueItem =>
    item.id === itemId && item.queueStatus === "conflict"
      ? {
          ...item,
          queueStatus: "pending",
          conflict: undefined,
        }
      : item,
  );

  await replaceSyncQueue(next);
}

export async function removeSyncQueueItem(itemId: string): Promise<void> {
  const queue = await readSyncQueue();

  await replaceSyncQueue(queue.filter((item) => item.id !== itemId));
}

export function createSyncQueueItem(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: unknown,
  localUpdatedAt = new Date().toISOString(),
): SyncQueueItem {
  return {
    id: `${entityType}-${entityId}-${operation}-${Date.now()}`,
    entityType,
    entityId,
    operation,
    payload,
    localUpdatedAt,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  };
}
