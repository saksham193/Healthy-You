import type { SyncPullResponse, SyncPushRequest, SyncPushResponse } from "../types/contracts";
import { SyncRepository } from "../repositories/SyncRepository";

const SYNC_DISABLED_MESSAGE =
  "Cloud sync is not enabled in this build. Local app data remains on this device.";

export class SyncService {
  constructor(private readonly syncRepository = new SyncRepository()) {}

  disabledPush(request: SyncPushRequest): SyncPushResponse {
    return {
      status: "not_enabled",
      code: "sync_not_enabled",
      message: SYNC_DISABLED_MESSAGE,
      results: request.items.map(() => ({ status: "not_enabled" })),
    };
  }

  disabledPull(): SyncPullResponse {
    return {
      status: "not_enabled",
      code: "sync_not_enabled",
      message: SYNC_DISABLED_MESSAGE,
      items: [],
      serverUpdatedAt: new Date().toISOString(),
    };
  }

  push(userId: string, request: SyncPushRequest): SyncPushResponse {
    const results = request.items.map((item) => {
      const current = this.syncRepository.find(userId, item.entityType, item.entityId);

      if (current && current.localUpdatedAt.localeCompare(item.localUpdatedAt) > 0) {
        return {
          status: "conflict" as const,
          conflict: {
            entityType: item.entityType,
            entityId: item.entityId,
            reason: "A newer server version already exists for this entity.",
          },
        };
      }

      const saved = this.syncRepository.upsert(userId, item, new Date().toISOString());

      return {
        status: "accepted" as const,
        serverUpdatedAt: saved.serverUpdatedAt,
      };
    });
    const acceptedCount = results.filter((result) => result.status === "accepted").length;

    return {
      status: acceptedCount === results.length ? "ok" : "partial",
      results,
      serverUpdatedAt: new Date().toISOString(),
    };
  }

  pull(userId: string, updatedAfter?: string): SyncPullResponse {
    return {
      status: "ok",
      items: this.syncRepository.list(userId, updatedAfter),
      serverUpdatedAt: new Date().toISOString(),
    };
  }
}
