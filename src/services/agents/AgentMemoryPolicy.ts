import type { AgentResult } from "./AgentTypes";

export type AgentMemoryPolicyResult = {
  canReadMemory: true;
  agentCanPersistMemory: false;
  coordinatorMayRecommendMemoryUpdate: boolean;
  reason: string;
};

export class AgentMemoryPolicy {
  evaluate(results: AgentResult[]): AgentMemoryPolicyResult {
    const hasImportantRecommendation = results.some((result) =>
      result.recommendations.some((recommendation) => recommendation.priority === "high" || recommendation.priority === "critical"),
    );

    return {
      canReadMemory: true,
      agentCanPersistMemory: false,
      coordinatorMayRecommendMemoryUpdate: hasImportantRecommendation,
      reason: hasImportantRecommendation
        ? "Agents may read shared memory; only the coordinator may recommend a future memory update."
        : "Agents may read shared memory but do not own or persist memory.",
    };
  }
}

export const agentMemoryPolicy = new AgentMemoryPolicy();
