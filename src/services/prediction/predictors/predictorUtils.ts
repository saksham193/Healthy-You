import type { AIContext } from "../../../types";
import { riskScoringEngine } from "../RiskScoringEngine";
import type {
  PredictionCategory,
  PredictionDataQuality,
  PredictionExplanation,
  PredictionHorizon,
  PredictionResult,
  PredictiveSignal,
  PreventiveAction,
} from "../PredictionTypes";

export const dataQualityForContext = (context: AIContext): PredictionDataQuality => {
  if (context.trendIntelligence?.dataQuality === "insufficient") return "limited";
  if (context.trendIntelligence?.dataQuality === "stale") return "stale";
  if (context.trendIntelligence?.dataQuality === "limited") return "limited";
  if (context.deviceDataSource === "unavailable") return "unavailable";
  if (context.deviceDataSource === "no_data") return "unavailable";
  if (context.deviceDataSource === "fallback" || context.deviceDataSource === "demo") return "limited";
  if (context.deviceDataSource === "cache") return "stale";

  return "fresh";
};

export const createPrediction = (
  category: PredictionCategory,
  signals: PredictiveSignal[],
  context: AIContext,
  input: {
    horizon: PredictionHorizon;
    explanation: PredictionExplanation;
    preventiveActions: PreventiveAction[];
    dataQuality?: PredictionDataQuality;
  },
): PredictionResult => {
  const scored = riskScoringEngine.score(signals, input.dataQuality ?? dataQualityForContext(context));

  return {
    category,
    riskLevel: scored.riskLevel,
    confidence: scored.confidence,
    horizon: input.horizon,
    signals,
    explanation: input.explanation,
    preventiveActions: input.preventiveActions,
    dataQuality: scored.dataQuality,
    generatedAt: new Date().toISOString(),
    score: scored.score,
  };
};

export const factorsFor = (signals: PredictiveSignal[], fallback: string): string[] =>
  signals.length ? signals.map((signal) => signal.label).slice(0, 4) : [fallback];

export const generalSafetyNote =
  "This is a wellness prediction from recent patterns, not a diagnosis or medical certainty.";
