import { pushSyncItems } from "./syncApi";
import { isCloudSyncEnabled } from "./syncFeatureFlags";
import { readSyncQueue, replaceSyncQueue } from "./syncQueue";
import type { SyncPushResponse } from "./syncTypes";

export type SyncServiceResult =
  | { status: "not_enabled"; uploadedCount: number; remainingCount: number }
  | { status: "idle"; uploadedCount: number; remainingCount: number }
  | { status: "pending"; uploadedCount: number; remainingCount: number };

export async function flushSyncQueue(): Promise<SyncServiceResult> {
  if (!isCloudSyncEnabled()) {
    return { status: "not_enabled", uploadedCount: 0, remainingCount: 0 };
  }

  const queue = await readSyncQueue();
  if (queue.length === 0) {
    return { status: "idle", uploadedCount: 0, remainingCount: 0 };
  }

  const response: SyncPushResponse = await pushSyncItems(queue);
  if (response.status === "not_enabled") {
    return { status: "not_enabled", uploadedCount: 0, remainingCount: queue.length };
  }

  const remaining = queue.filter((item, index) => response.results[index]?.status !== "accepted");
  await replaceSyncQueue(remaining);

  return {
    status: remaining.length > 0 ? "pending" : "idle",
    uploadedCount: queue.length - remaining.length,
    remainingCount: remaining.length,
  };
}
