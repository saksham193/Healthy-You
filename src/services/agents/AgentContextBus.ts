import type { AIRequest } from "../../types";
import type { AgentContext, AgentContextSnapshot, AgentExecutionMode, AgentRiskLevel } from "./AgentTypes";

const cloneContextSnapshot = (request: AIRequest): AgentContextSnapshot => ({
  profileCompleteness: request.context.profile.profileCompletenessScore,
  memoryCount: request.context.memory.length,
  trendCount: request.context.trends.length,
  recommendationCount: request.context.personalizedRecommendations.length,
  predictionCount: request.context.predictions.topPredictions.length,
  deviceDataSource: request.context.deviceDataSource,
  lastDeviceSyncAt: request.context.lastDeviceSyncAt,
  currentHealthData: { ...request.context.currentHealthData },
  personalizedRecommendations: request.context.personalizedRecommendations.map((item) => ({ ...item })),
});

export class AgentContextBus {
  create(
    request: AIRequest,
    executionMode: AgentExecutionMode,
    input: {
      isOffline?: boolean;
      riskLevel?: AgentRiskLevel;
    } = {},
  ): AgentContext {
    const safety = input.riskLevel ? { riskLevel: input.riskLevel } : undefined;

    return Object.freeze({
      message: request.message,
      intent: request.intent,
      context: request.context,
      executionMode,
      isOffline: Boolean(input.isOffline),
      safety,
    });
  }

  snapshot(request: AIRequest): AgentContextSnapshot {
    return cloneContextSnapshot(request);
  }
}

export const agentContextBus = new AgentContextBus();
