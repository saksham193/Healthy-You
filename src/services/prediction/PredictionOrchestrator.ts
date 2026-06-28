import type { AIContext } from "../../types";
import { predictiveSignalEngine } from "./PredictiveSignalEngine";
import type {
  PredictionConfidence,
  PredictionDataQuality,
  PredictionHorizon,
  PredictionResult,
  PredictionSummary,
  PreventiveAction,
} from "./PredictionTypes";
import { preventiveInsightGenerator } from "./PreventiveInsightGenerator";
import { activityRiskPredictor } from "./predictors/ActivityRiskPredictor";
import { deviceDataQualityPredictor } from "./predictors/DeviceDataQualityPredictor";
import { hydrationRiskPredictor } from "./predictors/HydrationRiskPredictor";
import { medicationAdherencePredictor } from "./predictors/MedicationAdherencePredictor";
import { nutritionConsistencyPredictor } from "./predictors/NutritionConsistencyPredictor";
import { recoveryRiskPredictor } from "./predictors/RecoveryRiskPredictor";
import { sleepRiskPredictor } from "./predictors/SleepRiskPredictor";

const riskRank: Record<PredictionResult["riskLevel"], number> = {
  low: 1,
  moderate: 2,
  elevated: 3,
  high: 4,
};

const confidenceRank: Record<PredictionConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const horizonRank: Record<PredictionHorizon, number> = {
  today: 4,
  next_24h: 3,
  next_3_days: 2,
  next_7_days: 1,
};

const dataQualityRank: Record<PredictionDataQuality, number> = {
  fresh: 4,
  stale: 3,
  limited: 2,
  unavailable: 1,
};

const dedupeActions = (actions: PreventiveAction[]): PreventiveAction[] => {
  const seen = new Set<string>();

  return actions.filter((action) => {
    const key = action.message.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);

    return true;
  });
};

const averageConfidence = (predictions: PredictionResult[]): number => {
  if (predictions.length === 0) return 0;

  return Math.round(
    (predictions.reduce((sum, prediction) => sum + confidenceRank[prediction.confidence], 0) /
      (predictions.length * 3)) * 100,
  );
};

export class PredictionOrchestrator {
  run(context: AIContext): PredictionSummary {
    const signals = predictiveSignalEngine.extract(context);
    const allPredictions = [
      sleepRiskPredictor.predict(context, signals),
      hydrationRiskPredictor.predict(context, signals),
      recoveryRiskPredictor.predict(context, signals),
      medicationAdherencePredictor.predict(context, signals),
      activityRiskPredictor.predict(context, signals),
      nutritionConsistencyPredictor.predict(context, signals),
      deviceDataQualityPredictor.predict(context, signals),
    ].map((prediction) => ({
      ...prediction,
      preventiveActions: dedupeActions(prediction.preventiveActions),
    }));
    const sorted = [...allPredictions].sort((left, right) =>
      riskRank[right.riskLevel] - riskRank[left.riskLevel] ||
      confidenceRank[right.confidence] - confidenceRank[left.confidence] ||
      horizonRank[right.horizon] - horizonRank[left.horizon] ||
      dataQualityRank[right.dataQuality] - dataQualityRank[left.dataQuality] ||
      right.score - left.score,
    );
    const topPredictions = sorted.slice(0, 3);
    const insights = preventiveInsightGenerator.generate(topPredictions);
    const categories = topPredictions.map((prediction) => prediction.category);
    const summary = topPredictions.length
      ? `Top wellness prediction signals: ${topPredictions.map((prediction) => `${prediction.category} ${prediction.riskLevel}`).join(", ")}.`
      : "No predictive wellness signals available.";

    return {
      topPredictions,
      allPredictions,
      insights,
      summary,
      generatedAt: new Date().toISOString(),
      metrics: {
        predictionCount: allPredictions.length,
        highRiskCount: allPredictions.filter((prediction) => prediction.riskLevel === "high").length,
        predictionCategories: categories,
        averageConfidence: averageConfidence(allPredictions),
        dataQualityIssues: allPredictions.filter((prediction) => prediction.dataQuality !== "fresh").length,
      },
    };
  }
}

export const predictionOrchestrator = new PredictionOrchestrator();
