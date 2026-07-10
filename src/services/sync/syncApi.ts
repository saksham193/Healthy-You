import { ApiRequestError, apiClient } from "../api/ApiClient";
import { isCloudSyncEnabled } from "./syncFeatureFlags";
import type { SyncPullResponse, SyncPushResponse, SyncQueueItem } from "./syncTypes";

const disabledPushResponse = (items: SyncQueueItem[]): SyncPushResponse => ({
  status: "not_enabled",
  code: "sync_not_enabled",
  message: "Cloud sync is disabled in this build. No local health data was uploaded.",
  results: items.map(() => ({ status: "not_enabled" })),
});

export async function pushSyncItems(items: SyncQueueItem[]): Promise<SyncPushResponse> {
  if (!isCloudSyncEnabled()) {
    return disabledPushResponse(items);
  }

  try {
    return await apiClient.post<SyncPushResponse>("/sync/push", { items }, { authenticated: true });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 501) {
      return disabledPushResponse(items);
    }

    throw error;
  }
}

export async function pullSyncItems(): Promise<SyncPullResponse> {
  if (!isCloudSyncEnabled()) {
    return {
      status: "not_enabled",
      code: "sync_not_enabled",
      message: "Cloud sync is disabled in this build. No remote health data was loaded.",
      items: [],
      serverUpdatedAt: new Date().toISOString(),
    };
  }

  try {
    return await apiClient.get<SyncPullResponse>("/sync/pull", { authenticated: true });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 501) {
      return {
        status: "not_enabled",
        code: "sync_not_enabled",
        message: "Cloud sync is disabled in this build. No remote health data was loaded.",
        items: [],
        serverUpdatedAt: new Date().toISOString(),
      };
    }

    throw error;
  }
}
