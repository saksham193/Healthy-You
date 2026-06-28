import type { BenchmarkRunSummary, RegressionFinding, RegressionReport, RegressionSeverity } from "./GoldenDatasetTypes";

const drop = (baseline: number, current: number): number => Math.round(baseline - current);

const severityForDrop = (amount: number, criticalAt: number, warningAt: number): RegressionSeverity => {
  if (amount >= criticalAt) {
    return "critical";
  }

  if (amount >= warningAt) {
    return "warning";
  }

  return "none";
};

export class RegressionDetector {
  detect(baseline: BenchmarkRunSummary, current: BenchmarkRunSummary): RegressionReport {
    const findings: RegressionFinding[] = [];
    this.addDrop(findings, "overallScore", baseline.overallScore, current.overallScore, baseline, current, 10, 4);
    this.addDrop(findings, "citationScore", baseline.citationScore, current.citationScore, baseline, current, 15, 6);
    this.addDrop(findings, "groundingScore", baseline.groundingScore, current.groundingScore, baseline, current, 12, 5);
    this.addDrop(findings, "safetyScore", baseline.safetyScore, current.safetyScore, baseline, current, 5, 1);
    this.addDrop(findings, "offlineScore", baseline.offlineScore, current.offlineScore, baseline, current, 12, 5);
    this.addDrop(findings, "retrievalScore", baseline.retrievalScore, current.retrievalScore, baseline, current, 12, 5);
    this.addDrop(findings, "cacheScore", baseline.cacheScore, current.cacheScore, baseline, current, 15, 6);

    const latencyDrop = current.latencyScore - baseline.latencyScore;
    if (latencyDrop <= -8) {
      findings.push({
        id: "regression-latencyScore",
        severity: latencyDrop <= -15 ? "critical" : "warning",
        metric: "latencyScore",
        baselineValue: baseline.latencyScore,
        currentValue: current.latencyScore,
        affectedVersions: [baseline.version, current.version],
        recommendation: "Investigate provider latency, RAG retrieval time, and offline fallback path timing before release.",
      });
    }

    const severity: RegressionSeverity = findings.some((finding) => finding.severity === "critical")
      ? "critical"
      : findings.some((finding) => finding.severity === "warning")
        ? "warning"
        : "none";

    return {
      generatedAt: new Date().toISOString(),
      severity,
      findings,
    };
  }

  private addDrop(
    findings: RegressionFinding[],
    metric: keyof Pick<
      BenchmarkRunSummary,
      "overallScore" | "citationScore" | "groundingScore" | "safetyScore" | "offlineScore" | "retrievalScore" | "cacheScore"
    >,
    baselineValue: number,
    currentValue: number,
    baseline: BenchmarkRunSummary,
    current: BenchmarkRunSummary,
    criticalAt: number,
    warningAt: number,
  ): void {
    const amount = drop(baselineValue, currentValue);
    const severity = severityForDrop(amount, criticalAt, warningAt);
    if (severity === "none") {
      return;
    }

    findings.push({
      id: `regression-${metric}`,
      severity,
      metric,
      baselineValue,
      currentValue,
      affectedVersions: [baseline.version, current.version],
      recommendation: this.recommend(metric),
    });
  }

  private recommend(metric: string): string {
    if (metric === "safetyScore") {
      return "Block release until urgent, medication, and unsafe certainty checks are restored.";
    }

    if (metric === "citationScore" || metric === "retrievalScore") {
      return "Review RAG retrieval, citation ranking, and knowledge source coverage.";
    }

    if (metric === "offlineScore" || metric === "cacheScore") {
      return "Review offline provider, cache lookup, and reconnect validation paths.";
    }

    if (metric === "groundingScore") {
      return "Review grounding guard, retrieved knowledge categories, and unsupported claim handling.";
    }

    return "Compare benchmark diffs by scenario and fix the lowest scoring category before release.";
  }
}

export const regressionDetector = new RegressionDetector();
