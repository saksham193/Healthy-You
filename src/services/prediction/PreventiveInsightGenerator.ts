import type { PredictionCategory, PredictionResult, PreventiveInsight } from "./PredictionTypes";

const categoryLabels: Record<PredictionCategory, string> = {
  sleep: "Sleep",
  hydration: "Hydration",
  recovery: "Recovery",
  medication: "Medication routine",
  activity: "Activity",
  nutrition: "Nutrition consistency",
  device_data: "Device data",
};

const riskLabels: Record<PredictionResult["riskLevel"], string> = {
  low: "Low",
  moderate: "Moderate",
  elevated: "Elevated",
  high: "High",
};

const confidenceLabels: Record<PredictionResult["confidence"], string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

const dataQualityLabels: Record<PredictionResult["dataQuality"], string> = {
  fresh: "Fresh data",
  stale: "Stale data",
  limited: "Limited data",
  unavailable: "Data unavailable",
};

export class PreventiveInsightGenerator {
  generate(predictions: PredictionResult[]): PreventiveInsight[] {
    return predictions.map((prediction) => ({
      id: `predictive-${prediction.category}-${prediction.generatedAt}`,
      category: prediction.category,
      title: `${riskLabels[prediction.riskLevel]} ${categoryLabels[prediction.category]} Risk`,
      explanation: prediction.explanation.summary,
      actions: prediction.preventiveActions.slice(0, 3).map((action) => action.message),
      confidenceLabel: confidenceLabels[prediction.confidence],
      dataQualityLabel: dataQualityLabels[prediction.dataQuality],
      riskLevel: prediction.riskLevel,
      generatedAt: prediction.generatedAt,
    }));
  }
}

export const preventiveInsightGenerator = new PreventiveInsightGenerator();
