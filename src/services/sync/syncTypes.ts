export type SyncEntityType =
  | "nutrition_log"
  | "hydration_log"
  | "fitness_log"
  | "habit_completion"
  | "medication_log"
  | "schedule_routine"
  | "profile_settings";

export type SyncOperation = "create" | "update" | "delete";

export type SyncQueueItem = {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: unknown;
  localUpdatedAt: string;
  queuedAt: string;
  retryCount: number;
};

export type LocalSyncQueueStatus = "pending" | "conflict";

export type LocalSyncQueueItem = SyncQueueItem & {
  queueStatus?: LocalSyncQueueStatus;
  lastAttemptAt?: string;
  conflict?: {
    reason: string;
    serverUpdatedAt?: string;
  };
};

export type SyncStatus = "accepted" | "conflict" | "rejected" | "not_enabled";

export type SyncResponse = {
  status: SyncStatus;
  serverUpdatedAt?: string;
  conflict?: {
    entityType: SyncEntityType;
    entityId: string;
    reason: string;
  };
};

export type SyncPushRequest = {
  items: SyncQueueItem[];
};

export type SyncPushResponse = {
  status: "ok" | "partial" | "not_enabled";
  code?: "sync_not_enabled";
  message?: string;
  results: SyncResponse[];
  serverUpdatedAt?: string;
};

export type SyncPullResponse = {
  status: "ok" | "not_enabled";
  code?: "sync_not_enabled";
  message?: string;
  items: SyncQueueItem[];
  serverUpdatedAt: string;
};

export type SyncConsentStatus = "not_requested" | "granted" | "revoked";

export type CloudProfileSettings = {
  displayName?: string;
  appPreferences?: Record<string, unknown>;
  privacySettings?: {
    syncConsentStatus: SyncConsentStatus;
    rawMediaSyncAllowed: false;
    backgroundSyncAllowed: false;
  };
  updatedAt: string;
};

export type SyncQueueResult = {
  status: "queued" | "not_enabled";
  queuedCount: number;
};

export type SyncQueueSummary = {
  pendingCount: number;
  conflictCount: number;
  totalCount: number;
};

export type SyncConflictReviewItem = {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  localUpdatedAt: string;
  queuedAt: string;
  lastAttemptAt?: string;
  retryCount: number;
  reason: string;
  serverUpdatedAt?: string;
};

export type SyncQueueMetadataItem = {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  queueStatus: LocalSyncQueueStatus;
  localUpdatedAt: string;
  queuedAt: string;
  lastAttemptAt?: string;
  retryCount: number;
  conflictReason?: string;
};

export type SyncQueueMetadataExport = {
  exportedAt: string;
  boundary: string;
  pendingCount: number;
  conflictCount: number;
  totalCount: number;
  items: SyncQueueMetadataItem[];
};

export type SyncCloudExportRecord = {
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  localUpdatedAt: string;
  queuedAt: string;
  retryCount: number;
  serverUpdatedAt: string;
  deletedAt: string | null;
};

export type SyncCloudExportResponse = {
  status: "ok";
  exportedAt: string;
  boundary: string;
  recordCount: number;
  records: SyncCloudExportRecord[];
  summary: {
    byEntityType: Partial<Record<SyncEntityType, number>>;
    byOperation: Partial<Record<SyncOperation, number>>;
  };
};

export type SyncCloudDataDeleteResponse = {
  status: "ok";
  deletedCount: number;
  deletedAt: string;
  boundary: string;
};
