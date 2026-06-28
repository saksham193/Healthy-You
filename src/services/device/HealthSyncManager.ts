import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DeviceHealthMetrics, DeviceSyncWindow } from "./providers/DeviceProvider";
import { offlineAnalytics } from "../observability/OfflineAnalytics";

type SyncOperation = (window?: DeviceSyncWindow) => Promise<DeviceHealthMetrics | null>;

type QueuedSync = {
  id: string;
  attempts: number;
  window?: DeviceSyncWindow;
};

const CACHE_KEY = "healthy-you.device.health-cache";
const QUEUE_KEY = "healthy-you.device.sync-queue";
const LAST_SYNC_KEY = "healthy-you.device.last-sync";
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PERIODIC_INTERVAL_MS = 30 * 60 * 1000;

const withCacheSource = (metrics: DeviceHealthMetrics): DeviceHealthMetrics => ({
  ...metrics,
  source: metrics.source === "fallback" || metrics.source === "no_data" ? metrics.source : "cache",
  syncStatus: "synced",
  isStale: true,
});

export class HealthSyncManager {
  private queue: QueuedSync[] = [];
  private periodicSync: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly syncOperation: SyncOperation) {}

  async manualSync(window?: DeviceSyncWindow): Promise<DeviceHealthMetrics | null> {
    try {
      const metrics = await this.runWithRetry(window);

      if (metrics) {
        await this.cacheMetrics(metrics);
        await this.flushQueue();
      }

      return metrics;
    } catch {
      await this.queueSync(window);

      return this.getCachedMetrics();
    }
  }

  startPeriodicSync(intervalMs = DEFAULT_PERIODIC_INTERVAL_MS): void {
    if (this.periodicSync) return;

    this.periodicSync = setInterval(() => {
      void this.manualSync();
    }, intervalMs);
  }

  stopPeriodicSync(): void {
    if (!this.periodicSync) return;

    clearInterval(this.periodicSync);
    this.periodicSync = null;
  }

  async queueSync(window?: DeviceSyncWindow): Promise<void> {
    const queuedSync: QueuedSync = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      attempts: 0,
      window,
    };

    this.queue = [...(await this.loadQueue()), queuedSync];
    offlineAnalytics.trackMemoryQueue();
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
  }

  async flushQueue(): Promise<void> {
    const queue = await this.loadQueue();
    const remaining: QueuedSync[] = [];

    for (const item of queue) {
      try {
        const metrics = await this.runWithRetry(item.window, item.attempts);

        if (metrics) {
          await this.cacheMetrics(metrics);
        }
      } catch {
        if (item.attempts + 1 < MAX_RETRY_ATTEMPTS) {
          remaining.push({ ...item, attempts: item.attempts + 1 });
        }
      }
    }

    this.queue = remaining;
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    if (queue.length > 0 && remaining.length === 0) {
      offlineAnalytics.trackReconnectSuccess();
    }
  }

  async getCachedMetrics(): Promise<DeviceHealthMetrics | null> {
    const cached = await AsyncStorage.getItem(CACHE_KEY);

    if (!cached) return null;

    try {
      return withCacheSource(JSON.parse(cached) as DeviceHealthMetrics);
    } catch {
      return null;
    }
  }

  async getLastSyncAt(): Promise<string | null> {
    return AsyncStorage.getItem(LAST_SYNC_KEY);
  }

  private async runWithRetry(window?: DeviceSyncWindow, initialAttempt = 0): Promise<DeviceHealthMetrics | null> {
    let attempt = initialAttempt;

    while (attempt < MAX_RETRY_ATTEMPTS) {
      try {
        return await this.syncOperation(window);
      } catch (error) {
        attempt += 1;

        if (attempt >= MAX_RETRY_ATTEMPTS) {
          throw error;
        }
      }
    }

    return null;
  }

  private async cacheMetrics(metrics: DeviceHealthMetrics): Promise<void> {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(metrics));
    await AsyncStorage.setItem(LAST_SYNC_KEY, metrics.syncedAt);
  }

  private async loadQueue(): Promise<QueuedSync[]> {
    const queued = await AsyncStorage.getItem(QUEUE_KEY);

    if (!queued) return [];

    try {
      const parsed = JSON.parse(queued);

      return Array.isArray(parsed) ? (parsed as QueuedSync[]) : [];
    } catch {
      return [];
    }
  }
}
