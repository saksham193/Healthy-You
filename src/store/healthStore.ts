import { create } from "zustand";
import {
  getConnectedDevices,
  startPeriodicHealthSync,
  syncHealthData as syncDeviceHealthData,
} from "../services/devices/deviceService";
import { applyDeviceMetricsToHealthData } from "../services/health/deviceHealthMapper";
import {
  fetchFitnessData,
  fetchNutritionData,
  fetchProfileData,
  fetchScheduleData,
  fetchSleepData,
  fetchVitalsData,
} from "../services/health/healthService";
import type { HealthDataState } from "../types";

type HealthStore = HealthDataState & {
  loadHealthData: () => Promise<void>;
  refreshHealthData: () => Promise<void>;
  loadDevices: () => Promise<void>;
  syncHealthData: () => Promise<void>;
};

export const useHealthStore = create<HealthStore>((set, get) => ({
  healthScore: null,
  nutrition: null,
  fitness: null,
  sleep: null,
  schedule: null,
  profile: null,
  vitals: null,
  devices: [],
  deviceSyncStatus: "idle",
  deviceDataSource: "unavailable",
  deviceDataStale: false,
  lastHealthSyncAt: null,
  deviceSyncError: null,
  loading: false,
  error: null,
  loadHealthData: async () => {
    set({ loading: true, error: null });

    try {
      const [nutrition, fitness, sleep, schedule, profile, vitals] =
        await Promise.all([
          fetchNutritionData(),
          fetchFitnessData(),
          fetchSleepData(),
          fetchScheduleData(),
          fetchProfileData(),
          fetchVitalsData(),
        ]);
      const deviceSync = await syncDeviceHealthData();
      const merged = applyDeviceMetricsToHealthData(
        {
          fitness: fitness.data,
          nutrition: nutrition.data,
          sleep: sleep.data,
          schedule: schedule.data,
          profile: profile.data,
          vitals: vitals.data,
        },
        deviceSync.data,
      );
      const devices = await getConnectedDevices();

      startPeriodicHealthSync();

      set({
        healthScore: merged.healthScore,
        nutrition: merged.nutrition,
        fitness: merged.fitness,
        sleep: merged.sleep,
        schedule: merged.schedule,
        profile: merged.profile,
        vitals: merged.vitals,
        devices: devices.data,
        deviceSyncStatus: deviceSync.data ? "synced" : "idle",
        deviceDataSource: deviceSync.data?.source ?? "unavailable",
        deviceDataStale: Boolean(deviceSync.data?.isStale),
        lastHealthSyncAt: deviceSync.data?.syncedAt ?? null,
        deviceSyncError: null,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unable to load health data.",
        loading: false,
      });
    }
  },
  refreshHealthData: async () => {
    await get().loadHealthData();
  },
  syncHealthData: async () => {
    set({ deviceSyncStatus: "syncing", deviceSyncError: null });

    try {
      const state = get();
      const response = await syncDeviceHealthData();

      if (
        !state.fitness ||
        !state.nutrition ||
        !state.sleep ||
        !state.schedule ||
        !state.profile ||
        !state.vitals
      ) {
        set({
          deviceSyncStatus: response.data ? "synced" : "idle",
          deviceDataSource: response.data?.source ?? state.deviceDataSource,
          deviceDataStale: response.data ? Boolean(response.data.isStale) : state.deviceDataStale,
          lastHealthSyncAt: response.data?.syncedAt ?? state.lastHealthSyncAt,
        });
        return;
      }

      const merged = applyDeviceMetricsToHealthData(
        {
          fitness: state.fitness,
          nutrition: state.nutrition,
          sleep: state.sleep,
          schedule: state.schedule,
          profile: state.profile,
          vitals: state.vitals,
        },
        response.data,
      );
      const devices = await getConnectedDevices();

      set({
        healthScore: merged.healthScore,
        nutrition: merged.nutrition,
        fitness: merged.fitness,
        sleep: merged.sleep,
        schedule: merged.schedule,
        profile: merged.profile,
        vitals: merged.vitals,
        devices: devices.data,
        deviceSyncStatus: response.data ? "synced" : "idle",
        deviceDataSource: response.data?.source ?? state.deviceDataSource,
        deviceDataStale: response.data ? Boolean(response.data.isStale) : state.deviceDataStale,
        lastHealthSyncAt: response.data?.syncedAt ?? state.lastHealthSyncAt,
        deviceSyncError: null,
      });
    } catch (error) {
      set({
        deviceSyncStatus: "error",
        deviceSyncError: error instanceof Error ? error.message : "Unable to sync health data.",
      });
    }
  },
  loadDevices: async () => {
    set({ loading: true, error: null });

    try {
      const response = await getConnectedDevices();

      set({ devices: response.data, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unable to load connected devices.",
        loading: false,
      });
    }
  },
}));
