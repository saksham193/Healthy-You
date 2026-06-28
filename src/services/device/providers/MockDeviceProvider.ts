import { connectedDevices, fitnessSummary, nutritionSummary, sleepSchedule, vitalMetrics } from "../../../constants/mockData";
import { Platform } from "react-native";
import type { ConnectedHealthDevice } from "../../../types";
import type {
  DeviceHealthMetrics,
  DeviceMetricCapability,
  DeviceProvider,
  DeviceProviderStatus,
  DeviceSyncResult,
  DeviceSyncWindow,
} from "./DeviceProvider";

const providerId = "mock-health";
const providerName = "Mock Health" as const;

const getSourcePlatform = (): DeviceHealthMetrics["sourcePlatform"] => {
  if (Platform.OS === "android" || Platform.OS === "ios" || Platform.OS === "web") {
    return Platform.OS;
  }

  return "unsupported";
};

const getHeartRate = (): number | undefined => {
  const heartRate = vitalMetrics.find((metric) => metric.id === "heart-rate")?.value;
  const parsed = Number.parseFloat(heartRate ?? "");

  return Number.isFinite(parsed) ? parsed : undefined;
};

const createDevice = (
  status: ConnectedHealthDevice["status"],
  syncStatus: ConnectedHealthDevice["syncStatus"],
  lastSyncedAt: string | null,
): ConnectedHealthDevice => ({
  ...connectedDevices[0],
  id: providerId,
  name: "Demo Health Feed",
  detail: "Fallback health data used when a live provider is unavailable",
  status,
  iconName: "pulse-outline",
  provider: providerName,
  lastSyncedAt,
  syncStatus,
});

export class MockDeviceProvider implements DeviceProvider {
  id = providerId;
  name = providerName;
  private connected = true;
  private lastSyncedAt: string | null = new Date().toISOString();

  getCapabilities(): DeviceMetricCapability[] {
    return ["steps", "distance", "calories", "heartRate", "sleep", "weight", "hydration", "exercise"];
  }

  async connect(): Promise<ConnectedHealthDevice> {
    this.connected = true;
    this.lastSyncedAt = new Date().toISOString();

    return createDevice("Connected", "synced", this.lastSyncedAt);
  }

  async disconnect(): Promise<ConnectedHealthDevice> {
    this.connected = false;

    return createDevice("Disconnected", "idle", null);
  }

  async getMetrics(_window?: DeviceSyncWindow): Promise<DeviceHealthMetrics> {
    const syncedAt = new Date().toISOString();

    this.lastSyncedAt = syncedAt;

    return {
      providerId,
      providerName,
      source: "fallback",
      sourcePlatform: getSourcePlatform(),
      permissionStatus: "unavailable",
      syncStatus: "synced",
      syncedAt,
      steps: fitnessSummary.steps,
      distanceMeters: Math.round(fitnessSummary.steps * 0.78),
      caloriesKcal: fitnessSummary.caloriesBurned,
      heartRateBpm: getHeartRate(),
      sleepMinutes: Math.round(sleepSchedule.plannedHours * 60),
      weightKg: Number.parseFloat(fitnessSummary.weight),
      hydrationMl: nutritionSummary.waterGlasses * 250,
      exerciseMinutes: fitnessSummary.weeklyActivityMinutes,
    };
  }

  async getStatus(): Promise<DeviceProviderStatus> {
    return {
      providerId,
      providerName,
      status: this.connected ? "connected" : "disconnected",
      syncStatus: this.connected ? "synced" : "idle",
      lastSyncedAt: this.connected ? this.lastSyncedAt : null,
      error: null,
      isFallback: true,
    };
  }

  async sync(): Promise<DeviceSyncResult> {
    const metrics = this.connected ? await this.getMetrics() : null;

    return {
      device: createDevice(this.connected ? "Connected" : "Disconnected", this.connected ? "synced" : "idle", this.lastSyncedAt),
      metrics,
      status: await this.getStatus(),
    };
  }
}
