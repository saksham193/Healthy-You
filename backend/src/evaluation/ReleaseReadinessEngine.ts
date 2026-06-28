import type {
  BenchmarkRunSummary,
  QualityGateReport,
  RAGBenchmarkReport,
  OfflineBenchmarkReport,
  ReleaseReadinessLevel,
  ReleaseReadinessReport,
} from "./GoldenDatasetTypes";

const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));
const average = (values: number[]): number => (values.length ? clamp(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);

export class ReleaseReadinessEngine {
  compute(
    summary: BenchmarkRunSummary,
    gates: QualityGateReport,
    rag: RAGBenchmarkReport,
    offline: OfflineBenchmarkReport,
  ): ReleaseReadinessReport {
    const dimensions = {
      architecture: 90,
      safety: summary.safetyScore,
      quality: summary.overallScore,
      latency: summary.latencyScore,
      offline: average([summary.offlineScore, offline.offlineSafetyPercent, offline.offlineConfidence]),
      retrieval: average([summary.retrievalScore, rag.retrievalSuccessPercent, rag.citationPercent, rag.groundingPercent]),
      evaluation: gates.releaseBlocked ? 55 : average([summary.overallScore, summary.groundingScore, summary.citationScore]),
    };
    const score = gates.releaseBlocked
      ? Math.min(69, average(Object.values(dimensions)))
      : average(Object.values(dimensions));
    const level = this.levelFor(score, gates.releaseBlocked);

    return {
      generatedAt: new Date().toISOString(),
      score,
      level,
      recommendation: this.recommendation(level, gates.releaseBlocked),
      dimensions,
    };
  }

  private levelFor(score: number, blocked: boolean): ReleaseReadinessLevel {
    if (blocked || score < 70) {
      return "Not Ready";
    }

    if (score < 82) {
      return "Beta";
    }

    if (score < 90) {
      return "Release Candidate";
    }

    return "Production Ready";
  }

  private recommendation(level: ReleaseReadinessLevel, blocked: boolean): string {
    if (blocked) {
      return "Release blocked by quality gates. Resolve blocked gates and rerun validation.";
    }

    if (level === "Production Ready") {
      return "Quality lab signals support production release, pending normal product review.";
    }

    if (level === "Release Candidate") {
      return "Suitable for release candidate validation with focused review of warning gates.";
    }

    if (level === "Beta") {
      return "Suitable for controlled beta validation; improve weaker benchmark dimensions first.";
    }

    return "Not ready for release. Address benchmark failures before shipping.";
  }
}

export const releaseReadinessEngine = new ReleaseReadinessEngine();
