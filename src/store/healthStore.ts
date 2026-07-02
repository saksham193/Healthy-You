import { create } from "zustand";
import {
  getConnectedDevices,
  startPeriodicHealthSync,
  syncHealthData as syncDeviceHealthData,
} from "../services/devices/deviceService";
import { connectivityService } from "../services/connectivity/ConnectivityService";
import { applyDeviceMetricsToHealthData } from "../services/health/deviceHealthMapper";
import {
  fetchFitnessData,
  fetchNutritionData,
  fetchProfileData,
  fetchScheduleData,
  fetchSleepData,
  fetchVitalsData,
} from "../services/health/healthService";
import type {
  HealthBackupStatus,
  HealthDataState,
  HealthSummaryBackup,
  PersonalHealthProfile,
  ProfileSyncStatus,
} from "../types";
import type { DeviceHealthMetrics } from "../services/device/providers/DeviceProvider";

type HealthStore = HealthDataState & {
  loadHealthData: () => Promise<void>;
  refreshHealthData: () => Promise<void>;
  loadDevices: () => Promise<void>;
  syncHealthData: () => Promise<void>;
  syncProfileToCloud: (profile?: PersonalHealthProfile) => Promise<void>;
  loadProfileFromCloud: () => Promise<void>;
  queueProfileUpdateWhenOffline: (profile?: PersonalHealthProfile) => Promise<void>;
  flushQueuedProfileUpdates: () => Promise<void>;
  backupHealthSummaryToCloud: (summary?: HealthSummaryBackup, deviceMetrics?: DeviceHealthMetrics | null) => Promise<void>;
  loadHealthSummariesFromCloud: () => Promise<void>;
  queueHealthSummaryBackup: (summary?: HealthSummaryBackup) => Promise<void>;
  flushQueuedHealthSummaryBackups: () => Promise<void>;
};

const buildCurrentPersonalProfile = async (): Promise<PersonalHealthProfile | null> => {
  const { buildProfile } = await import("../services/ai/profile/ProfileBuilder");

  return buildProfile();
};

const statusFromOutcome = (status: "synced" | "pending" | "offline" | "skipped"): ProfileSyncStatus => {
  if (status === "skipped") return "idle";

  return status;
};

const healthBackupStatusFromOutcome = (status: HealthBackupStatus): HealthBackupStatus => status;

const buildCurrentHealthSummary = async (
  deviceMetrics?: DeviceHealthMetrics | null,
): Promise<HealthSummaryBackup | null> => {
  const { buildHealthSummaryBackup } = await import("../services/health/HealthSummaryCloudSync");
  const state = useHealthStore.getState();

  return buildHealthSummaryBackup({
    healthScore: state.healthScore,
    fitness: state.fitness,
    nutrition: state.nutrition,
    sleep: state.sleep,
    schedule: state.schedule,
    deviceMetrics,
    lastHealthSyncAt: state.lastHealthSyncAt,
  });
};

let profileConnectivityFlushStarted = false;

const ensureProfileConnectivityFlush = (): void => {
  if (profileConnectivityFlushStarted) return;

  profileConnectivityFlushStarted = true;
  connectivityService.subscribe((status) => {
    if (status.isOnline) {
      const state = useHealthStore.getState();

      if (state.queuedProfileUpdateCount > 0) {
        void state.flushQueuedProfileUpdates();
      } else if (state.profileSyncStatus === "offline" || state.profileSyncStatus === "pending") {
        void state.loadProfileFromCloud();
      }
    }

    if (status.isOnline && useHealthStore.getState().queuedHealthSummaryBackupCount > 0) {
      void useHealthStore.getState().flushQueuedHealthSummaryBackups();
    }
  });
};

