export type SyncEntityType =
  | "nutrition_log"
  | "fitness_log"
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
  status: "not_enabled";
  code: "sync_not_enabled";
  message: string;
  results: SyncResponse[];
};

export type SyncPullResponse = {
  status: "not_enabled";
  code: "sync_not_enabled";
  message: string;
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
