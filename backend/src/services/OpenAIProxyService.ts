import OpenAI from "openai";
import { env } from "../config/env";
import { medicalKnowledgeRetriever } from "../knowledge/MedicalKnowledgeRetriever";
import { medicalGroundingGuard } from "../knowledge/MedicalGroundingGuard";
import { medicalResponseGovernance } from "../knowledge/MedicalResponseGovernance";
import { medicalResponseSafetyGuard } from "../knowledge/MedicalResponseSafetyGuard";
import { medicalSafetyClassifier } from "../knowledge/MedicalSafetyClassifier";
import { ragPromptBuilder } from "../knowledge/RAGPromptBuilder";
import { auditLogService } from "../observability/AuditLogService";
import { evaluationEngine } from "../observability/EvaluationEngine";
import { evaluationStore } from "../observability/EvaluationStore";
import { promptVersionRegistry } from "../observability/PromptVersionRegistry";
import { retrievalAnalytics } from "../observability/RetrievalAnalytics";
import { safetyMetrics } from "../observability/SafetyMetrics";
import { telemetryCollector } from "../observability/TelemetryCollector";
import { traceIdService } from "../observability/TraceIdService";
import type { BackendAIRequest, BackendAIResponse } from "../types/contracts";
import { HttpError } from "../utils/httpError";

type OpenAIJsonResponse = {
  response: string;
  suggestions: string[];
};

type RequestAgentMetadata = {
  agentsUsed: string[];
  coordinationMode?: "single" | "parallel" | "sequential" | "consensus";
  agentLatencyMs: number;
  agentConflictCount: number;
  agentConsensusPercent: number;
  agentConfidence?: "low" | "medium" | "high";
  predictionCount: number;
  highRiskPredictionCount: number;
  predictionCategories: string[];
  averagePredictionConfidence: number;
  dataQualityIssues: number;
};

const getRequestAgentMetadata = (context: BackendAIRequest["context"]): RequestAgentMetadata => {
  const metadata = context.agentMetadata;

  if (typeof metadata !== "object" || metadata === null) {
    return {
      agentsUsed: [],
      agentLatencyMs: 0,
      agentConflictCount: 0,
      agentConsensusPercent: 0,
      predictionCount: 0,
      highRiskPredictionCount: 0,
      predictionCategories: [],
      averagePredictionConfidence: 0,
      dataQualityIssues: 0,
    };
  }

  const record = metadata as Record<string, unknown>;
  const agentsUsed = Array.isArray(record.agentsUsed)
    ? record.agentsUsed.filter((item): item is string => typeof item === "string")
    : [];
  const coordinationMode = record.coordinationMode === "single" ||
    record.coordinationMode === "parallel" ||
    record.coordinationMode === "sequential" ||
    record.coordinationMode === "consensus"
      ? record.coordinationMode
      : undefined;
  const agentConfidence = record.agentConfidence === "low" ||
    record.agentConfidence === "medium" ||
    record.agentConfidence === "high"
      ? record.agentConfidence
      : undefined;

  return {
    agentsUsed,
    coordinationMode,
    agentLatencyMs: typeof record.agentLatencyMs === "number" ? record.agentLatencyMs : 0,
    agentConflictCount: typeof record.agentConflictCount === "number" ? record.agentConflictCount : 0,
    agentConsensusPercent: typeof record.agentConsensusPercent === "number" ? record.agentConsensusPercent : 0,
    agentConfidence,
    predictionCount: typeof record.predictionCount === "number" ? record.predictionCount : 0,
    highRiskPredictionCount: typeof record.highRiskPredictionCount === "number" ? record.highRiskPredictionCount : 0,
    predictionCategories: Array.isArray(record.predictionCategories)
      ? record.predictionCategories.filter((item): item is string => typeof item === "string")
      : [],
    averagePredictionConfidence: typeof record.averagePredictionConfidence === "number" ? record.averagePredictionConfidence : 0,
    dataQualityIssues: typeof record.dataQualityIssues === "number" ? record.dataQualityIssues : 0,
  };
};

const parseOpenAIResponse = (content: string): OpenAIJsonResponse => {
  try {
    const parsed: unknown = JSON.parse(content);

    if (typeof parsed === "object" && parsed !== null && "response" in parsed && "suggestions" in parsed) {
      const response = Reflect.get(parsed, "response");
      const suggestions = Reflect.get(parsed, "suggestions");

      if (typeof response === "string" && Array.isArray(suggestions) && suggestions.every((item) => typeof item === "string")) {
        return { response, suggestions };
      }
    }
  } catch {
    return { response: content, suggestions: [] };
  }

  return { response: content, suggestions: [] };
};

export class OpenAIProxyService {
  private readonly client: OpenAI | null;

  constructor() {
    this.client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
  }

