import type { MedicalKnowledgeCitation } from "../../../types";
import type {
  AgentConfidence,
  AgentRecommendation,
  AgentResult,
  CoordinationResult,
  HealthAgentId,
} from "../AgentTypes";
import { agentMemoryPolicy } from "../AgentMemoryPolicy";

const priorityRank: Record<AgentRecommendation["priority"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const confidenceRank: Record<AgentConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const confidenceFromRank = (rank: number): AgentConfidence => {
  if (rank >= 2.5) return "high";
  if (rank >= 1.7) return "medium";

  return "low";
};

const normalizeMessage = (message: string): string =>
  message.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const uniqueCitations = (citations: MedicalKnowledgeCitation[]): MedicalKnowledgeCitation[] => {
  const seen = new Set<string>();

  return citations.filter((citation) => {
    const key = `${citation.title}:${citation.sourceName}:${citation.category}`;
    if (seen.has(key)) return false;
    seen.add(key);

    return true;
  });
};

export class HealthCoordinator {
  coordinate(results: AgentResult[]): CoordinationResult {
    const sortedRecommendations = results
      .flatMap((result) => result.recommendations)
      .sort((left, right) => priorityRank[right.priority] - priorityRank[left.priority]);
    const seenMessages = new Set<string>();
    const topActions = sortedRecommendations.filter((recommendation) => {
      const key = normalizeMessage(recommendation.message);
      if (seenMessages.has(key)) return false;
      seenMessages.add(key);

      return true;
    }).slice(0, 5);
    const citations = uniqueCitations(results.flatMap((result) => result.citations));
    const confidence = confidenceFromRank(
      results.length
        ? results.reduce((sum, result) => sum + confidenceRank[result.confidence], 0) / results.length
        : 1,
    );
    const riskLevel = results.some((result) => result.riskLevel === "urgent")
      ? "urgent"
      : results.some((result) => result.riskLevel === "caution")
        ? "caution"
        : "routine";
    const safetyRecommendations = topActions.filter((item) => item.source === "safety").length;
    const conflictCount = safetyRecommendations > 0
      ? topActions.filter((item) => item.source !== "safety" && item.priority === "high").length
      : 0;
    const consensusPercent = results.length <= 1
      ? 100
      : Math.round((topActions.filter((item) => item.priority === "high" || item.priority === "critical").length / Math.max(topActions.length, 1)) * 100);
    const memoryPolicy = agentMemoryPolicy.evaluate(results);
    const agentsUsed = results.map((result) => result.agentId);
    const agentLatency = results.reduce<Record<HealthAgentId, number>>((latency, result) => {
      latency[result.agentId] = result.metadata.latencyMs;
      return latency;
    }, {} as Record<HealthAgentId, number>);

    return {
      finalSummary: [
        agentsUsed.length > 0 ? `Coordinated ${agentsUsed.join(", ")} specialist guidance.` : "No specialist guidance was required.",
        riskLevel === "caution" ? "Safety-sensitive guidance was prioritized." : "",
        memoryPolicy.coordinatorMayRecommendMemoryUpdate ? "A high-priority action may be useful for future personalization." : "",
      ].filter(Boolean).join(" "),
      topActions,
      citations,
      confidence,
      riskLevel,
      conflictCount,
      consensusPercent,
      agentsUsed,
      agentLatency,
    };
  }
}

export const healthCoordinator = new HealthCoordinator();
