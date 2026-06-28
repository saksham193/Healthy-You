import type { HealthInputOptions, HealthUnit, HealthUnitOptions, HealthValue } from "react-native-health";
import type { ConnectedHealthDevice } from "../../../types";
import type {
  DeviceHealthMetrics,
  DeviceMetricCapability,
  DeviceProvider,
  DeviceProviderStatus,
  DeviceSyncResult,
  DeviceSyncWindow,
} from "./DeviceProvider";
import {
  isAppleHealthAvailable,
  isAppleHealthPlatform,
  loadAppleHealthClient,
  requestAppleHealthPermissions,
} from "./AppleHealthPermissions";

const providerId = "apple-health";
const providerName = "Apple Health" as const;

const defaultWindow = (): DeviceSyncWindow => {
  const end = new Date();
  const start = new Date(end);

  start.setDate(start.getDate() - 1);

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
};

const createDevice = (
  status: ConnectedHealthDevice["status"],
  syncStatus: ConnectedHealthDevice["syncStatus"],
  lastSyncedAt: string | null,
): ConnectedHealthDevice => ({
  id: providerId,
  name: "Apple Health",
  detail: isAppleHealthPlatform()
    ? "Reads Apple Health and Apple Watch activity, sleep, vitals, hydration, and body metrics"
    : "Apple Health is available on iOS devices",
  status,
  iconName: "heart-outline",
  provider: providerName,
  lastSyncedAt,
  syncStatus,
});

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const valueOf = (sample: HealthValue | null | undefined): number | undefined => asNumber(sample?.value);

const sumValues = (samples: HealthValue[] | null | undefined): number | undefined => {
  const total = (samples ?? []).reduce((sum, sample) => sum + (valueOf(sample) ?? 0), 0);

  return total > 0 ? Math.round(total) : undefined;
};

