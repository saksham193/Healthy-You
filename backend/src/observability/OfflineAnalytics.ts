export class OfflineAnalytics {
  private offlineSessions = 0;
  private offlineUsage = 0;
  private cacheHits = 0;
  private memoryQueueEvents = 0;
  private offlineFallbacks = 0;
  private reconnectSuccesses = 0;

  trackOfflineUse(input: { cacheHit?: boolean; fallback?: boolean }): void {
    this.offlineUsage += 1;
    if (this.offlineUsage === 1) this.offlineSessions += 1;
    if (input.cacheHit) this.cacheHits += 1;
    if (input.fallback) this.offlineFallbacks += 1;
  }

  trackMemoryQueue(): void {
    this.memoryQueueEvents += 1;
  }

  trackReconnectSuccess(): void {
    this.reconnectSuccesses += 1;
  }

  report(): Record<string, number> {
    return {
      offlineSessions: this.offlineSessions,
      offlineUsage: this.offlineUsage,
      cacheHits: this.cacheHits,
      memoryQueueEvents: this.memoryQueueEvents,
      offlineFallbackRate: this.offlineUsage ? Math.round((this.offlineFallbacks / this.offlineUsage) * 100) : 0,
      reconnectSuccesses: this.reconnectSuccesses,
    };
  }
}

export const offlineAnalytics = new OfflineAnalytics();
