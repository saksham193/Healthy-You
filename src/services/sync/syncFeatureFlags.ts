const CLOUD_SYNC_DEFAULT = false;

export const CLOUD_SYNC_ENABLED: boolean = CLOUD_SYNC_DEFAULT;
export const CLOUD_SYNC_MANUAL_SYNC_ENABLED: boolean = true;
export const CLOUD_SYNC_AUTO_UPLOAD_ENABLED: boolean = false;
export const CLOUD_SYNC_BACKGROUND_SYNC_ENABLED: boolean = false;

export const isCloudSyncEnabled = (): boolean => CLOUD_SYNC_ENABLED;
export const isManualCloudSyncEnabled = (): boolean => CLOUD_SYNC_MANUAL_SYNC_ENABLED;
export const isCloudAutoUploadEnabled = (): boolean =>
  CLOUD_SYNC_ENABLED && CLOUD_SYNC_AUTO_UPLOAD_ENABLED;
export const isCloudBackgroundSyncEnabled = (): boolean =>
  CLOUD_SYNC_ENABLED && CLOUD_SYNC_BACKGROUND_SYNC_ENABLED;
