import type { BenchmarkRunSummary, OfflineBenchmarkReport } from "./GoldenDatasetTypes";

const average = (values: number[]): number =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

const confidenceValue = (confidence?: "low" | "medium" | "high"): number => {
  if (confidence === "high") {
    return 95;
  }

  if (confidence === "medium") {
    return 75;
  }

  return 50;
};

export class OfflineBenchmark {
  measure(summary: BenchmarkRunSummary): OfflineBenchmarkReport {
    const offlineResults = summary.results.filter((result) => result.provider === "offline");
    const denominator = offlineResults.length || 1;

    return {
      generatedAt: new Date().toISOString(),
      scenarioCount: offlineResults.length,
      cacheHitPercent: Math.round((offlineResults.filter((result) => result.cacheUsed).length / denominator) * 100),
      fallbackPercent: Math.round((offlineResults.filter((result) => result.fallbackUsed).length / denominator) * 100),
      memoryQueuePercent: Math.round((offlineResults.filter((result) => result.signalsFound.includes("memory_queue")).length / denominator) * 100),
      offlineConfidence: average(offlineResults.map((result) => confidenceValue(result.retrievalConfidence))),
      offlineSafetyPercent: Math.round((offlineResults.filter((result) => result.safetyPassed).length / denominator) * 100),
      reconnectRecoveryPercent: Math.round((offlineResults.filter((result) => result.signalsFound.includes("reconnect")).length / denominator) * 100),
    };
  }
}

export const offlineBenchmark = new OfflineBenchmark();
