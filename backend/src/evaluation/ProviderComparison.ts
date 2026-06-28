import type {
  BenchmarkRunSummary,
  ProviderComparisonItem,
  ProviderComparisonReport,
  ScenarioBenchmarkResult,
} from "./GoldenDatasetTypes";

const average = (values: number[]): number =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

const confidenceScore = (results: ScenarioBenchmarkResult[]): number =>
  average(results.map((result) => (result.retrievalConfidence === "high" ? 95 : result.retrievalConfidence === "medium" ? 75 : 50)));

export class ProviderComparison {
  compare(summary: BenchmarkRunSummary): ProviderComparisonReport {
    const providers = Array.from(new Set(summary.results.map((result) => result.provider)));
    const items: ProviderComparisonItem[] = providers.map((provider) => {
      const results = summary.results.filter((result) => result.provider === provider);

      return {
        provider,
        scenarioCount: results.length,
        quality: average(results.map((result) => result.score)),
        latency: average(results.map((result) => result.latencyMs)),
        fallbackRate: results.length ? Math.round((results.filter((result) => result.fallbackUsed).length / results.length) * 100) : 0,
        confidence: confidenceScore(results),
        citation: results.length ? Math.round((results.filter((result) => result.citationPresent).length / results.length) * 100) : 0,
        grounding: results.length ? Math.round((results.filter((result) => result.groundingPassed).length / results.length) * 100) : 0,
      };
    });
    const best = [...items].sort((a, b) => b.quality - a.quality)[0];

    return {
      generatedAt: new Date().toISOString(),
      bestProvider: best?.provider,
      providers: items,
    };
  }
}

export const providerComparison = new ProviderComparison();
