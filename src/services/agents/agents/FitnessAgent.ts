import type { AIContext, AIIntent } from "../../../types";
import type {
  AgentContext,
  AgentRecommendation,
  AgentResult,
  HealthAgent,
} from "../AgentTypes";

const confidenceFromContext = (context: AIContext): AgentResult["confidence"] => {
  if (context.steps > 0 && context.weeklyActivityMinutes > 0 && context.deviceDataSource !== "unavailable") return "high";
  if (context.steps > 0 || context.fitnessScore > 0) return "medium";

  return "low";
};

export class FitnessAgent implements HealthAgent {
  readonly agentId = "fitness" as const;
  readonly agentName = "Fitness Agent";
  readonly supportedIntents: readonly AIIntent[] = ["fitness", "general"];

  canHandle(context: AgentContext): boolean {
    return this.supportedIntents.includes(context.intent) ||
      /\b(workout|exercise|steps|walk|training|activity|heart rate|recovery|readiness)\b/i.test(context.message);
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startedAt = Date.now();
    const recommendations: AgentRecommendation[] = [];
    const stepGap = context.context.stepGoal - context.context.steps;
    const highActivity = context.context.weeklyActivityMinutes >= 300;
    const lowReadiness = context.context.sleepScore > 0 && context.context.sleepScore < 65;
    const activityDrift = context.context.trendIntelligence?.habitDrifts.find((drift) =>
      drift.metric === "steps" || drift.metric === "activity_minutes",
    );

    if ((stepGap > 0 && context.context.stepGoal > 0) || activityDrift) {
      recommendations.push({
        id: "agent-fitness-step-gap",
        message: lowReadiness
          ? "Favor gentle movement today, such as an easy walk or mobility break."
          : "Add a short walk or movement break if you feel well.",
        priority: activityDrift || stepGap > context.context.stepGoal * 0.5 ? "high" : "medium",
        rationale: activityDrift?.reason ?? `Steps are ${context.context.steps}/${context.context.stepGoal}.`,
        source: "device",
      });
    }

    if (highActivity || lowReadiness) {
      recommendations.push({
        id: "agent-fitness-recovery",
        message: "Keep the next session recovery-focused and avoid pushing intensity if you feel unusually tired.",
        priority: lowReadiness ? "high" : "medium",
        rationale: highActivity
          ? `Weekly activity is ${context.context.weeklyActivityMinutes} minutes.`
          : `Sleep score is ${context.context.sleepScore}.`,
        source: "agent",
      });
    }

    const preference = context.context.memory.find((item) => item.category === "exercise_preference");
    if (preference) {
      recommendations.push({
        id: "agent-fitness-preference",
        message: "Choose an activity that matches your saved exercise preference.",
        priority: "low",
        rationale: `Remembered preference: ${preference.value}.`,
        source: "memory",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: "agent-fitness-maintain",
        message: "Maintain your current activity rhythm and include warm-up, cool-down, and recovery time.",
        priority: "low",
        rationale: `Fitness status is ${context.context.fitnessStatus}.`,
        source: "agent",
      });
    }

    return {
      agentId: this.agentId,
      agentName: this.agentName,
      confidence: confidenceFromContext(context.context),
      reasoningSummary: "Reviewed steps, activity minutes, sleep recovery context, device freshness, and exercise preferences.",
      recommendations: recommendations.slice(0, 4),
      riskLevel: lowReadiness ? "caution" : "routine",
      citations: context.retrieval?.citations ?? [],
      metadata: {
        latencyMs: Date.now() - startedAt,
        executionMode: context.executionMode,
        signals: [
          `steps:${context.context.steps}/${context.context.stepGoal}`,
          `weeklyActivityMinutes:${context.context.weeklyActivityMinutes}`,
          `deviceDataSource:${context.context.deviceDataSource}`,
          activityDrift ? `activityDrift:${activityDrift.confidence}` : "",
        ].filter(Boolean),
        offlineCapable: true,
      },
    };
  }
}

export const fitnessAgent = new FitnessAgent();