const averageValue = (samples: HealthValue[] | null | undefined): number | undefined => {
  const values = (samples ?? []).map(valueOf).filter((value): value is number => typeof value === "number");

  if (values.length === 0) return undefined;

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const durationMinutes = (sample: HealthValue): number => {
  const startTime = new Date(sample.startDate).getTime();
  const endTime = new Date(sample.endDate).getTime();
  const durationMs = endTime - startTime;

  return durationMs > 0 ? durationMs / 60000 : 0;
};

const sleepMinutes = (samples: HealthValue[] | null | undefined): number | undefined => {
  const total = (samples ?? []).reduce((sum, sample) => {
    const sleepValue = String(sample.value).toLowerCase();
    const isSleepStage =
      sleepValue.includes("asleep") ||
      sleepValue.includes("core") ||
      sleepValue.includes("deep") ||
      sleepValue.includes("rem");

    return isSleepStage ? sum + durationMinutes(sample) : sum;
  }, 0);

  return total > 0 ? Math.round(total) : undefined;
};

const promisifyValue = <T>(
  read: (callback: (error: string, result: T) => void) => void,
): Promise<T> =>
  new Promise((resolve, reject) => {
    read((error, result) => {
      if (error) {
        reject(new Error(error));
        return;
      }

      resolve(result);
    });
  });

const toDateOptions = (window: DeviceSyncWindow): HealthInputOptions => ({
  startDate: window.startTime,
  endDate: window.endTime,
  date: window.endTime,
  includeManuallyAdded: true,
});

const hasMetricValue = (metrics: DeviceHealthMetrics): boolean =>
  [
    metrics.steps,
    metrics.distanceMeters,
    metrics.caloriesKcal,
    metrics.heartRateBpm,
    metrics.sleepMinutes,
    metrics.weightKg,
    metrics.hydrationMl,
    metrics.exerciseMinutes,
  ].some((value) => typeof value === "number");

const getPermissionStatus = (values: Array<number | undefined>): DeviceHealthMetrics["permissionStatus"] => {
  const readableValues = values.filter((value) => typeof value === "number").length;

  if (readableValues === 0) return "denied";
  if (readableValues < values.length) return "partial";

  return "granted";
};

export class AppleHealthProvider implements DeviceProvider {
  id = providerId;
  name = providerName;
  private connected = false;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;

  getCapabilities(): DeviceMetricCapability[] {
    return ["steps", "distance", "calories", "heartRate", "sleep", "weight", "hydration", "exercise"];
  }

  async connect(): Promise<ConnectedHealthDevice> {
    if (!isAppleHealthPlatform()) {
      this.connected = false;
      this.lastError = "Apple Health is only available on iOS.";
      return createDevice("Disconnected", "idle", null);
    }

    const available = await isAppleHealthAvailable();

    if (!available) {
      this.connected = false;
      this.lastError = "Apple Health is unavailable on this device or simulator.";
      return createDevice("Disconnected", "error", null);
    }

    try {
      const granted = await requestAppleHealthPermissions();

      this.connected = granted.length > 0;
      this.lastError = this.connected ? null : "Apple Health permissions were not granted.";

      return createDevice(this.connected ? "Connected" : "Disconnected", this.connected ? "idle" : "error", this.lastSyncedAt);
    } catch (error) {
      this.connected = false;
      this.lastError = error instanceof Error ? error.message : "Unable to request Apple Health permissions.";

      return createDevice("Disconnected", "error", null);
    }
  }

  async disconnect(): Promise<ConnectedHealthDevice> {
    this.connected = false;

    return createDevice("Disconnected", "idle", null);
  }

  async getStatus(): Promise<DeviceProviderStatus> {
    if (!isAppleHealthPlatform()) {
      return {
        providerId,
        providerName,
        status: "unavailable",
        syncStatus: "idle",
        lastSyncedAt: null,
        error: "Apple Health is only available on iOS.",
        isFallback: false,
      };
    }

    const available = await isAppleHealthAvailable();

    return {
      providerId,
      providerName,
      status: available ? (this.connected ? "connected" : "available") : "unavailable",
      syncStatus: this.lastError ? "error" : this.lastSyncedAt ? "synced" : "idle",
      lastSyncedAt: this.lastSyncedAt,
      error: available ? this.lastError : "Apple Health is unavailable on this device or simulator.",
      isFallback: false,
    };
  }

  async getMetrics(window: DeviceSyncWindow = defaultWindow()): Promise<DeviceHealthMetrics | null> {
    const client = await loadAppleHealthClient();

    if (!client) {
      this.lastError = "Apple Health native module is unavailable.";
      return null;
    }

    const options = toDateOptions(window);
    const weightOptions: HealthUnitOptions = { unit: "gram" as HealthUnit };
    const readMetric = async <T>(read: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await read();
      } catch {
        return undefined;
      }
    };

    const [
      steps,
      distance,
      calories,
      heartRate,
      sleep,
      weight,
      hydration,
      exercise,
    ] = await Promise.all([
      readMetric(() => promisifyValue<HealthValue>((callback) => client.getStepCount(options, callback))),
      readMetric(() => promisifyValue<HealthValue>((callback) => client.getDistanceWalkingRunning({ ...options, unit: "meter" as HealthUnit }, callback))),
      readMetric(() => promisifyValue<HealthValue[]>((callback) => client.getActiveEnergyBurned({ ...options, unit: "kilocalorie" as HealthUnit }, callback))),
      readMetric(() => promisifyValue<HealthValue[]>((callback) => client.getHeartRateSamples({ ...options, unit: "bpm" as HealthUnit }, callback))),
      readMetric(() => promisifyValue<HealthValue[]>((callback) => client.getSleepSamples({ ...options, limit: 32, ascending: true }, callback))),
      readMetric(() => promisifyValue<HealthValue>((callback) => client.getLatestWeight(weightOptions, callback))),
      readMetric(() => promisifyValue<HealthValue>((callback) => client.getWater(options, callback))),
      readMetric(() => promisifyValue<HealthValue[]>((callback) => client.getAppleExerciseTime({ ...options, unit: "minute" as HealthUnit }, callback))),
    ]);
    const syncedAt = new Date().toISOString();
    const normalizedValues = {
      steps: valueOf(steps),
      distanceMeters: valueOf(distance),
      caloriesKcal: sumValues(calories),
      heartRateBpm: averageValue(heartRate),
      sleepMinutes: sleepMinutes(sleep),
      weightKg: valueOf(weight) ? Math.round(((valueOf(weight) ?? 0) / 1000) * 10) / 10 : undefined,
      hydrationMl: valueOf(hydration) ? Math.round((valueOf(hydration) ?? 0) * 1000) : undefined,
      exerciseMinutes: sumValues(exercise),
    };
    const metrics: DeviceHealthMetrics = {
      providerId,
      providerName,
      source: "live",
      sourcePlatform: "ios",
      permissionStatus: getPermissionStatus(Object.values(normalizedValues)),
      syncStatus: "synced",
      syncedAt,
      ...normalizedValues,
    };

    if (!hasMetricValue(metrics)) {
      this.lastError = "Apple Health returned no readable metric values.";
      return null;
    }

    this.lastSyncedAt = syncedAt;
    this.lastError = null;

    return metrics;
  }

  async sync(window: DeviceSyncWindow = defaultWindow()): Promise<DeviceSyncResult> {
    const status = await this.getStatus();

    if (status.status === "available") {
      await this.connect();
    }

    const metrics = this.connected ? await this.getMetrics(window) : null;
    const latestStatus = await this.getStatus();

    return {
      device: createDevice(metrics ? "Connected" : "Disconnected", metrics ? "synced" : "error", metrics?.syncedAt ?? this.lastSyncedAt),
      metrics,
      status: latestStatus,
    };
  }
}
