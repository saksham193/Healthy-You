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
  getGrantedHealthConnectCapabilities,
  initializeHealthConnect,
  isHealthConnectPlatform,
  loadHealthConnectClient,
  requestHealthConnectPermissions,
} from "./HealthConnectPermissions";

type ReadRecordsResponse = {
  records?: unknown[];
  result?: unknown[];
};

type NumericUnit = {
  inCalories?: number;
  inKilocalories?: number;
  inMeters?: number;
  inKilometers?: number;
  inMilliliters?: number;
  inLiters?: number;
  inKilograms?: number;
};

const providerId = "health-connect";
const providerName = "Health Connect" as const;
const recordTypeByCapability: Record<DeviceMetricCapability, string> = {
  calories: "ActiveCaloriesBurned",
  distance: "Distance",
  exercise: "ExerciseSession",
  heartRate: "HeartRate",
  hydration: "Hydration",
  sleep: "SleepSession",
  steps: "Steps",
  weight: "Weight",
};

const getPermissionStatus = (
  granted: DeviceMetricCapability[],
): DeviceHealthMetrics["permissionStatus"] => {
  if (granted.length === 0) return "denied";
  if (granted.length < Object.keys(recordTypeByCapability).length) return "partial";

  return "granted";
};

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
  name: "Health Connect",
  detail: isHealthConnectPlatform()
    ? "Reads activity, sleep, vitals, hydration, and body metrics from Android Health Connect"
    : "Health Connect is available on Android devices",
  status,
  iconName: "fitness-outline",
  provider: providerName,
  lastSyncedAt,
  syncStatus,
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const asString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

const getRecords = (response: unknown): unknown[] => {
  const readResponse = asRecord(response) as ReadRecordsResponse;

  return readResponse.records ?? readResponse.result ?? [];
};

const sumRecordNumber = (records: unknown[], key: string): number | undefined => {
  const total = records.reduce<number>((sum, item) => sum + (asNumber(asRecord(item)[key]) ?? 0), 0);

  return total > 0 ? Math.round(total) : undefined;
};

const sumUnit = (records: unknown[], key: string, unit: keyof NumericUnit): number | undefined => {
  const total = records.reduce<number>((sum, item) => {
    const unitValue = asRecord(asRecord(item)[key]);

    return sum + (asNumber(unitValue[unit]) ?? 0);
  }, 0);

  return total > 0 ? Math.round(total) : undefined;
};

const averageHeartRate = (records: unknown[]): number | undefined => {
  const samples = records.flatMap((record) => {
    const item = asRecord(record);
    const recordSamples = Array.isArray(item.samples) ? item.samples : [];

    return recordSamples
      .map((sample) => asNumber(asRecord(sample).beatsPerMinute))
      .filter((value): value is number => typeof value === "number");
  });

  if (samples.length === 0) return undefined;

  return Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length);
};

const sumDurationMinutes = (records: unknown[]): number | undefined => {
  const total = records.reduce<number>((sum, record) => {
    const item = asRecord(record);
    const startTime = asString(item.startTime);
    const endTime = asString(item.endTime);

    if (!startTime || !endTime) return sum;

    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();

    return durationMs > 0 ? sum + durationMs / 60000 : sum;
  }, 0);

  return total > 0 ? Math.round(total) : undefined;
};

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

export class HealthConnectProvider implements DeviceProvider {
  id = providerId;
  name = providerName;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private connected = false;

  getCapabilities(): DeviceMetricCapability[] {
    return ["steps", "distance", "calories", "heartRate", "sleep", "weight", "hydration", "exercise"];
  }

  async connect(): Promise<ConnectedHealthDevice> {
    try {
      const granted = await requestHealthConnectPermissions();

      this.connected = granted.length > 0;
      this.lastError = this.connected ? null : "Health Connect permissions were not granted.";
    } catch (error) {
      this.connected = false;
      this.lastError = error instanceof Error ? error.message : "Unable to request Health Connect permissions.";
    }

    return createDevice(this.connected ? "Connected" : "Disconnected", this.connected ? "idle" : "error", this.lastSyncedAt);
  }

