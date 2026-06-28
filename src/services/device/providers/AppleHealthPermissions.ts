import { Platform } from "react-native";
import type {
  HealthPermission,
  HealthInputOptions,
  HealthKitPermissions,
  HealthStatusResult,
  HealthUnitOptions,
  HealthValue,
} from "react-native-health";
import type { DeviceMetricCapability } from "./DeviceProvider";

type AppleHealthCallback<T> = (error: string, result: T) => void;

export type AppleHealthClient = {
  Constants: {
    Permissions: Record<string, string>;
    Units: Record<string, string>;
  };
  getActiveEnergyBurned(options: HealthInputOptions, callback: AppleHealthCallback<HealthValue[]>): void;
  getAppleExerciseTime(options: HealthInputOptions, callback: AppleHealthCallback<HealthValue[]>): void;
  getAuthStatus(permissions: HealthKitPermissions, callback: AppleHealthCallback<HealthStatusResult>): void;
  getDistanceWalkingRunning(options: HealthInputOptions, callback: AppleHealthCallback<HealthValue>): void;
  getHeartRateSamples(options: HealthInputOptions, callback: AppleHealthCallback<HealthValue[]>): void;
  getLatestWeight(options: HealthUnitOptions, callback: AppleHealthCallback<HealthValue>): void;
  getSleepSamples(options: HealthInputOptions, callback: AppleHealthCallback<HealthValue[]>): void;
  getStepCount(options: HealthInputOptions, callback: AppleHealthCallback<HealthValue>): void;
  getWater(options: HealthInputOptions, callback: AppleHealthCallback<HealthValue>): void;
  initHealthKit(permissions: HealthKitPermissions, callback: AppleHealthCallback<HealthValue>): void;
  isAvailable(callback: (error: unknown, result: boolean) => void): void;
};

const permissionCapabilities: Record<string, DeviceMetricCapability> = {
  ActiveEnergyBurned: "calories",
  AppleExerciseTime: "exercise",
  DistanceWalkingRunning: "distance",
  HeartRate: "heartRate",
  SleepAnalysis: "sleep",
  StepCount: "steps",
  Steps: "steps",
  Water: "hydration",
  Weight: "weight",
};

export const isAppleHealthPlatform = (): boolean => Platform.OS === "ios";

export async function loadAppleHealthClient(): Promise<AppleHealthClient | null> {
  if (!isAppleHealthPlatform()) return null;

  try {
    const module = await import("react-native-health");

    return module.default as unknown as AppleHealthClient;
  } catch {
    return null;
  }
}

export async function getAppleHealthPermissions(): Promise<HealthKitPermissions | null> {
  const client = await loadAppleHealthClient();

  if (!client) return null;

  const permissions = client.Constants.Permissions;

  return {
    permissions: {
      read: [
        permissions.StepCount ?? permissions.Steps,
        permissions.DistanceWalkingRunning,
        permissions.ActiveEnergyBurned,
        permissions.HeartRate,
        permissions.SleepAnalysis,
        permissions.Weight,
        permissions.Water,
        permissions.AppleExerciseTime,
      ].filter((permission): permission is HealthPermission => Boolean(permission)),
      write: [],
    },
  };
}

export async function isAppleHealthAvailable(): Promise<boolean> {
  const client = await loadAppleHealthClient();

  if (!client) return false;

  return new Promise((resolve) => {
    client.isAvailable((_error, result) => {
      resolve(Boolean(result));
    });
  });
}

export async function requestAppleHealthPermissions(): Promise<DeviceMetricCapability[]> {
  const client = await loadAppleHealthClient();
  const permissions = await getAppleHealthPermissions();

  if (!client || !permissions) return [];

  return new Promise((resolve, reject) => {
    client.initHealthKit(permissions, (error) => {
      if (error) {
        reject(new Error(error));
        return;
      }

      resolve(
        permissions.permissions.read
          .map((permission) => permissionCapabilities[permission])
          .filter((capability): capability is DeviceMetricCapability => Boolean(capability)),
      );
    });
  });
}

export async function getAppleHealthAuthorizationStatus(): Promise<HealthStatusResult | null> {
  const client = await loadAppleHealthClient();
  const permissions = await getAppleHealthPermissions();

  if (!client || !permissions) return null;

  return new Promise((resolve) => {
    client.getAuthStatus(permissions, (_error, result) => {
      resolve(result ?? null);
    });
  });
}
