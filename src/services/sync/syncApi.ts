import { ApiRequestError, apiClient } from "../api/ApiClient";
import { isCloudSyncEnabled, isManualCloudSyncEnabled } from "./syncFeatureFlags";
import type {
  LocalSyncQueueItem,
  SyncCloudDataDeleteResponse,
  SyncCloudExportResponse,
  SyncPullResponse,
  SyncPushResponse,
  SyncQueueItem,
} from "./syncTypes";

type SyncPushOptions = {
  source?: "manual";
};

const disabledPushResponse = (items: SyncQueueItem[]): SyncPushResponse => ({
  status: "not_enabled",
  code: "sync_not_enabled",
  message: "Cloud sync is disabled in this build. No local health data was uploaded.",
  results: items.map(() => ({ status: "not_enabled" })),
});

const toWireSyncItem = (item: LocalSyncQueueItem | SyncQueueItem): SyncQueueItem => ({
  id: item.id,
  entityType: item.entityType,
  entityId: item.entityId,
  operation: item.operation,
  payload: item.payload,
  localUpdatedAt: item.localUpdatedAt,
  queuedAt: item.queuedAt,
  retryCount: item.retryCount,
});

export async function pushSyncItems(
  items: Array<LocalSyncQueueItem | SyncQueueItem>,
  options: SyncPushOptions = {},
): Promise<SyncPushResponse> {
  if (options.source !== "manual" || !isManualCloudSyncEnabled()) {
    return disabledPushResponse(items);
  }

  try {
    return await apiClient.post<SyncPushResponse>(
      "/sync/push",
      { items: items.map(toWireSyncItem) },
      { authenticated: true, timeoutMs: 15000 },
    );
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

export async function exportCloudSyncData(): Promise<SyncCloudExportResponse> {
  return apiClient.get<SyncCloudExportResponse>("/sync/export", {
    authenticated: true,
    timeoutMs: 15000,
  });
}

export async function deleteCloudSyncData(): Promise<SyncCloudDataDeleteResponse> {
  return apiClient.delete<SyncCloudDataDeleteResponse>("/sync/data", {
    authenticated: true,
    timeoutMs: 15000,
  });
}
