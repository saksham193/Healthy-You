import { Platform } from "react-native";
import type { ConnectedHealthDevice, HealthServiceResponse } from "../../types";
import { HealthSyncManager } from "../device/HealthSyncManager";
import type {
  DeviceHealthMetrics,
  DeviceProvider,
  DeviceProviderStatus,
  DeviceSyncWindow,
} from "../device/providers/DeviceProvider";
import { AppleHealthProvider } from "../device/providers/AppleHealthProvider";
import { HealthConnectProvider } from "../device/providers/HealthConnectProvider";
import { MockDeviceProvider } from "../device/providers/MockDeviceProvider";

const appleHealthProvider = new AppleHealthProvider();
const healthConnectProvider = new HealthConnectProvider();
const mockProvider = new MockDeviceProvider();
const providers: DeviceProvider[] = [appleHealthProvider, healthConnectProvider, mockProvider];

export type DeviceSyncProviderSnapshot = DeviceProviderStatus & {
  dataSource: DeviceHealthMetrics["source"] | "unavailable";
  platform: string;
};

const createResponse = async <T>(data: T): Promise<HealthServiceResponse<T>> => ({
  data,
  fetchedAt: new Date().toISOString(),
});

const deviceFromStatus = (status: DeviceProviderStatus): ConnectedHealthDevice => ({
  id: status.providerId,
  name: status.providerName,
  detail: status.isFallback
    ? "Fallback health data used when live device sync is unavailable"
    : status.providerName === "Apple Health"
      ? "Apple Health and Apple Watch activity, sleep, vitals, hydration, and body metrics"
      : "Android Health Connect activity, sleep, vitals, hydration, and body metrics",
  status: status.status === "connected" ? "Connected" : "Disconnected",
  iconName: status.providerName === "Apple Health"
    ? "heart-outline"
    : status.providerName === "Health Connect"
      ? "fitness-outline"
      : "pulse-outline",
  provider: status.providerName,
  lastSyncedAt: status.lastSyncedAt,
  syncStatus: status.syncStatus,
});

const getProvider = (deviceId: string): DeviceProvider =>
  providers.find((provider) => provider.id === deviceId) ?? mockProvider;

const getPlatformProviderStatus = async (): Promise<DeviceProviderStatus> => {
  if (Platform.OS === "ios") {
    return appleHealthProvider.getStatus();
  }

  if (Platform.OS === "android") {
    return healthConnectProvider.getStatus();
  }

  return mockProvider.getStatus();
};

const getPrimaryProvider = async (): Promise<DeviceProvider> => {
  if (Platform.OS === "ios") {
    const appleHealthStatus = await appleHealthProvider.getStatus();

    if (appleHealthStatus.status !== "unavailable" && appleHealthStatus.status !== "error") {
      return appleHealthProvider;
    }

    return mockProvider;
  }

  if (Platform.OS !== "android") {
    return mockProvider;
  }

  const healthConnectStatus = await healthConnectProvider.getStatus();

  if (healthConnectStatus.status !== "unavailable" && healthConnectStatus.status !== "error") {
    return healthConnectProvider;
  }

  return mockProvider;
};

const syncWithSelectedProvider = async (window?: DeviceSyncWindow): Promise<DeviceHealthMetrics | null> => {
  const primaryProvider = await getPrimaryProvider();
  const result = await primaryProvider.sync(window);

  if (result.metrics) return result.metrics;
  if (primaryProvider.id === mockProvider.id) return null;

  throw new Error(result.status.error ?? `${result.status.providerName} sync did not return readable health data.`);
};

const healthSyncManager = new HealthSyncManager(syncWithSelectedProvider);

export async function getConnectedDevices(): Promise<HealthServiceResponse<ConnectedHealthDevice[]>> {
  if (Platform.OS === "ios") {
    const appleHealthStatus = await appleHealthProvider.getStatus();

    if (appleHealthStatus.status === "unavailable" || appleHealthStatus.status === "error") {
      return createResponse([deviceFromStatus(await mockProvider.getStatus())]);
    }

    return createResponse([deviceFromStatus(appleHealthStatus)]);
  }

  if (Platform.OS !== "android") {
    return createResponse([deviceFromStatus(await mockProvider.getStatus())]);
  }

  const healthConnectStatus = await healthConnectProvider.getStatus();

  if (healthConnectStatus.status === "unavailable" || healthConnectStatus.status === "error") {
    return createResponse([deviceFromStatus(await mockProvider.getStatus())]);
  }

  return createResponse([deviceFromStatus(healthConnectStatus)]);
}

export async function getDeviceSyncProviderStatus(): Promise<HealthServiceResponse<DeviceSyncProviderSnapshot>> {
  const status = await getPlatformProviderStatus();

  return createResponse({
    ...status,
    dataSource: status.isFallback ? "fallback" : "unavailable",
    platform: Platform.OS,
  });
}

export async function connectDevice(deviceId: string): Promise<HealthServiceResponse<ConnectedHealthDevice[]>> {
  await getProvider(deviceId).connect();

  return getConnectedDevices();
}

export async function disconnectDevice(
  deviceId: string,
): Promise<HealthServiceResponse<ConnectedHealthDevice[]>> {
  await getProvider(deviceId).disconnect();

  return getConnectedDevices();
}

export async function syncDevice(deviceId: string): Promise<HealthServiceResponse<ConnectedHealthDevice[]>> {
  await getProvider(deviceId).sync();

  return getConnectedDevices();
}

export async function syncHealthData(
  window?: DeviceSyncWindow,
): Promise<HealthServiceResponse<DeviceHealthMetrics | null>> {
  const metrics = await healthSyncManager.manualSync(window);

  return createResponse(metrics);
}

export const SyncHealthData = syncHealthData;

export function startPeriodicHealthSync(intervalMs?: number): void {
  healthSyncManager.startPeriodicSync(intervalMs);
}

export function stopPeriodicHealthSync(): void {
  healthSyncManager.stopPeriodicSync();
}

export async function getCachedHealthData(): Promise<HealthServiceResponse<DeviceHealthMetrics | null>> {
  return createResponse(await healthSyncManager.getCachedMetrics());
}

export async function getLastHealthSyncAt(): Promise<HealthServiceResponse<string | null>> {
  return createResponse(await healthSyncManager.getLastSyncAt());
}