  async disconnect(): Promise<ConnectedHealthDevice> {
    this.connected = false;

    return createDevice("Disconnected", "idle", null);
  }

  async getStatus(): Promise<DeviceProviderStatus> {
    if (!isHealthConnectPlatform()) {
      return {
        providerId,
        providerName,
        status: "unavailable",
        syncStatus: "idle",
        lastSyncedAt: null,
        error: "Health Connect is only available on Android.",
        isFallback: false,
      };
    }

    const initialized = await initializeHealthConnect();
    const granted = initialized ? await getGrantedHealthConnectCapabilities() : [];
    const isConnected = this.connected || granted.length > 0;

    this.connected = isConnected;

    return {
      providerId,
      providerName,
      status: initialized ? (isConnected ? "connected" : "available") : "unavailable",
      syncStatus: this.lastError ? "error" : this.lastSyncedAt ? "synced" : "idle",
      lastSyncedAt: this.lastSyncedAt,
      error: initialized ? this.lastError : "Health Connect is not initialized on this device.",
      isFallback: false,
    };
  }

  async getMetrics(window: DeviceSyncWindow = defaultWindow()): Promise<DeviceHealthMetrics | null> {
    const client = await loadHealthConnectClient();

    if (!client?.readRecords) {
      this.lastError = "Health Connect native module is unavailable.";
      return null;
    }

    const granted = await getGrantedHealthConnectCapabilities();

    if (granted.length === 0) {
      this.connected = false;
      this.lastError = "Health Connect permissions were not granted.";
      return null;
    }

    const timeRangeFilter = {
      operator: "between",
      startTime: window.startTime,
      endTime: window.endTime,
    };
    const readRecords = async (recordType: string) =>
      getRecords(await client.readRecords?.(recordType, { timeRangeFilter }));
    const readIfGranted = (capability: DeviceMetricCapability) =>
      granted.includes(capability)
        ? readRecords(recordTypeByCapability[capability])
        : Promise.resolve([]);

    const [
      steps,
      distance,
      calories,
      heartRate,
      sleep,
      weight,
      hydration,
      exercise,
    ] = await Promise.allSettled([
      readIfGranted("steps"),
      readIfGranted("distance"),
      readIfGranted("calories"),
      readIfGranted("heartRate"),
      readIfGranted("sleep"),
      readIfGranted("weight"),
      readIfGranted("hydration"),
      readIfGranted("exercise"),
    ]);

    const records = <T>(result: PromiseSettledResult<T>): T | undefined =>
      result.status === "fulfilled" ? result.value : undefined;
    const syncedAt = new Date().toISOString();
    const metrics: DeviceHealthMetrics = {
      providerId,
      providerName,
      source: "live",
      sourcePlatform: "android",
      permissionStatus: getPermissionStatus(granted),
      syncStatus: "synced",
      syncedAt,
      steps: sumRecordNumber(records(steps) ?? [], "count"),
      distanceMeters: sumUnit(records(distance) ?? [], "distance", "inMeters"),
      caloriesKcal: sumUnit(records(calories) ?? [], "energy", "inKilocalories"),
      heartRateBpm: averageHeartRate(records(heartRate) ?? []),
      sleepMinutes: sumDurationMinutes(records(sleep) ?? []),
      weightKg: sumUnit(records(weight) ?? [], "weight", "inKilograms"),
      hydrationMl: sumUnit(records(hydration) ?? [], "volume", "inMilliliters"),
      exerciseMinutes: sumDurationMinutes(records(exercise) ?? []),
    };

    if (!hasMetricValue(metrics)) {
      this.lastSyncedAt = syncedAt;
      this.lastError = null;

      return {
        ...metrics,
        source: "no_data",
      };
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

    const metrics = await this.getMetrics(window);
    const latestStatus = await this.getStatus();

    return {
      device: createDevice(metrics ? "Connected" : "Disconnected", metrics ? "synced" : "error", metrics?.syncedAt ?? null),
      metrics,
      status: latestStatus,
    };
  }
}
