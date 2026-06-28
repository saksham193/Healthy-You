import type { ConnectedHealthDevice, DeviceSyncStatus } from "../../../types";

export type DeviceMetricCapability =
  | "steps"
  | "distance"
  | "calories"
  | "heartRate"
  | "sleep"
  | "weight"
  | "hydration"
  | "exercise";

export type DeviceProviderConnectionStatus =
  | "available"
  | "connected"
  | "disconnected"
  | "unavailable"
  | "error";

export type DeviceMetricPlatform = "android" | "ios" | "web" | "unsupported";

export type DevicePermissionStatus = "unknown" | "unavailable" | "granted" | "partial" | "denied";

export type DeviceProviderStatus = {
  providerId: string;
  providerName: ConnectedHealthDevice["provider"];
  status: DeviceProviderConnectionStatus;
  syncStatus: DeviceSyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  isFallback: boolean;
};

export type DeviceSyncWindow = {
  startTime: string;
  endTime: string;
};

export type DeviceHealthMetrics = {
  providerId: string;
  providerName: ConnectedHealthDevice["provider"];
  source: "live" | "cache" | "fallback" | "no_data";
  sourcePlatform: DeviceMetricPlatform;
  permissionStatus: DevicePermissionStatus;
  syncStatus: DeviceSyncStatus;
  syncedAt: string;
  isStale?: boolean;
  steps?: number;
  distanceMeters?: number;
  caloriesKcal?: number;
  heartRateBpm?: number;
  sleepMinutes?: number;
  weightKg?: number;
  hydrationMl?: number;
  exerciseMinutes?: number;
};

export type DeviceSyncResult = {
  device: ConnectedHealthDevice;
  metrics: DeviceHealthMetrics | null;
  status: DeviceProviderStatus;
};

export interface DeviceProvider {
  id: string;
  name: ConnectedHealthDevice["provider"];
  connect(): Promise<ConnectedHealthDevice>;
  disconnect(): Promise<ConnectedHealthDevice>;
  sync(window?: DeviceSyncWindow): Promise<DeviceSyncResult>;
  getMetrics(window?: DeviceSyncWindow): Promise<DeviceHealthMetrics | null>;
  getCapabilities(): DeviceMetricCapability[];
  getStatus(): Promise<DeviceProviderStatus>;
}