  async sendMessage(request: BackendAIRequest): Promise<BackendAIResponse> {
    const startedAt = Date.now();
    const traceId = request.traceId ?? traceIdService.createTraceId();

    if (!this.client) {
      telemetryCollector.collect({
        traceId,
        provider: "openai",
        intent: request.intent,
        responseTimeMs: Date.now() - startedAt,
        errorType: "openai_not_configured",
        success: false,
      });
      auditLogService.log({
        traceId,
        eventType: "ai_error",
        providerStatus: "openai_not_configured",
      });
      throw new HttpError(503, "openai_not_configured", "Backend OpenAI key is not configured.");
    }

    const safety = medicalSafetyClassifier.classify(request);
    const agentMetadata = getRequestAgentMetadata(request.context);
    safetyMetrics.trackSafety(safety);
    const retrieval = medicalKnowledgeRetriever.retrieve(request, safety);
    retrievalAnalytics.track(retrieval);
    const ragPrompt = ragPromptBuilder.build(request, retrieval, safety);
    const providerRequestId = traceIdService.createProviderId("openai");
    const completion = await this.client.chat.completions.create({
        model: env.OPENAI_MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are Medibot. Return JSON with response and suggestions string array. Follow all safety and citation-grounding instructions in the user prompt.",
          },
          ...request.conversation.map((item) => ({
            role: item.role,
            content: item.message,
          })),
          {
            role: "user",
            content: ragPrompt,
          },
        ],
      });

    const content = completion.choices[0]?.message.content;

    if (!content) {
      throw new HttpError(502, "empty_openai_response", "OpenAI returned an empty response.");
    }

    const parsed = parseOpenAIResponse(content);

    const response: BackendAIResponse = {
      id: completion.id,
      intent: request.intent,
      response: parsed.response,
      suggestions: parsed.suggestions,
      provider: "openai" as const,
      metadata: {
        citations: retrieval.citations,
        safetyLevel: safety.safetyLevel,
        ragUsed: retrieval.chunks.length > 0,
        retrievalConfidence: retrieval.retrievalConfidence,
        knowledgeCategories: retrieval.appliedCategories,
        retrievalReason: retrieval.retrievalReason,
        topMatches: retrieval.topMatches,
        traceId,
        providerRequestId,
        agentsUsed: agentMetadata.agentsUsed,
        coordinationMode: agentMetadata.coordinationMode,
        agentConfidence: agentMetadata.agentConfidence,
        agentLatency: {},
        predictionCount: agentMetadata.predictionCount,
        highRiskPredictionCount: agentMetadata.highRiskPredictionCount,
        predictionCategories: agentMetadata.predictionCategories,
        averagePredictionConfidence: agentMetadata.averagePredictionConfidence,
        dataQualityIssues: agentMetadata.dataQualityIssues,
        versions: promptVersionRegistry.getVersions(),
      },
    };

    const safeResponse = medicalResponseSafetyGuard.guard(response, safety);
    const grounding = medicalGroundingGuard.assess(safeResponse.response, retrieval, safety);
    if (!grounding.grounded) {
      safetyMetrics.trackGroundingDowngrade();
    }
    if (safeResponse.response !== response.response) {
      safetyMetrics.trackResponseOverride();
    }

    const governedResponse = medicalResponseGovernance.govern(safeResponse, retrieval, safety, grounding);
    const metric = telemetryCollector.collect({
      traceId,
      provider: "openai",
      onlineOffline: "online",
      intent: request.intent,
      responseTimeMs: Date.now() - startedAt,
      ragUsed: Boolean(governedResponse.metadata?.ragUsed),
      retrievalConfidence: governedResponse.metadata?.retrievalConfidence,
      safetyLevel: governedResponse.metadata?.safetyLevel,
      responseLength: governedResponse.response.length,
      deviceContextUsed: Boolean(request.context.deviceDataSource),
      memoryUsed: Array.isArray(request.context.memory) && request.context.memory.length > 0,
      agentsUsed: agentMetadata.agentsUsed,
      coordinationMode: agentMetadata.coordinationMode,
      agentLatencyMs: agentMetadata.agentLatencyMs,
      agentConflictCount: agentMetadata.agentConflictCount,
      agentConsensusPercent: agentMetadata.agentConsensusPercent,
      predictionCount: agentMetadata.predictionCount,
      highRiskPredictionCount: agentMetadata.highRiskPredictionCount,
      predictionCategories: agentMetadata.predictionCategories,
      averagePredictionConfidence: agentMetadata.averagePredictionConfidence,
      dataQualityIssues: agentMetadata.dataQualityIssues,
      success: true,
    });
    const evaluation = metric
      ? evaluationEngine.evaluate(governedResponse, metric)
      : undefined;

    if (evaluation) {
      evaluationStore.saveEvaluation(traceId, evaluation);
    }

    const finalResponse: BackendAIResponse = {
      ...governedResponse,
      metadata: {
        ...governedResponse.metadata,
        evaluation,
      },
    };

    auditLogService.log({
      traceId,
      eventType: "ai_response",
      providerStatus: "success",
      evaluation,
    });

    return finalResponse;
  }
}
