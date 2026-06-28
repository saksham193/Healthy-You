import type { AIIntent } from "../../types";
import { getIntentDomain } from "../ai/intentClassifier";
import type { AgentDecision, AgentExecutionMode, AgentRiskLevel, HealthAgentId } from "./AgentTypes";

const domainPatterns: Record<HealthAgentId, RegExp[]> = {
  nutrition: [/\b(food|meal|eat|diet|protein|calorie|snack|vegetable|macro|hydration|water|drink)\b/i],
  fitness: [/\b(workout|exercise|steps|walk|training|activity|heart rate|recovery|readiness)\b/i],
  sleep: [/\b(sleep|slept|bedtime|tired|fatigue|rest|insomnia|wake|recovery)\b/i],
  medication: [/\b(medicine|medication|pill|dose|dosage|reminder|missed|prescription)\b/i],
};

const intentAgentMap: Partial<Record<AIIntent, HealthAgentId>> = {
  nutrition: "nutrition",
  hydration: "nutrition",
  fitness: "fitness",
  sleep: "sleep",
  medication: "medication",
  steps_query: "fitness",
  heart_rate_query: "fitness",
  calories_query: "fitness",
  activity_query: "fitness",
  sleep_query: "sleep",
  hydration_query: "nutrition",
};

const unique = <T>(items: T[]): T[] => Array.from(new Set(items));

const isUrgent = (message: string): boolean =>
  /\b(chest pain|can't breathe|cannot breathe|severe bleeding|stroke|overdose|unconscious|emergency|suicide|self-harm)\b/i.test(message);

const selectExecutionMode = (agents: HealthAgentId[], riskLevel: AgentRiskLevel): AgentExecutionMode => {
  if (riskLevel === "urgent") return "sequential";
  if (agents.length <= 1) return "single";
  if (agents.length >= 3) return "consensus";

  return "parallel";
};

export class AgentSelectionEngine {
  select(message: string, intent: AIIntent): AgentDecision {
    const normalized = message.trim();
    const matchedAgents = Object.entries(domainPatterns)
      .filter(([, patterns]) => patterns.some((pattern) => pattern.test(normalized)))
      .map(([agentId]) => agentId as HealthAgentId);
    const domain = getIntentDomain(intent);
    const intentAgent = intentAgentMap[intent] ?? intentAgentMap[domain];
    const selectedAgents = unique([
      ...(intentAgent ? [intentAgent] : []),
      ...matchedAgents,
    ]);
    const finalAgents = selectedAgents.length > 0 ? selectedAgents : (["nutrition", "fitness", "sleep", "medication"] as HealthAgentId[]);
    const riskLevel: AgentRiskLevel = isUrgent(message) ? "urgent" : finalAgents.includes("medication") ? "caution" : "routine";
    const executionMode = selectExecutionMode(finalAgents, riskLevel);

    return {
      selectedAgents: riskLevel === "urgent" ? [] : finalAgents,
      executionMode: riskLevel === "urgent" ? "sequential" : executionMode,
      primaryIntent: intent,
      reason: riskLevel === "urgent"
        ? "Urgent language detected; specialist routing is bypassed for safety override."
        : finalAgents.length === 1
          ? `Single-domain ${finalAgents[0]} request.`
          : "Multi-domain request matched more than one specialist.",
      riskLevel,
    };
  }
}

export const agentSelectionEngine = new AgentSelectionEngine();