export const useHealthStore = create<HealthStore>((set, get) => ({
  healthScore: null,
  nutrition: null,
  fitness: null,
  sleep: null,
  schedule: null,
  profile: null,
  personalProfile: null,
  vitals: null,
  devices: [],
  deviceSyncStatus: "idle",
  deviceDataSource: "unavailable",
  deviceDataStale: false,
  lastHealthSyncAt: null,
  deviceSyncError: null,
  profileSyncStatus: "idle",
  profileSyncError: null,
  lastProfileSyncAt: null,
  queuedProfileUpdateCount: 0,
  healthSummaries: [],
  latestHealthSummary: null,
  healthBackupStatus: "idle",
  healthBackupError: null,
  queuedHealthSummaryBackupCount: 0,
  lastHealthSummaryBackupAt: null,
  loading: false,
  error: null,
  loadHealthData: async () => {
    ensureProfileConnectivityFlush();
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

      void get().loadProfileFromCloud();
      void get().backupHealthSummaryToCloud(undefined, deviceSync.data);
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
      void get().backupHealthSummaryToCloud(undefined, response.data);
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
  syncProfileToCloud: async (profile) => {
    const { syncProfileToCloud: syncProfileToCloudRequest } = await import("../services/profile/ProfileCloudSync");
    const profileToSync = profile ?? get().personalProfile ?? await buildCurrentPersonalProfile();

    if (!profileToSync) return;

    set({ personalProfile: profileToSync, profileSyncStatus: "syncing", profileSyncError: null });

    const outcome = await syncProfileToCloudRequest(profileToSync);
    const now = outcome.status === "synced" ? new Date().toISOString() : get().lastProfileSyncAt;

    set({
      personalProfile: outcome.profile ?? profileToSync,
      profileSyncStatus: statusFromOutcome(outcome.status),
      profileSyncError: "error" in outcome ? outcome.error ?? null : null,
      queuedProfileUpdateCount: outcome.queuedCount,
      lastProfileSyncAt: now,
    });
  },
  loadProfileFromCloud: async () => {
    const { loadProfileFromCloud: loadProfileFromCloudRequest } = await import("../services/profile/ProfileCloudSync");
    const draftProfile = await buildCurrentPersonalProfile();

    if (draftProfile) {
      set({ personalProfile: draftProfile });
    }

    set({ profileSyncStatus: "syncing", profileSyncError: null });

    const outcome = await loadProfileFromCloudRequest(draftProfile);
    const now = outcome.status === "synced" ? new Date().toISOString() : get().lastProfileSyncAt;

    set({
      personalProfile: outcome.profile ?? draftProfile,
      profileSyncStatus: statusFromOutcome(outcome.status),
      profileSyncError: "error" in outcome ? outcome.error ?? null : null,
      queuedProfileUpdateCount: outcome.queuedCount,
      lastProfileSyncAt: now,
    });
  },
  queueProfileUpdateWhenOffline: async (profile) => {
    const { queueProfileUpdateWhenOffline: queueProfileUpdateWhenOfflineRequest } = await import("../services/profile/ProfileCloudSync");
    const profileToQueue = profile ?? get().personalProfile ?? await buildCurrentPersonalProfile();

    if (!profileToQueue) return;

    const queuedCount = await queueProfileUpdateWhenOfflineRequest(profileToQueue);

    set({
      personalProfile: profileToQueue,
      profileSyncStatus: "offline",
      profileSyncError: null,
      queuedProfileUpdateCount: queuedCount,
    });
  },
  flushQueuedProfileUpdates: async () => {
    const { flushQueuedProfileUpdates: flushQueuedProfileUpdatesRequest } = await import("../services/profile/ProfileCloudSync");
    set({ profileSyncStatus: "syncing", profileSyncError: null });

    const outcome = await flushQueuedProfileUpdatesRequest();

    set({
      personalProfile: outcome.profile ?? get().personalProfile,
      profileSyncStatus: outcome.queuedCount > 0 ? "pending" : "synced",
      queuedProfileUpdateCount: outcome.queuedCount,
      lastProfileSyncAt: outcome.queuedCount > 0 ? get().lastProfileSyncAt : new Date().toISOString(),
    });
  },
  backupHealthSummaryToCloud: async (summary, deviceMetrics) => {
    const {
      backupHealthSummaryToCloud: backupHealthSummaryToCloudRequest,
    } = await import("../services/health/HealthSummaryCloudSync");
    const summaryToBackup = summary ?? await buildCurrentHealthSummary(deviceMetrics);

    if (!summaryToBackup) return;

    set({
      latestHealthSummary: summaryToBackup,
      healthSummaries: [summaryToBackup, ...get().healthSummaries.filter((item) => item.id !== summaryToBackup.id)],
      healthBackupStatus: "syncing",
      healthBackupError: null,
    });

    const outcome = await backupHealthSummaryToCloudRequest(summaryToBackup);

    set({
      healthSummaries: outcome.summaries,
      latestHealthSummary: outcome.latestSummary,
      healthBackupStatus: healthBackupStatusFromOutcome(outcome.status),
      healthBackupError: outcome.error ?? null,
      queuedHealthSummaryBackupCount: outcome.queuedCount,
      lastHealthSummaryBackupAt: outcome.status === "synced" ? new Date().toISOString() : get().lastHealthSummaryBackupAt,
    });
  },
  loadHealthSummariesFromCloud: async () => {
    const {
      loadHealthSummariesFromCloud: loadHealthSummariesFromCloudRequest,
    } = await import("../services/health/HealthSummaryCloudSync");

    set({ healthBackupStatus: "syncing", healthBackupError: null });

    const outcome = await loadHealthSummariesFromCloudRequest();

    set({
      healthSummaries: outcome.summaries,
      latestHealthSummary: outcome.latestSummary,
      healthBackupStatus: healthBackupStatusFromOutcome(outcome.status),
      healthBackupError: outcome.error ?? null,
      queuedHealthSummaryBackupCount: outcome.queuedCount,
      lastHealthSummaryBackupAt: outcome.status === "synced" ? new Date().toISOString() : get().lastHealthSummaryBackupAt,
    });
  },
  queueHealthSummaryBackup: async (summary) => {
    const {
      queueHealthSummaryBackup: queueHealthSummaryBackupRequest,
    } = await import("../services/health/HealthSummaryCloudSync");
    const summaryToQueue = summary ?? await buildCurrentHealthSummary();

    if (!summaryToQueue) return;

    const queuedCount = await queueHealthSummaryBackupRequest(summaryToQueue);

    set({
      latestHealthSummary: summaryToQueue,
      healthBackupStatus: "offline",
      healthBackupError: null,
      queuedHealthSummaryBackupCount: queuedCount,
    });
  },
  flushQueuedHealthSummaryBackups: async () => {
    const {
      flushQueuedHealthSummaryBackups: flushQueuedHealthSummaryBackupsRequest,
    } = await import("../services/health/HealthSummaryCloudSync");

    set({ healthBackupStatus: "syncing", healthBackupError: null });

    const outcome = await flushQueuedHealthSummaryBackupsRequest();

    set({
      healthSummaries: outcome.summaries,
      latestHealthSummary: outcome.latestSummary,
      healthBackupStatus: healthBackupStatusFromOutcome(outcome.status),
      healthBackupError: outcome.error ?? null,
      queuedHealthSummaryBackupCount: outcome.queuedCount,
      lastHealthSummaryBackupAt: outcome.status === "synced" ? new Date().toISOString() : get().lastHealthSummaryBackupAt,
    });
  },
}));
