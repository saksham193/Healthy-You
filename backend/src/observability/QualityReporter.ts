import { evaluationStore, EvaluationStore } from "./EvaluationStore";
import type { ObservabilityReport } from "./TelemetryTypes";

const average = (values: number[]): number =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

export class QualityReporter {
  constructor(private readonly store: EvaluationStore = evaluationStore) {}

  generate(): ObservabilityReport {
    const interactions = this.store.getInteractions();
    const evaluations = this.store.getEvaluations();
    const providerSplit = interactions.reduce<Record<string, number>>((split, metric) => {
      split[metric.provider] = (split[metric.provider] ?? 0) + 1;
      return split;
    }, {});
    const agentSelectionFrequency = interactions.reduce<Record<string, number>>((split, metric) => {
      metric.agentsUsed.forEach((agentId) => {
        split[agentId] = (split[agentId] ?? 0) + 1;
      });
      return split;
    }, {});
    const predictionCategories = interactions.reduce<Record<string, number>>((split, metric) => {
      metric.predictionCategories.forEach((category) => {
        split[category] = (split[category] ?? 0) + 1;
      });
      return split;
    }, {});

    return {
      generatedAt: new Date().toISOString(),
      requestCount: interactions.length,
      providerSplit,
      offlinePercent: interactions.length ? Math.round((interactions.filter((metric) => metric.onlineOffline === "offline").length / interactions.length) * 100) : 0,
      ragPercent: interactions.length ? Math.round((interactions.filter((metric) => metric.ragUsed).length / interactions.length) * 100) : 0,
      avgLatencyMs: average(interactions.map((metric) => metric.responseTimeMs)),
      avgQuality: average(evaluations.map((item) => item.evaluation.qualityScore)),
      avgGrounding: average(evaluations.map((item) => item.evaluation.groundingScore)),
      citationPercent: interactions.length ? Math.round((interactions.filter((metric) => metric.ragUsed && metric.retrievalConfidence !== "low").length / interactions.length) * 100) : 0,
      cachePercent: interactions.length ? Math.round((interactions.filter((metric) => metric.cacheUsed).length / interactions.length) * 100) : 0,
      fallbackPercent: interactions.length ? Math.round((interactions.filter((metric) => metric.fallbackUsed).length / interactions.length) * 100) : 0,
      safetyPercent: interactions.length ? Math.round((interactions.filter((metric) => metric.safetyLevel && metric.safetyLevel !== "wellness" && metric.safetyLevel !== "routine").length / interactions.length) * 100) : 0,
      agentRequestPercent: interactions.length ? Math.round((interactions.filter((metric) => metric.agentsUsed.length > 0).length / interactions.length) * 100) : 0,
      avgAgentLatencyMs: average(interactions.map((metric) => metric.agentLatencyMs)),
      agentConflictRate: interactions.length ? Math.round((interactions.filter((metric) => metric.agentConflictCount > 0).length / interactions.length) * 100) : 0,
      agentConsensusPercent: average(interactions.map((metric) => metric.agentConsensusPercent)),
      agentSelectionFrequency,
      predictionCount: interactions.reduce((sum, metric) => sum + metric.predictionCount, 0),
      highRiskPredictionCount: interactions.reduce((sum, metric) => sum + metric.highRiskPredictionCount, 0),
      predictionCategories,
      averagePredictionConfidence: average(interactions.map((metric) => metric.averagePredictionConfidence)),
      dataQualityIssues: interactions.reduce((sum, metric) => sum + metric.dataQualityIssues, 0),
    };
  }
}

export const qualityReporter = new QualityReporter();
