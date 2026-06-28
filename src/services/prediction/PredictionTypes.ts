export type PredictionCategory =
  | "sleep"
  | "hydration"
  | "recovery"
  | "medication"
  | "activity"
  | "nutrition"
  | "device_data";

export type RiskLevel = "low" | "moderate" | "elevated" | "high";
export type PredictionConfidence = "low" | "medium" | "high";
export type PredictionHorizon = "today" | "next_24h" | "next_3_days" | "next_7_days";
export type PredictionDataQuality = "fresh" | "stale" | "limited" | "unavailable";

export type PreventiveAction = {
  id: string;
  message: string;
  priority: "low" | "medium" | "high";
};

export type PredictionExplanation = {
  summary: string;
  factors: string[];
  safetyNote: string;
};

export type PredictiveSignal = {
  id: string;
  category: PredictionCategory;
  label: string;
  value?: number | string;
  severity: "minor" | "moderate" | "strong";
  repeatedCount: number;
  source: "trend" | "device" | "profile" | "memory" | "schedule" | "data_quality";
};

export type PredictionResult = {
  category: PredictionCategory;
  riskLevel: RiskLevel;
  confidence: PredictionConfidence;
  horizon: PredictionHorizon;
  signals: PredictiveSignal[];
  explanation: PredictionExplanation;
  preventiveActions: PreventiveAction[];
  dataQuality: PredictionDataQuality;
  generatedAt: string;
  score: number;
};

export type PreventiveInsight = {
  id: string;
  category: PredictionCategory;
  title: string;
  explanation: string;
  actions: string[];
  confidenceLabel: string;
  dataQualityLabel: string;
  riskLevel: RiskLevel;
  generatedAt: string;
};

export type PredictionSummary = {
  topPredictions: PredictionResult[];
  allPredictions: PredictionResult[];
  insights: PreventiveInsight[];
  summary: string;
  generatedAt: string;
  metrics: {
    predictionCount: number;
    highRiskCount: number;
    predictionCategories: PredictionCategory[];
    averageConfidence: number;
    dataQualityIssues: number;
  };
};
