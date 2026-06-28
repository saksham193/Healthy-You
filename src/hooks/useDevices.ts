import { useCallback, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import {
  connectDevice,
  getDeviceSyncProviderStatus,
} from "../services/devices/deviceService";
import {
  formatDeviceSyncMessage,
  formatDeviceSyncStatus,
  formatDeviceSyncTitle,
} from "../services/devices/deviceSyncLabels";
import { useHealthStore } from "../store/healthStore";
import type { ConnectedHealthDevice, HealthDataState } from "../types";

type DeviceDataSource = HealthDataState["deviceDataSource"];

const getPrimaryDevice = (devices: ConnectedHealthDevice[]): ConnectedHealthDevice | null =>
  devices.find((device) => device.status === "Connected") ?? devices[0] ?? null;

const getDeviceSourceLabel = (
  dataSource: DeviceDataSource,
  device: ConnectedHealthDevice | null,
  syncStatus: HealthDataState["deviceSyncStatus"],
  error?: string | null,
): "Live" | "Cached" | "No Data" | "Demo" | "Fallback" | "Unavailable" | "Sync Error" => {
  if (syncStatus === "error" || error) return "Sync Error";
  if (dataSource === "live") return "Live";
  if (dataSource === "cache") return "Cached";
  if (dataSource === "no_data") return "No Data";
  if (dataSource === "fallback") return device?.provider === "Mock Health" ? "Demo" : "Fallback";
  if (dataSource === "demo") return "Demo";

  return device?.provider === "Mock Health" ? "Demo" : "Unavailable";
};

const alertWithRetry = (
  title: string,
  message: string,
  retry: () => Promise<void>,
): void => {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Retry Sync", onPress: () => void retry() },
  ]);
};

const healthConnectEnableMessage = (error: string | null): string => {
  const status = error ? `\n\nStatus: ${error}` : "";

  return `Install or update Health Connect, then open Android Settings > Health Connect > App permissions and allow Healthy You to read activity, sleep, vitals, hydration, and body metrics.${status}`;
};

