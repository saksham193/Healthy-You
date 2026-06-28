import type {
  AIContext,
  AIIntent,
  AIResponse,
  MedicalKnowledgeCitation,
  PersonalizedRecommendation,
} from "../../types";

export type AgentPriority = "low" | "medium" | "high" | "critical";
export type AgentConfidence = "low" | "medium" | "high";
export type AgentExecutionMode = "single" | "parallel" | "sequential" | "consensus";
export type AgentRiskLevel = "routine" | "caution" | "urgent";
export type HealthAgentId = "nutrition" | "fitness" | "sleep" | "medication";

export type AgentRecommendation = {
  id: string;
  message: string;
  priority: AgentPriority;
  rationale: string;
  source: "agent" | "memory" | "device" | "rag" | "personalization" | "safety";
};

export type AgentDecision = {
  selectedAgents: HealthAgentId[];
  executionMode: AgentExecutionMode;
  primaryIntent: AIIntent;
  reason: string;
  riskLevel: AgentRiskLevel;
};

export type AgentContext = Readonly<{
  message: string;
  intent: AIIntent;
  context: Readonly<AIContext>;
  executionMode: AgentExecutionMode;
  isOffline: boolean;
  retrieval?: Readonly<{
    citations: MedicalKnowledgeCitation[];
    confidence?: AgentConfidence;
    categories?: string[];
  }>;
  safety?: Readonly<{
    riskLevel: AgentRiskLevel;
    overrideReason?: string;
  }>;
}>;

export type AgentResult = {
  agentId: HealthAgentId;
  agentName: string;
  confidence: AgentConfidence;
  reasoningSummary: string;
  recommendations: AgentRecommendation[];
  riskLevel: AgentRiskLevel;
  citations: MedicalKnowledgeCitation[];
  metadata: {
    latencyMs: number;
    executionMode: AgentExecutionMode;
    signals: string[];
    offlineCapable: boolean;
  };
};

export interface HealthAgent {
  readonly agentId: HealthAgentId;
  readonly agentName: string;
  readonly supportedIntents: readonly AIIntent[];
  canHandle(context: AgentContext): boolean;
  execute(context: AgentContext): Promise<AgentResult>;
}

export type CoordinationResult = {
  finalSummary: string;
  topActions: AgentRecommendation[];
  citations: MedicalKnowledgeCitation[];
  confidence: AgentConfidence;
  riskLevel: AgentRiskLevel;
  conflictCount: number;
  consensusPercent: number;
  agentsUsed: HealthAgentId[];
  agentLatency: Record<HealthAgentId, number>;
};

export type OrchestratedResponse = AIResponse & {
  metadata: NonNullable<AIResponse["metadata"]>;
};

export type AgentContextSnapshot = {
  profileCompleteness: number;
  memoryCount: number;
  trendCount: number;
  recommendationCount: number;
  predictionCount: number;
  deviceDataSource: AIContext["deviceDataSource"];
  lastDeviceSyncAt: string | null;
  currentHealthData: AIContext["currentHealthData"];
  personalizedRecommendations: PersonalizedRecommendation[];
};
