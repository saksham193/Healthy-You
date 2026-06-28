import type { AIContext, AIIntent } from "../../../types";
import type {
  AgentContext,
  AgentRecommendation,
  AgentResult,
  HealthAgent,
} from "../AgentTypes";

const confidenceFromContext = (context: AIContext): AgentResult["confidence"] => {
  if (context.adherenceScore > 0 && context.memory.some((item) => item.category === "medication_habit")) return "high";
  if (context.adherenceScore > 0) return "medium";

  return "low";
};

export class MedicationAgent implements HealthAgent {
  readonly agentId = "medication" as const;
  readonly agentName = "Medication Agent";
  readonly supportedIntents: readonly AIIntent[] = ["medication", "general"];

  canHandle(context: AgentContext): boolean {
    return this.supportedIntents.includes(context.intent) ||
      /\b(medicine|medication|pill|dose|dosage|reminder|missed|prescription)\b/i.test(context.message);
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startedAt = Date.now();
    const recommendations: AgentRecommendation[] = [];
    const adherenceLow = context.context.adherenceScore > 0 && context.context.adherenceScore < 85;
    const medicationMemory = context.context.memory.find((item) => item.category === "medication_habit");

    recommendations.push({
      id: "agent-medication-prescribed-schedule",
      message: "Use your prescribed schedule and label instructions, and ask a clinician or pharmacist about missed-dose guidance.",
      priority: adherenceLow ? "high" : "medium",
      rationale: `Medication adherence status is ${context.context.medicationAdherenceStatus}.`,
      source: "safety",
    });

    if (medicationMemory) {
      recommendations.push({
        id: "agent-medication-routine-memory",
        message: "Anchor medication reminders to the routine you have already saved.",
        priority: "medium",
        rationale: `Remembered medication habit: ${medicationMemory.value}.`,
        source: "memory",
      });
    }

    recommendations.push({
      id: "agent-medication-no-dose-changes",
      message: "Do not start, stop, or change medication doses based on app guidance.",
      priority: "high",
      rationale: "Medication changes require qualified clinical or pharmacy guidance.",
      source: "safety",
    });

    return {
      agentId: this.agentId,
      agentName: this.agentName,
      confidence: confidenceFromContext(context.context),
      reasoningSummary: "Reviewed adherence status, medication habit memory, reminder needs, and medication safety boundaries.",
      recommendations: recommendations.slice(0, 4),
      riskLevel: "caution",
      citations: context.retrieval?.citations ?? [],
      metadata: {
        latencyMs: Date.now() - startedAt,
        executionMode: context.executionMode,
        signals: [
          `adherenceScore:${context.context.adherenceScore}`,
          medicationMemory ? "medication_memory" : "",
        ].filter(Boolean),
        offlineCapable: true,
      },
    };
  }
}

export const medicationAgent = new MedicationAgent();
