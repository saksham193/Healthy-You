import { Platform } from "react-native";
import type { DeviceMetricCapability } from "./DeviceProvider";

type HealthConnectPermission = {
  accessType: "read" | "write";
  recordType:
    | "Steps"
    | "Distance"
    | "ActiveCaloriesBurned"
    | "HeartRate"
    | "SleepSession"
    | "Weight"
    | "Hydration"
    | "ExerciseSession";
};

type GrantedHealthConnectPermission = {
  accessType: string;
  recordType: string;
};

type HealthConnectClient = {
  getGrantedPermissions?: () => Promise<GrantedHealthConnectPermission[]>;
  initialize: () => Promise<boolean>;
  readRecords?: (recordType: string, options: unknown) => Promise<unknown>;
  requestPermission: (permissions: HealthConnectPermission[]) => Promise<GrantedHealthConnectPermission[]>;
};

export const HEALTH_CONNECT_PERMISSIONS: HealthConnectPermission[] = [
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "Distance" },
  { accessType: "read", recordType: "ActiveCaloriesBurned" },
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "SleepSession" },
  { accessType: "read", recordType: "Weight" },
  { accessType: "read", recordType: "Hydration" },
  { accessType: "read", recordType: "ExerciseSession" },
];

const capabilityByRecordType: Record<HealthConnectPermission["recordType"], DeviceMetricCapability> = {
  ActiveCaloriesBurned: "calories",
  Distance: "distance",
  ExerciseSession: "exercise",
  HeartRate: "heartRate",
  Hydration: "hydration",
  SleepSession: "sleep",
  Steps: "steps",
  Weight: "weight",
};

const toCapability = (permission: GrantedHealthConnectPermission): DeviceMetricCapability | undefined =>
  capabilityByRecordType[permission.recordType as HealthConnectPermission["recordType"]];

export const isHealthConnectPlatform = (): boolean => Platform.OS === "android";

export async function loadHealthConnectClient(): Promise<HealthConnectClient | null> {
  if (!isHealthConnectPlatform()) return null;

  try {
    return (await import("react-native-health-connect")) as unknown as HealthConnectClient;
  } catch {
    return null;
  }
}

export async function initializeHealthConnect(): Promise<boolean> {
  const client = await loadHealthConnectClient();

  if (!client) return false;

  try {
    return await client.initialize();
  } catch {
    return false;
  }
}

export async function requestHealthConnectPermissions(): Promise<DeviceMetricCapability[]> {
  const client = await loadHealthConnectClient();

  if (!client) return [];

  const initialized = await initializeHealthConnect();

  if (!initialized) return [];

  try {
    const granted = await client.requestPermission(HEALTH_CONNECT_PERMISSIONS);

    return granted
      .map(toCapability)
      .filter((capability): capability is DeviceMetricCapability => Boolean(capability));
  } catch {
    return [];
  }
}

export async function getGrantedHealthConnectCapabilities(): Promise<DeviceMetricCapability[]> {
  const client = await loadHealthConnectClient();

  if (!client?.getGrantedPermissions) return [];

  try {
    const granted = await client.getGrantedPermissions();

    return granted
      .map(toCapability)
      .filter((capability): capability is DeviceMetricCapability => Boolean(capability));
  } catch {
    return [];
  }
}
