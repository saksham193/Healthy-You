import { useEffect } from "react";
import { useHealthStore } from "../store/healthStore";

export function useHealthData() {
  const healthScore = useHealthStore((state) => state.healthScore);
  const nutrition = useHealthStore((state) => state.nutrition);
  const fitness = useHealthStore((state) => state.fitness);
  const sleep = useHealthStore((state) => state.sleep);
  const schedule = useHealthStore((state) => state.schedule);
  const profile = useHealthStore((state) => state.profile);
  const personalProfile = useHealthStore((state) => state.personalProfile);
  const vitals = useHealthStore((state) => state.vitals);
  const deviceSyncStatus = useHealthStore((state) => state.deviceSyncStatus);
  const deviceDataSource = useHealthStore((state) => state.deviceDataSource);
  const deviceDataStale = useHealthStore((state) => state.deviceDataStale);
  const lastHealthSyncAt = useHealthStore((state) => state.lastHealthSyncAt);
  const deviceSyncError = useHealthStore((state) => state.deviceSyncError);
  const profileSyncStatus = useHealthStore((state) => state.profileSyncStatus);
  const profileSyncError = useHealthStore((state) => state.profileSyncError);
  const lastProfileSyncAt = useHealthStore((state) => state.lastProfileSyncAt);
  const queuedProfileUpdateCount = useHealthStore((state) => state.queuedProfileUpdateCount);
  const healthSummaries = useHealthStore((state) => state.healthSummaries);
  const latestHealthSummary = useHealthStore((state) => state.latestHealthSummary);
  const healthBackupStatus = useHealthStore((state) => state.healthBackupStatus);
  const healthBackupError = useHealthStore((state) => state.healthBackupError);
  const queuedHealthSummaryBackupCount = useHealthStore((state) => state.queuedHealthSummaryBackupCount);
  const lastHealthSummaryBackupAt = useHealthStore((state) => state.lastHealthSummaryBackupAt);
  const loading = useHealthStore((state) => state.loading);
  const error = useHealthStore((state) => state.error);
  const loadHealthData = useHealthStore((state) => state.loadHealthData);
  const refreshHealthData = useHealthStore((state) => state.refreshHealthData);
  const syncHealthData = useHealthStore((state) => state.syncHealthData);
  const syncProfileToCloud = useHealthStore((state) => state.syncProfileToCloud);
  const loadProfileFromCloud = useHealthStore((state) => state.loadProfileFromCloud);
  const queueProfileUpdateWhenOffline = useHealthStore((state) => state.queueProfileUpdateWhenOffline);
  const flushQueuedProfileUpdates = useHealthStore((state) => state.flushQueuedProfileUpdates);
  const backupHealthSummaryToCloud = useHealthStore((state) => state.backupHealthSummaryToCloud);
  const loadHealthSummariesFromCloud = useHealthStore((state) => state.loadHealthSummariesFromCloud);
  const queueHealthSummaryBackup = useHealthStore((state) => state.queueHealthSummaryBackup);
  const flushQueuedHealthSummaryBackups = useHealthStore((state) => state.flushQueuedHealthSummaryBackups);

  useEffect(() => {
    if (!nutrition && !fitness && !schedule && !profile && !vitals) {
      void loadHealthData();
    }
  }, [fitness, loadHealthData, nutrition, profile, schedule, vitals]);

  return {
    data: {
      healthScore,
      nutrition,
      fitness,
      sleep,
      schedule,
      profile,
      personalProfile,
      vitals,
      deviceSyncStatus,
      deviceDataSource,
      deviceDataStale,
      lastHealthSyncAt,
      deviceSyncError,
      profileSyncStatus,
      profileSyncError,
      lastProfileSyncAt,
      queuedProfileUpdateCount,
      healthSummaries,
      latestHealthSummary,
      healthBackupStatus,
      healthBackupError,
      queuedHealthSummaryBackupCount,
      lastHealthSummaryBackupAt,
    },
    loading,
    error,
    refresh: refreshHealthData,
    syncHealthData,
    syncProfileToCloud,
    loadProfileFromCloud,
    queueProfileUpdateWhenOffline,
    flushQueuedProfileUpdates,
    backupHealthSummaryToCloud,
    loadHealthSummariesFromCloud,
    queueHealthSummaryBackup,
    flushQueuedHealthSummaryBackups,
  };
}
