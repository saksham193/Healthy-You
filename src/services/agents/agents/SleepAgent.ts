import type { AIContext, AIIntent } from "../../../types";
import type {
  AgentContext,
  AgentRecommendation,
  AgentResult,
  HealthAgent,
} from "../AgentTypes";

const confidenceFromContext = (context: AIContext): AgentResult["confidence"] => {
  if (context.sleepMinutes && context.sleepScore > 0) return "high";
  if (context.sleepScore > 0 || context.profile.averageSleepHours) return "medium";

  return "low";
};

export class SleepAgent implements HealthAgent {
  readonly agentId = "sleep" as const;
  readonly agentName = "Sleep Agent";
  readonly supportedIntents: readonly AIIntent[] = ["sleep", "general"];

  canHandle(context: AgentContext): boolean {
    return this.supportedIntents.includes(context.intent) ||
      /\b(sleep|slept|bedtime|tired|fatigue|rest|wake|recovery)\b/i.test(context.message);
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startedAt = Date.now();
    const recommendations: AgentRecommendation[] = [];
    const sleepHours = context.context.sleepMinutes ? Math.round((context.context.sleepMinutes / 60) * 10) / 10 : undefined;
    const sleepTrendRisk = context.context.trends.some((trend) => trend.metric === "sleep" && trend.riskIndicators.length > 0);
    const sleepDrift = context.context.trendIntelligence?.habitDrifts.find((drift) => drift.metric === "sleep_minutes");
    const lowSleep = context.context.sleepScore > 0 && context.context.sleepScore < 75;

    if (lowSleep || sleepTrendRisk || sleepDrift) {
      recommendations.push({
        id: "agent-sleep-routine",
        message: "Protect a consistent wind-down window tonight with dimmer screens and a steady bedtime.",
        priority: context.context.sleepScore < 60 ? "high" : "medium",
        rationale: sleepDrift?.reason ?? (sleepTrendRisk ? "Sleep trend has risk indicators." : `Sleep score is ${context.context.sleepScore}.`),
        source: sleepTrendRisk || sleepDrift ? "device" : "agent",
      });
    }

    if (sleepHours) {
      recommendations.push({
        id: "agent-sleep-schedule",
        message: "Keep wake time consistent and avoid overcorrecting with a very late sleep-in.",
        priority: "medium",
        rationale: `Planned sleep is about ${sleepHours} hours.`,
        source: "device",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: "agent-sleep-maintain",
        message: "Maintain the current sleep routine and keep the bedroom environment calm and consistent.",
        priority: "low",
        rationale: `Sleep status is ${context.context.sleepStatus}.`,
        source: "agent",
      });
    }

    return {
      agentId: this.agentId,
      agentName: this.agentName,
      confidence: confidenceFromContext(context.context),
      reasoningSummary: "Reviewed sleep score, planned sleep duration, sleep trend risks, and recovery context.",
      recommendations: recommendations.slice(0, 4),
      riskLevel: lowSleep || sleepTrendRisk ? "caution" : "routine",
      citations: context.retrieval?.citations ?? [],
      metadata: {
        latencyMs: Date.now() - startedAt,
        executionMode: context.executionMode,
        signals: [
          `sleepScore:${context.context.sleepScore}`,
          `sleepMinutes:${context.context.sleepMinutes ?? "unknown"}`,
          sleepTrendRisk ? "sleep_trend_risk" : "",
          sleepDrift ? `sleepDrift:${sleepDrift.confidence}` : "",
        ].filter(Boolean),
        offlineCapable: true,
      },
    };
  }
}

export const sleepAgent = new SleepAgent();
