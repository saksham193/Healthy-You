import type { AIInteractionMetric, OnlineOfflineStatus, PrivacyLevel, ProviderName } from "./TelemetryTypes";
import { evaluationStore, EvaluationStore } from "./EvaluationStore";
import { traceIdService } from "./TraceIdService";

type CollectInput = {
  traceId?: string;
  provider: ProviderName;
  onlineOffline?: OnlineOfflineStatus;
  intent: string;
  responseTimeMs: number;
  fallbackUsed?: boolean;
  cacheUsed?: boolean;
  ragUsed?: boolean;
  retrievalConfidence?: "low" | "medium" | "high";
  safetyLevel?: string;
  responseLength?: number;
  deviceContextUsed?: boolean;
  memoryUsed?: boolean;
  errorType?: string;
  success: boolean;
  agentsUsed?: string[];
  coordinationMode?: "single" | "parallel" | "sequential" | "consensus";
  agentLatencyMs?: number;
  agentConflictCount?: number;
  agentConsensusPercent?: number;
  predictionCount?: number;
  highRiskPredictionCount?: number;
  predictionCategories?: string[];
  averagePredictionConfidence?: number;
  dataQualityIssues?: number;
};

export class TelemetryCollector {
  constructor(
    private readonly store: EvaluationStore = evaluationStore,
    private readonly privacyLevel: PrivacyLevel = "minimal",
    private readonly sampleRate = 1,
  ) {}

  collect(input: CollectInput): AIInteractionMetric | null {
    if (Math.random() > this.sampleRate) return null;

    const metric: AIInteractionMetric = {
      id: traceIdService.createTraceId("metric"),
      traceId: input.traceId ?? traceIdService.createTraceId(),
      timestamp: new Date().toISOString(),
      provider: input.provider,
      onlineOffline: input.onlineOffline ?? "online",
      intent: input.intent,
      responseTimeMs: input.responseTimeMs,
      fallbackUsed: Boolean(input.fallbackUsed),
      cacheUsed: Boolean(input.cacheUsed),
      ragUsed: Boolean(input.ragUsed),
      retrievalConfidence: input.retrievalConfidence,
      safetyLevel: input.safetyLevel,
      responseLength: input.responseLength ?? 0,
      deviceContextUsed: Boolean(input.deviceContextUsed),
      memoryUsed: Boolean(input.memoryUsed),
      errorType: input.errorType,
      success: input.success,
      agentsUsed: input.agentsUsed ?? [],
      coordinationMode: input.coordinationMode,
      agentLatencyMs: input.agentLatencyMs ?? 0,
      agentConflictCount: input.agentConflictCount ?? 0,
      agentConsensusPercent: input.agentConsensusPercent ?? 0,
      predictionCount: input.predictionCount ?? 0,
      highRiskPredictionCount: input.highRiskPredictionCount ?? 0,
      predictionCategories: input.predictionCategories ?? [],
      averagePredictionConfidence: input.averagePredictionConfidence ?? 0,
      dataQualityIssues: input.dataQualityIssues ?? 0,
    };

    this.store.saveInteraction(metric);

    return metric;
  }

  getPrivacyLevel(): PrivacyLevel {
    return this.privacyLevel;
  }
}

export const telemetryCollector = new TelemetryCollector();
