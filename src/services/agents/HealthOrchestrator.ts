import type { AIRequest, AIResponse } from "../../types";
import { evaluateHealthSafety } from "../ai/safety/HealthSafetyGuard";
import { agentContextBus } from "./AgentContextBus";
import { agentSelectionEngine } from "./AgentSelectionEngine";
import type {
  AgentResult,
  HealthAgent,
  HealthAgentId,
  OrchestratedResponse,
} from "./AgentTypes";
import { fitnessAgent } from "./agents/FitnessAgent";
import { healthCoordinator } from "./agents/HealthCoordinator";
import { medicationAgent } from "./agents/MedicationAgent";
import { nutritionAgent } from "./agents/NutritionAgent";
import { sleepAgent } from "./agents/SleepAgent";

export const ORCHESTRATOR_VERSION = "health-orchestrator-v1";

const agents: Record<HealthAgentId, HealthAgent> = {
  nutrition: nutritionAgent,
  fitness: fitnessAgent,
  sleep: sleepAgent,
  medication: medicationAgent,
};

const uniqueSuggestions = (items: string[]): string[] =>
  Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, 5);

const inferOffline = (response?: AIResponse): boolean =>
  response?.provider === "offline" || Boolean(response?.metadata?.offline);

export class HealthOrchestrator {
  selectAgents(request: AIRequest) {
    return agentSelectionEngine.select(request.message, request.intent);
  }

  async runAgents(request: AIRequest, response?: AIResponse): Promise<{
    decision: ReturnType<typeof agentSelectionEngine.select>;
    results: AgentResult[];
  }> {
    const decision = this.selectAgents(request);
    if (decision.riskLevel === "urgent") {
      return { decision, results: [] };
    }

    const context = agentContextBus.create(request, decision.executionMode, {
      isOffline: inferOffline(response),
      riskLevel: decision.riskLevel,
    });
    const selectedAgents = decision.selectedAgents
      .map((agentId) => agents[agentId])
      .filter((agent) => agent.canHandle(context));
    const results = decision.executionMode === "sequential"
      ? await this.runSequential(selectedAgents, context)
      : await Promise.all(selectedAgents.map((agent) => agent.execute(context)));

    return { decision, results };
  }

  async composeResponse(request: AIRequest, response: AIResponse): Promise<OrchestratedResponse> {
    const safety = evaluateHealthSafety(request.message, request.intent);
    if (!safety.safe) {
      return {
        ...safety.response,
        metadata: {
          ...safety.response.metadata,
          orchestratorVersion: ORCHESTRATOR_VERSION,
          coordinationMode: "sequential",
          agentsUsed: [],
          agentConfidence: "high",
          agentLatency: {},
          agentRoutingReason: "Emergency or unsafe request; orchestrator safety override returned minimal safe response.",
        },
      };
    }

    const { decision, results } = await this.runAgents(request, response);
    const coordinated = healthCoordinator.coordinate(results);
    const agentSuggestions = coordinated.topActions.map((item) => item.message);
    const predictionSuggestions = request.context.predictions.topPredictions.flatMap((prediction) =>
      prediction.preventiveActions.slice(0, 1).map((action) => action.message),
    );

    return {
      ...response,
      suggestions: uniqueSuggestions([...predictionSuggestions, ...agentSuggestions, ...response.suggestions]),
      metadata: {
        ...response.metadata,
        citations: response.metadata?.citations ?? coordinated.citations,
        orchestratorVersion: ORCHESTRATOR_VERSION,
        coordinationMode: decision.executionMode,
        agentsUsed: coordinated.agentsUsed,
        agentConfidence: coordinated.confidence,
        agentLatency: coordinated.agentLatency,
        agentRoutingReason: decision.reason,
        agentRiskLevel: coordinated.riskLevel,
        agentConflictCount: coordinated.conflictCount,
        agentConsensusPercent: coordinated.consensusPercent,
        agentSummary: coordinated.finalSummary,
        agentRecommendations: coordinated.topActions.map((item) => ({
          id: item.id,
          message: item.message,
          priority: item.priority,
          source: item.source,
        })),
        predictionCount: request.context.predictions.metrics.predictionCount,
        highRiskPredictionCount: request.context.predictions.metrics.highRiskCount,
        predictionCategories: request.context.predictions.metrics.predictionCategories,
        averagePredictionConfidence: request.context.predictions.metrics.averageConfidence,
        dataQualityIssues: request.context.predictions.metrics.dataQualityIssues,
      },
    };
  }

  private async runSequential(agentsToRun: HealthAgent[], context: Parameters<HealthAgent["execute"]>[0]): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    for (const agent of agentsToRun) {
      results.push(await agent.execute(context));
    }

    return results;
  }
}

export const healthOrchestrator = new HealthOrchestrator();
