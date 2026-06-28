import { useEffect } from "react";
import { useHealthStore } from "../store/healthStore";

export function useHealthData() {
  const healthScore = useHealthStore((state) => state.healthScore);
  const nutrition = useHealthStore((state) => state.nutrition);
  const fitness = useHealthStore((state) => state.fitness);
  const sleep = useHealthStore((state) => state.sleep);
  const schedule = useHealthStore((state) => state.schedule);
  const profile = useHealthStore((state) => state.profile);
  const vitals = useHealthStore((state) => state.vitals);
  const deviceSyncStatus = useHealthStore((state) => state.deviceSyncStatus);
  const deviceDataSource = useHealthStore((state) => state.deviceDataSource);
  const deviceDataStale = useHealthStore((state) => state.deviceDataStale);
  const lastHealthSyncAt = useHealthStore((state) => state.lastHealthSyncAt);
  const deviceSyncError = useHealthStore((state) => state.deviceSyncError);
  const loading = useHealthStore((state) => state.loading);
  const error = useHealthStore((state) => state.error);
  const loadHealthData = useHealthStore((state) => state.loadHealthData);
  const refreshHealthData = useHealthStore((state) => state.refreshHealthData);
  const syncHealthData = useHealthStore((state) => state.syncHealthData);

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
      vitals,
      deviceSyncStatus,
      deviceDataSource,
      deviceDataStale,
      lastHealthSyncAt,
      deviceSyncError,
    },
    loading,
    error,
    refresh: refreshHealthData,
    syncHealthData,
  };
}
