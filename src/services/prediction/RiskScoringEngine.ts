import type { PredictionConfidence, PredictionDataQuality, PredictiveSignal, RiskLevel } from "./PredictionTypes";

export type RiskScore = {
  score: number;
  riskLevel: RiskLevel;
  confidence: PredictionConfidence;
  dataQuality: PredictionDataQuality;
};

const severityScore: Record<PredictiveSignal["severity"], number> = {
  minor: 12,
  moderate: 24,
  strong: 34,
};

const riskFromScore = (score: number): RiskLevel => {
  if (score >= 74) return "high";
  if (score >= 52) return "elevated";
  if (score >= 28) return "moderate";

  return "low";
};

const confidenceFrom = (dataQuality: PredictionDataQuality, signals: PredictiveSignal[]): PredictionConfidence => {
  if (dataQuality === "unavailable") return "low";
  if (dataQuality === "stale" || dataQuality === "limited") return signals.length >= 2 ? "medium" : "low";
  if (signals.length >= 2 && signals.some((signal) => signal.repeatedCount >= 2)) return "high";

  return signals.length > 0 ? "medium" : "low";
};

export class RiskScoringEngine {
  score(signals: PredictiveSignal[], dataQuality: PredictionDataQuality): RiskScore {
    const rawScore = signals.reduce((total, signal) => {
      const repeatedBonus = Math.min(24, Math.max(0, signal.repeatedCount - 1) * 8);
      return total + severityScore[signal.severity] + repeatedBonus;
    }, 0);
    const singleMetricCap = signals.length <= 1 ? 50 : 100;
    const dataQualityPenalty = dataQuality === "fresh" ? 0 : dataQuality === "limited" ? 8 : dataQuality === "stale" ? 12 : 22;
    const score = Math.max(0, Math.min(singleMetricCap, rawScore - dataQualityPenalty));

    return {
      score,
      riskLevel: riskFromScore(score),
      confidence: confidenceFrom(dataQuality, signals),
      dataQuality,
    };
  }
}

export const riskScoringEngine = new RiskScoringEngine();
