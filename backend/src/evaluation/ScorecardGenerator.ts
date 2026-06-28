import type {
  BenchmarkRunSummary,
  OfflineBenchmarkReport,
  ProviderComparisonReport,
  RAGBenchmarkReport,
  ReleaseReadinessReport,
  Scorecard,
} from "./GoldenDatasetTypes";

export class ScorecardGenerator {
  ai(summary: BenchmarkRunSummary, readiness: ReleaseReadinessReport): Scorecard {
    return {
      generatedAt: new Date().toISOString(),
      type: "ai",
      score: readiness.score,
      status: readiness.level,
      metrics: {
        scenarios: summary.scenarioCount,
        passed: summary.passCount,
        failed: summary.failCount,
        overallScore: summary.overallScore,
        safetyScore: summary.safetyScore,
        groundingScore: summary.groundingScore,
        recommendation: readiness.recommendation,
      },
    };
  }

  provider(comparison: ProviderComparisonReport): Scorecard {
    const best = comparison.providers.find((item) => item.provider === comparison.bestProvider);

    return {
      generatedAt: new Date().toISOString(),
      type: "provider",
      score: best?.quality ?? 0,
      status: best ? `Best provider: ${best.provider}` : "No provider data",
      metrics: comparison.providers.reduce<Record<string, number | string | boolean>>((metrics, item) => {
        metrics[`${item.provider}.quality`] = item.quality;
        metrics[`${item.provider}.latencyMs`] = item.latency;
        metrics[`${item.provider}.citationPercent`] = item.citation;
        metrics[`${item.provider}.groundingPercent`] = item.grounding;
        return metrics;
      }, {}),
    };
  }

  rag(report: RAGBenchmarkReport): Scorecard {
    const score = Math.round((report.retrievalSuccessPercent + report.citationPercent + report.groundingPercent + report.averageConfidence) / 4);

    return {
      generatedAt: new Date().toISOString(),
      type: "rag",
      score,
      status: score >= 85 ? "Healthy" : score >= 75 ? "Watch" : "Needs attention",
      metrics: {
        retrievalSuccessPercent: report.retrievalSuccessPercent,
        citationPercent: report.citationPercent,
        knowledgeHitRate: report.knowledgeHitRate,
        groundingPercent: report.groundingPercent,
        hallucinationDowngradeCount: report.hallucinationDowngradeCount,
      },
    };
  }

  offline(report: OfflineBenchmarkReport): Scorecard {
    const score = Math.round((report.offlineSafetyPercent + report.offlineConfidence + report.cacheHitPercent + report.reconnectRecoveryPercent) / 4);

    return {
      generatedAt: new Date().toISOString(),
      type: "offline",
      score,
      status: score >= 80 ? "Ready" : score >= 70 ? "Limited" : "Needs attention",
      metrics: {
        scenarios: report.scenarioCount,
        cacheHitPercent: report.cacheHitPercent,
        fallbackPercent: report.fallbackPercent,
        memoryQueuePercent: report.memoryQueuePercent,
        offlineSafetyPercent: report.offlineSafetyPercent,
        reconnectRecoveryPercent: report.reconnectRecoveryPercent,
      },
    };
  }
}

export const scorecardGenerator = new ScorecardGenerator();
