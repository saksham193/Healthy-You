import { pushSyncItems } from "./syncApi";
import { isManualCloudSyncEnabled } from "./syncFeatureFlags";
import { readSyncQueue, replaceSyncQueue } from "./syncQueue";
import { ApiRequestError, isAuthFailureError } from "../api/ApiClient";
import type { LocalSyncQueueItem, SyncPushResponse } from "./syncTypes";

export type SyncServiceResult =
  | { status: "not_enabled"; uploadedCount: number; remainingCount: number }
  | { status: "auth_required"; uploadedCount: number; remainingCount: number }
  | { status: "idle"; uploadedCount: number; remainingCount: number }
  | { status: "pending"; uploadedCount: number; remainingCount: number }
  | { status: "conflict"; uploadedCount: number; remainingCount: number; conflictCount: number }
  | { status: "failed"; uploadedCount: number; remainingCount: number; message: string };

export async function flushSyncQueue(): Promise<SyncServiceResult> {
  if (!isManualCloudSyncEnabled()) {
    return { status: "not_enabled", uploadedCount: 0, remainingCount: 0 };
  }

  const queue = await readSyncQueue();
  const pendingQueue = queue.filter((item) => item.queueStatus !== "conflict");
  const existingConflictCount = queue.length - pendingQueue.length;

  if (pendingQueue.length === 0) {
    if (existingConflictCount > 0) {
      return {
        status: "conflict",
        uploadedCount: 0,
        remainingCount: queue.length,
        conflictCount: existingConflictCount,
      };
    }

    return { status: "idle", uploadedCount: 0, remainingCount: 0 };
  }

  let response: SyncPushResponse;
  try {
    response = await pushSyncItems(pendingQueue, { source: "manual" });
  } catch (error) {
    const attemptedAt = new Date().toISOString();
    const nextQueue = queue.map((item): LocalSyncQueueItem =>
      item.queueStatus === "conflict"
        ? item
        : {
            ...item,
            retryCount: item.retryCount + 1,
            lastAttemptAt: attemptedAt,
          },
    );

    await replaceSyncQueue(nextQueue);

    if (isAuthFailureError(error)) {
      return { status: "auth_required", uploadedCount: 0, remainingCount: nextQueue.length };
    }

    return {
      status: "failed",
      uploadedCount: 0,
      remainingCount: nextQueue.length,
      message: error instanceof ApiRequestError || error instanceof Error
        ? error.message
        : "Manual sync failed. Your data is still saved locally.",
    };
  }

  if (response.status === "not_enabled") {
    return { status: "not_enabled", uploadedCount: 0, remainingCount: queue.length };
  }

  const attemptedAt = new Date().toISOString();
  const resultsById = new Map(pendingQueue.map((item, index) => [item.id, response.results[index]]));
  let acceptedCount = 0;
  const remaining = queue.reduce<LocalSyncQueueItem[]>((items, item) => {
    if (item.queueStatus === "conflict") {
      items.push(item);
      return items;
    }

    const result = resultsById.get(item.id);
    if (result?.status === "accepted") {
      acceptedCount += 1;
      return items;
    }

    if (result?.status === "conflict") {
      items.push({
        ...item,
        queueStatus: "conflict",
        lastAttemptAt: attemptedAt,
        conflict: {
          reason: result.conflict?.reason ?? "Server conflict requires review.",
          serverUpdatedAt: result.serverUpdatedAt,
        },
      });
      return items;
    }

    items.push({
      ...item,
      retryCount: item.retryCount + 1,
      lastAttemptAt: attemptedAt,
    });
    return items;
  }, []);
  await replaceSyncQueue(remaining);
  const conflictCount = remaining.filter((item) => item.queueStatus === "conflict").length;

  if (conflictCount > 0) {
    return {
      status: "conflict",
      uploadedCount: acceptedCount,
      remainingCount: remaining.length,
      conflictCount,
    };
  }

  return {
    status: remaining.length > 0 ? "pending" : "idle",
    uploadedCount: acceptedCount,
    remainingCount: remaining.length,
  };
}
