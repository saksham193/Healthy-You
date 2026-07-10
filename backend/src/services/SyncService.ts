import type { SyncPullResponse, SyncPushRequest, SyncPushResponse } from "../types/contracts";

const SYNC_DISABLED_MESSAGE =
  "Cloud sync is not enabled in this build. Local app data remains on this device.";

export class SyncService {
  push(_userId: string, request: SyncPushRequest): SyncPushResponse {
    return {
      status: "not_enabled",
      code: "sync_not_enabled",
      message: SYNC_DISABLED_MESSAGE,
      results: request.items.map(() => ({ status: "not_enabled" })),
    };
  }

  pull(_userId: string): SyncPullResponse {
    return {
      status: "not_enabled",
      code: "sync_not_enabled",
      message: SYNC_DISABLED_MESSAGE,
      items: [],
      serverUpdatedAt: new Date().toISOString(),
    };
  }
}
