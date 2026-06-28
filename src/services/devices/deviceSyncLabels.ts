import type { ConnectedHealthDevice, DeviceSyncStatus, HealthDataState } from "../../types";

type DeviceDataSource = HealthDataState["deviceDataSource"];

type DeviceSyncLabelInput = {
  dataSource: DeviceDataSource;
  device: ConnectedHealthDevice | null;
  syncStatus: DeviceSyncStatus;
  error?: string | null;
};

const providerName = (device: ConnectedHealthDevice | null): string => {
  if (device?.provider === "Mock Health") return "Demo Health";

  return device?.provider ?? "Connected Device";
};

export const formatDeviceSyncTitle = (input: DeviceSyncLabelInput): string => {
  if (input.syncStatus === "error" || input.error) return "Sync Error";

  if (input.dataSource === "live") return "Connected · Live";
  if (input.dataSource === "cache") return "Connected · Cached";
  if (input.dataSource === "no_data") return "Connected · No Data";
  if (input.dataSource === "fallback" || input.dataSource === "demo" || input.device?.provider === "Mock Health") {
    return "Demo Data";
  }

  return "Unavailable";
};

export const formatDeviceSyncStatus = (input: DeviceSyncLabelInput): string => {
  const title = formatDeviceSyncTitle(input);

  if (title === "Unavailable" || title === "Sync Error") return title;
  if (title === "Demo Data") return `${providerName(input.device)} · Demo`;

  return `${providerName(input.device)} · ${title.split(" · ")[1]}`;
};

export const formatDeviceSyncMessage = (input: DeviceSyncLabelInput): string => {
  if (input.syncStatus === "error" || input.error) {
    return input.error ?? "Unable to read health data right now. Retry sync or check provider access.";
  }

  if (input.dataSource === "live") {
    return "Live Health Connect data is reflected in your health dashboard.";
  }

  if (input.dataSource === "cache") {
    return "Healthy You is showing cached health records from a previous sync. Retry Sync can check for newer Health Connect data.";
  }

  if (input.dataSource === "no_data") {
    return "Health Connect is connected, but no health records are available yet. Record activity with Google Fit, Mi Fitness, or another Health Connect-compatible app, then tap Retry Sync.";
  }

  if (input.dataSource === "fallback" || input.dataSource === "demo" || input.device?.provider === "Mock Health") {
    return "Healthy You is showing demo health data because a live Health Connect source is not available.";
  }

  return "No health data source is available yet. Install or enable Health Connect, grant permissions, then retry sync.";
};