export function useDevices() {
  const devices = useHealthStore((state) => state.devices);
  const deviceSyncStatus = useHealthStore((state) => state.deviceSyncStatus);
  const deviceDataSource = useHealthStore((state) => state.deviceDataSource);
  const deviceDataStale = useHealthStore((state) => state.deviceDataStale);
  const lastHealthSyncAt = useHealthStore((state) => state.lastHealthSyncAt);
  const deviceSyncError = useHealthStore((state) => state.deviceSyncError);
  const loading = useHealthStore((state) => state.loading);
  const error = useHealthStore((state) => state.error);
  const loadDevices = useHealthStore((state) => state.loadDevices);
  const syncHealthData = useHealthStore((state) => state.syncHealthData);
  const primaryDevice = useMemo(() => getPrimaryDevice(devices), [devices]);
  const sourceLabel = getDeviceSourceLabel(deviceDataSource, primaryDevice, deviceSyncStatus, deviceSyncError);
  const syncTitle = formatDeviceSyncTitle({
    dataSource: deviceDataSource,
    device: primaryDevice,
    syncStatus: deviceSyncStatus,
    error: deviceSyncError,
  });
  const syncStatusLabel = formatDeviceSyncStatus({
    dataSource: deviceDataSource,
    device: primaryDevice,
    syncStatus: deviceSyncStatus,
    error: deviceSyncError,
  });

  useEffect(() => {
    if (devices.length === 0) {
      void loadDevices();
    }
  }, [devices.length, loadDevices]);

  const showSyncResult = useCallback((retry: () => Promise<void>) => {
    const state = useHealthStore.getState();
    const latestDevice = getPrimaryDevice(state.devices);
    const latestSourceLabel = getDeviceSourceLabel(
      state.deviceDataSource,
      latestDevice,
      state.deviceSyncStatus,
      state.deviceSyncError,
    );
    const latestInput = {
      dataSource: state.deviceDataSource,
      device: latestDevice,
      syncStatus: state.deviceSyncStatus,
      error: state.deviceSyncError,
    };

    if (state.deviceSyncError) {
      alertWithRetry("Sync Error", formatDeviceSyncMessage(latestInput), retry);
      return;
    }

    if (latestSourceLabel === "Live") {
      Alert.alert(formatDeviceSyncStatus(latestInput), formatDeviceSyncMessage(latestInput));
      return;
    }

    if (latestSourceLabel === "Cached") {
      alertWithRetry(
        formatDeviceSyncStatus(latestInput),
        formatDeviceSyncMessage(latestInput),
        retry,
      );
      return;
    }

    if (latestSourceLabel === "No Data") {
      alertWithRetry(
        formatDeviceSyncStatus(latestInput),
        formatDeviceSyncMessage(latestInput),
        retry,
      );
      return;
    }

    if (latestSourceLabel === "Demo" || latestSourceLabel === "Fallback") {
      alertWithRetry(
        formatDeviceSyncStatus(latestInput),
        formatDeviceSyncMessage(latestInput),
        retry,
      );
      return;
    }

    alertWithRetry(
      formatDeviceSyncTitle(latestInput),
      formatDeviceSyncMessage(latestInput),
      retry,
    );
  }, []);

  const syncNow = useCallback(async (showResult = true) => {
    await syncHealthData();
    await loadDevices();

    if (showResult) {
      showSyncResult(() => syncNow(true));
    }
  }, [loadDevices, showSyncResult, syncHealthData]);

  const handleDevicePress = useCallback(async () => {
    if (useHealthStore.getState().deviceSyncStatus === "syncing") return;

    try {
      const providerStatus = (await getDeviceSyncProviderStatus()).data;
      const state = useHealthStore.getState();
      const currentDevice = getPrimaryDevice(state.devices);
      const currentSourceLabel = getDeviceSourceLabel(
        state.deviceDataSource,
        currentDevice,
        state.deviceSyncStatus,
        state.deviceSyncError,
      );

      if (providerStatus.providerName === "Mock Health" || providerStatus.isFallback || currentSourceLabel === "Demo") {
        alertWithRetry(
          "Demo Device Data",
          "Healthy You is showing demo health data because a live device provider is not available. Tap Retry Sync to check again for Health Connect and refresh the fallback data.",
          () => syncNow(true),
        );
        return;
      }

      if (providerStatus.platform === "android" && providerStatus.providerName === "Health Connect") {
        if (providerStatus.status === "unavailable" || providerStatus.status === "error") {
          alertWithRetry(
            "Health Connect Unavailable",
            healthConnectEnableMessage(providerStatus.error),
            () => syncNow(true),
          );
          return;
        }

        if (providerStatus.status === "available" || providerStatus.status === "disconnected") {
          await connectDevice(providerStatus.providerId);
          await loadDevices();

          const latestStatus = (await getDeviceSyncProviderStatus()).data;

          if (latestStatus.status !== "connected") {
            alertWithRetry(
              "Health Connect Permissions Needed",
              healthConnectEnableMessage(latestStatus.error ?? "Healthy You does not have Health Connect read permissions."),
              () => syncNow(true),
            );
            return;
          }
        }
      }

      await syncNow(true);
    } catch (error) {
      alertWithRetry(
        "Device Sync Failed",
        error instanceof Error ? error.message : "Unable to sync health data right now.",
        () => syncNow(true),
      );
    }
  }, [loadDevices, syncNow]);

  return {
    data: devices,
    loading,
    error: error ?? deviceSyncError,
    syncStatus: deviceSyncStatus,
    dataSource: deviceDataSource,
    dataStale: deviceDataStale,
    lastHealthSyncAt,
    primaryDevice,
    sourceLabel,
    syncTitle,
    syncStatusLabel,
    refresh: loadDevices,
    sync: syncHealthData,
    syncNow,
    handleDevicePress,
  };
}
