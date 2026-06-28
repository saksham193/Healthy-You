type OfflineAnalyticsReport = {
  offlineSessions: number;
  offlineUsage: number;
  cacheHits: number;
  memoryQueueEvents: number;
  offlineFallbacks: number;
  reconnectSuccesses: number;
};

export class OfflineAnalytics {
  private reportState: OfflineAnalyticsReport = {
    offlineSessions: 0,
    offlineUsage: 0,
    cacheHits: 0,
    memoryQueueEvents: 0,
    offlineFallbacks: 0,
    reconnectSuccesses: 0,
  };

  trackOfflineUse(input: { cacheHit?: boolean; fallback?: boolean } = {}): void {
    if (this.reportState.offlineUsage === 0) {
      this.reportState.offlineSessions += 1;
    }

    this.reportState.offlineUsage += 1;
    if (input.cacheHit) this.reportState.cacheHits += 1;
    if (input.fallback) this.reportState.offlineFallbacks += 1;
  }

  trackMemoryQueue(): void {
    this.reportState.memoryQueueEvents += 1;
  }

  trackReconnectSuccess(): void {
    this.reportState.reconnectSuccesses += 1;
  }

  report(): OfflineAnalyticsReport {
    return { ...this.reportState };
  }
}

export const offlineAnalytics = new OfflineAnalytics();
