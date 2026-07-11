import type {
  SyncCloudDataDeleteResponse,
  SyncCloudExportResponse,
  SyncEntityType,
  SyncOperation,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from "../types/contracts";
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

  exportData(userId: string): SyncCloudExportResponse {
    const records = this.syncRepository.listExportRecords(userId);
    const byEntityType = records.reduce<Record<SyncEntityType, number>>((summary, record) => {
      summary[record.entityType] = (summary[record.entityType] ?? 0) + 1;
      return summary;
    }, {} as Record<SyncEntityType, number>);
    const byOperation = records.reduce<Record<SyncOperation, number>>((summary, record) => {
      summary[record.operation] = (summary[record.operation] ?? 0) + 1;
      return summary;
    }, {} as Record<SyncOperation, number>);

    return {
      status: "ok",
      exportedAt: new Date().toISOString(),
      boundary:
        "This exports Healthy You cloud sync record metadata stored by this backend. It does not export files, images, audio, attachments, AI prompts/responses, tokens, or your external sign-in provider account.",
      recordCount: records.length,
      records,
      summary: {
        byEntityType,
        byOperation,
      },
    };
  }

  deleteData(userId: string): SyncCloudDataDeleteResponse {
    const deletedCount = this.syncRepository.deleteAllForUser(userId);

    return {
      status: "ok",
      deletedCount,
      deletedAt: new Date().toISOString(),
      boundary:
        "This deleted Healthy You cloud sync records stored by this backend. It did not delete local device data or your external sign-in provider account.",
    };
  }
}
