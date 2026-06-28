import type { EvaluationMetric, ProviderName } from "../observability/TelemetryTypes";

export type EvaluationCategory =
  | "hydration"
  | "sleep"
  | "nutrition"
  | "fitness"
  | "medication"
  | "device"
  | "offline"
  | "urgent"
  | "retrieval"
  | "general";

export type EvaluationRiskLevel = "wellness" | "caution" | "urgent";

export type ExpectedSignals = {
  safetyLevel?: "wellness" | "caution" | "urgent" | "out_of_scope";
  ragExpected?: boolean;
  citationExpected?: boolean;
  offlineExpected?: boolean;
  cacheExpected?: boolean;
  memoryQueueExpected?: boolean;
  reconnectExpected?: boolean;
  categories?: string[];
  confidenceAtLeast?: "low" | "medium" | "high";
};

export type EvaluationScenario = {
  id: string;
  category: EvaluationCategory;
  intent: string;
  riskLevel: EvaluationRiskLevel;
  offlineSupported: boolean;
  input: string;
  expectedSignals: ExpectedSignals;
  mustInclude: string[];
  mustAvoid: string[];
  minimumScore: number;
};

export type BenchmarkProvider = ProviderName | "rag";

export type ScenarioBenchmarkResult = {
  scenarioId: string;
  category: EvaluationCategory;
  provider: BenchmarkProvider;
  passed: boolean;
  score: number;
  minimumScore: number;
  evaluation: EvaluationMetric;
  latencyMs: number;
  retrievalConfidence?: "low" | "medium" | "high";
  citationPresent: boolean;
  fallbackUsed: boolean;
  cacheUsed: boolean;
  safetyPassed: boolean;
  groundingPassed: boolean;
  signalsFound: string[];
  violations: string[];
};

export type BenchmarkRunSummary = {
  id: string;
  version: string;
  timestamp: string;
  scenarioCount: number;
  passCount: number;
  failCount: number;
  overallScore: number;
  safetyScore: number;
  groundingScore: number;
  citationScore: number;
  latencyScore: number;
  offlineScore: number;
  retrievalScore: number;
  cacheScore: number;
  providerScores: Record<string, number>;
  categoryScores: Record<string, number>;
  results: ScenarioBenchmarkResult[];
};

export type RegressionSeverity = "none" | "warning" | "critical";

export type RegressionFinding = {
  id: string;
  severity: RegressionSeverity;
  metric: string;
  baselineValue: number;
  currentValue: number;
  affectedVersions: string[];
  recommendation: string;
};

export type RegressionReport = {
  generatedAt: string;
  severity: RegressionSeverity;
  findings: RegressionFinding[];
};

export type QualityGateStatus = "passed" | "warning" | "blocked";

export type QualityGateResult = {
  gate: "Safety" | "Grounding" | "Citation" | "Latency" | "Evaluation" | "Offline";
  status: QualityGateStatus;
  score: number;
  threshold: number;
  message: string;
};

export type QualityGateReport = {
  generatedAt: string;
  releaseBlocked: boolean;
  gates: QualityGateResult[];
};

export type ProviderComparisonItem = {
  provider: BenchmarkProvider;
  scenarioCount: number;
  quality: number;
  latency: number;
  fallbackRate: number;
  confidence: number;
  citation: number;
  grounding: number;
};

export type ProviderComparisonReport = {
  generatedAt: string;
  bestProvider?: BenchmarkProvider;
  providers: ProviderComparisonItem[];
};

export type RAGBenchmarkReport = {
  generatedAt: string;
  retrievalSuccessPercent: number;
  citationPercent: number;
  knowledgeHitRate: number;
  averageConfidence: number;
  groundingPercent: number;
  hallucinationDowngradeCount: number;
};

export type OfflineBenchmarkReport = {
  generatedAt: string;
  scenarioCount: number;
  cacheHitPercent: number;
  fallbackPercent: number;
  memoryQueuePercent: number;
  offlineConfidence: number;
  offlineSafetyPercent: number;
  reconnectRecoveryPercent: number;
};

export type ReleaseReadinessLevel = "Not Ready" | "Beta" | "Release Candidate" | "Production Ready";

export type ReleaseReadinessReport = {
  generatedAt: string;
  score: number;
  level: ReleaseReadinessLevel;
  recommendation: string;
  dimensions: {
    architecture: number;
    safety: number;
    quality: number;
    latency: number;
    offline: number;
    retrieval: number;
    evaluation: number;
  };
};

export type Scorecard = {
  generatedAt: string;
  type: "ai" | "provider" | "rag" | "offline";
  score: number;
  status: string;
  metrics: Record<string, number | string | boolean>;
};

export type BenchmarkHistoryEntry = {
  id: string;
  version: string;
  timestamp: string;
  scenarioCount: number;
  passCount: number;
  overallScore: number;
  safetyScore: number;
  groundingScore: number;
  citationScore: number;
  latencyScore: number;
  offlineScore: number;
  retrievalScore: number;
};
