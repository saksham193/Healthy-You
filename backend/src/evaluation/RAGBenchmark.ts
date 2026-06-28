import type { BenchmarkRunSummary, RAGBenchmarkReport } from "./GoldenDatasetTypes";

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

export class RAGBenchmark {
  measure(summary: BenchmarkRunSummary): RAGBenchmarkReport {
    const ragResults = summary.results.filter((result) => result.provider === "rag" || result.citationPresent);
    const denominator = ragResults.length || 1;

    return {
      generatedAt: new Date().toISOString(),
      retrievalSuccessPercent: Math.round((ragResults.filter((result) => result.groundingPassed).length / denominator) * 100),
      citationPercent: Math.round((ragResults.filter((result) => result.citationPresent).length / denominator) * 100),
      knowledgeHitRate: Math.round((ragResults.filter((result) => result.signalsFound.some((signal) => signal.startsWith("category:"))).length / denominator) * 100),
      averageConfidence: average(ragResults.map((result) => confidenceValue(result.retrievalConfidence))),
      groundingPercent: Math.round((ragResults.filter((result) => result.evaluation.groundingScore >= 80).length / denominator) * 100),
      hallucinationDowngradeCount: ragResults.filter((result) => result.violations.some((violation) => /grounding|citation/i.test(violation))).length,
    };
  }
}

export const ragBenchmark = new RAGBenchmark();
