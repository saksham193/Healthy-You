import type { BackendAIResponse } from "../types/contracts";
import type { EvaluationMetric, AIInteractionMetric } from "./TelemetryTypes";

const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export class EvaluationEngine {
  evaluate(response: BackendAIResponse, metric: AIInteractionMetric): EvaluationMetric {
    const metadata = response.metadata;
    const governance = metadata?.governance;
    const ragUsed = Boolean(metadata?.ragUsed);
    const citationCount = metadata?.citations?.length ?? 0;
    const groundingFlags = governance?.groundingFlags ?? [];
    const safetyLevel = metadata?.safetyLevel;
    const qualityScore = clamp(85 - (response.response.length > 1400 ? 15 : 0) - (metric.errorType ? 40 : 0));
    const groundingScore = clamp((governance?.grounded === false ? 55 : 92) - groundingFlags.length * 12);
    const citationScore = clamp(ragUsed ? (citationCount > 0 ? 95 : 35) : 80);
    const safetyScore = clamp(
      safetyLevel === "urgent" && !/urgent|emergency/i.test(response.response)
        ? 30
        : groundingFlags.includes("diagnosis_language") || groundingFlags.includes("medication_certainty")
          ? 55
          : 95,
    );
    const latencyScore = clamp(100 - Math.max(0, metric.responseTimeMs - 1000) / 50);
    const agentConfidence = metadata?.agentConfidence;
    const confidenceScore = clamp(
      agentConfidence === "high"
        ? 92
        : agentConfidence === "medium"
          ? 78
          : metadata?.retrievalConfidence === "high"
            ? 95
            : metadata?.retrievalConfidence === "medium"
              ? 75
              : ragUsed ? 45 : 70,
    );
    const overallScore = clamp((qualityScore + groundingScore + citationScore + safetyScore + latencyScore + confidenceScore) / 6);

    return {
      qualityScore,
      groundingScore,
      citationScore,
      safetyScore,
      latencyScore,
      confidenceScore,
      overallScore,
    };
  }
}

export const evaluationEngine = new EvaluationEngine();
