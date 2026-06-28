import type { BenchmarkHistoryEntry, BenchmarkRunSummary, RegressionReport } from "./GoldenDatasetTypes";

const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_MAX_HISTORY = 200;

export type VersionComparison = {
  id: string;
  baselineVersion: string;
  currentVersion: string;
  timestamp: string;
  regressionSeverity: string;
  findingCount: number;
};

export class EvaluationStore {
  private history: BenchmarkHistoryEntry[] = [];
  private comparisons: VersionComparison[] = [];

  constructor(
    private readonly retentionDays: number = DEFAULT_RETENTION_DAYS,
    private readonly maxHistory: number = DEFAULT_MAX_HISTORY,
  ) {}

  saveBenchmark(summary: BenchmarkRunSummary): BenchmarkHistoryEntry {
    const entry: BenchmarkHistoryEntry = {
      id: summary.id,
      version: summary.version,
      timestamp: summary.timestamp,
      scenarioCount: summary.scenarioCount,
      passCount: summary.passCount,
      overallScore: summary.overallScore,
      safetyScore: summary.safetyScore,
      groundingScore: summary.groundingScore,
      citationScore: summary.citationScore,
      latencyScore: summary.latencyScore,
      offlineScore: summary.offlineScore,
      retrievalScore: summary.retrievalScore,
    };

    this.history.push(entry);
    this.rotate();

    return { ...entry };
  }

  saveComparison(baseline: BenchmarkRunSummary, current: BenchmarkRunSummary, regression: RegressionReport): VersionComparison {
    const comparison: VersionComparison = {
      id: `comparison-${Date.now()}`,
      baselineVersion: baseline.version,
      currentVersion: current.version,
      timestamp: new Date().toISOString(),
      regressionSeverity: regression.severity,
      findingCount: regression.findings.length,
    };

    this.comparisons.push(comparison);
    this.rotate();

    return { ...comparison };
  }

  getHistory(): BenchmarkHistoryEntry[] {
    this.rotate();
    return this.history.map((entry) => ({ ...entry }));
  }

  getComparisons(): VersionComparison[] {
    this.rotate();
    return this.comparisons.map((entry) => ({ ...entry }));
  }

  clear(): void {
    this.history = [];
    this.comparisons = [];
  }

  private rotate(): void {
    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
    this.history = this.history
      .filter((entry) => new Date(entry.timestamp).getTime() >= cutoff)
      .slice(-this.maxHistory);
    this.comparisons = this.comparisons
      .filter((entry) => new Date(entry.timestamp).getTime() >= cutoff)
      .slice(-this.maxHistory);
  }
}

export const evaluationStore = new EvaluationStore();
