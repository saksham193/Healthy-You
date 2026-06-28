export type PrivacyLevel = "anonymous" | "minimal" | "debug";
export type ProviderName = "openai" | "mock" | "offline" | "unknown";
export type OnlineOfflineStatus = "online" | "offline" | "unknown";

export type AIInteractionMetric = {
  id: string;
  traceId: string;
  timestamp: string;
  provider: ProviderName;
  onlineOffline: OnlineOfflineStatus;
  intent: string;
  responseTimeMs: number;
  fallbackUsed: boolean;
  cacheUsed: boolean;
  ragUsed: boolean;
  retrievalConfidence?: "low" | "medium" | "high";
  safetyLevel?: string;
  responseLength: number;
  deviceContextUsed: boolean;
  memoryUsed: boolean;
  errorType?: string;
  success: boolean;
  agentsUsed: string[];
  coordinationMode?: "single" | "parallel" | "sequential" | "consensus";
  agentLatencyMs: number;
  agentConflictCount: number;
  agentConsensusPercent: number;
  predictionCount: number;
  highRiskPredictionCount: number;
  predictionCategories: string[];
  averagePredictionConfidence: number;
  dataQualityIssues: number;
};

export type EvaluationMetric = {
  qualityScore: number;
  groundingScore: number;
  citationScore: number;
  safetyScore: number;
  latencyScore: number;
  confidenceScore: number;
  overallScore: number;
};

export type AuditLogEntry = {
  id: string;
  traceId: string;
  timestamp: string;
  eventType: "ai_request" | "ai_response" | "ai_error" | "retrieval" | "offline" | "safety";
  versions: VersionMetadata;
  providerStatus: string;
  evaluation?: EvaluationMetric;
};

export type VersionMetadata = {
  promptVersion: string;
  ragVersion: string;
  knowledgeVersion: string;
  providerVersion: string;
  responseVersion: string;
  orchestratorVersion?: string;
};

export type ObservabilityReport = {
  generatedAt: string;
  requestCount: number;
  providerSplit: Record<string, number>;
  offlinePercent: number;
  ragPercent: number;
  avgLatencyMs: number;
  avgQuality: number;
  avgGrounding: number;
  citationPercent: number;
  cachePercent: number;
  fallbackPercent: number;
  safetyPercent: number;
  agentRequestPercent: number;
  avgAgentLatencyMs: number;
  agentConflictRate: number;
  agentConsensusPercent: number;
  agentSelectionFrequency: Record<string, number>;
  predictionCount: number;
  highRiskPredictionCount: number;
  predictionCategories: Record<string, number>;
  averagePredictionConfidence: number;
  dataQualityIssues: number;
};
