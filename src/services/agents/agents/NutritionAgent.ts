import type { AIContext, AIIntent } from "../../../types";
import type {
  AgentContext,
  AgentRecommendation,
  AgentResult,
  HealthAgent,
} from "../AgentTypes";

const confidenceFromContext = (context: AIContext): AgentResult["confidence"] => {
  if (context.nutritionScore > 0 && context.profile.profileCompletenessScore >= 70) return "high";
  if (context.nutritionScore > 0 || context.memory.length > 0) return "medium";

  return "low";
};

const priorityForNutrition = (context: AIContext): AgentRecommendation["priority"] =>
  context.hydrationGoal > 0 && context.hydrationGlasses < context.hydrationGoal * 0.6 ? "high" : "medium";

export class NutritionAgent implements HealthAgent {
  readonly agentId = "nutrition" as const;
  readonly agentName = "Nutrition Agent";
  readonly supportedIntents: readonly AIIntent[] = ["nutrition", "hydration", "general"];

  canHandle(context: AgentContext): boolean {
    return this.supportedIntents.includes(context.intent) ||
      /\b(food|meal|diet|protein|calorie|hydration|water|drink)\b/i.test(context.message);
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startedAt = Date.now();
    const recommendations: AgentRecommendation[] = [];
    const vegetarian = context.context.profile.dietaryPreferences.some((item) => /vegetarian|vegan/i.test(item)) ||
      context.context.memory.some((item) => item.category === "dietary_preference" && /vegetarian|vegan/i.test(item.value));
    const hydrationGap = context.context.hydrationGoal - context.context.hydrationGlasses;
    const hydrationDrift = context.context.trendIntelligence?.habitDrifts.find((drift) => drift.metric === "hydration_ml");

    if (hydrationGap > 0 || hydrationDrift) {
      recommendations.push({
        id: "agent-nutrition-hydration",
        message: "Close the hydration gap gradually with normal water intake if you are not on a fluid restriction.",
        priority: hydrationDrift ? "high" : priorityForNutrition(context.context),
        rationale: hydrationDrift?.reason ?? `Hydration is ${context.context.hydrationGlasses}/${context.context.hydrationGoal || "unknown"} glasses.`,
        source: "device",
      });
    }

    recommendations.push({
      id: "agent-nutrition-balanced-meal",
      message: vegetarian
        ? "Build the next meal around a vegetarian protein, colorful plants, and a steady carbohydrate source."
        : "Build the next meal around protein, fiber-rich plants, and a steady carbohydrate source.",
      priority: context.context.nutritionScore < 70 ? "high" : "medium",
      rationale: `Nutrition status is ${context.context.nutritionStatus}.`,
      source: vegetarian ? "memory" : "agent",
    });

    if (context.context.profile.allergies.length > 0) {
      recommendations.push({
        id: "agent-nutrition-allergy-check",
        message: "Check labels against saved allergies before trying new foods.",
        priority: "high",
        rationale: `Saved allergies: ${context.context.profile.allergies.join(", ")}.`,
        source: "personalization",
      });
    }

    const signals = [
      `nutritionScore:${context.context.nutritionScore}`,
      `hydration:${context.context.hydrationGlasses}/${context.context.hydrationGoal}`,
      hydrationDrift ? `hydrationDrift:${hydrationDrift.confidence}` : "",
      vegetarian ? "vegetarian_preference" : "",
    ].filter(Boolean);

    return {
      agentId: this.agentId,
      agentName: this.agentName,
      confidence: confidenceFromContext(context.context),
      reasoningSummary: "Reviewed nutrition score, hydration status, dietary preferences, allergies, and remembered food preferences.",
      recommendations: recommendations.slice(0, 4),
      riskLevel: context.context.profile.allergies.length > 0 ? "caution" : "routine",
      citations: context.retrieval?.citations ?? [],
      metadata: {
        latencyMs: Date.now() - startedAt,
        executionMode: context.executionMode,
        signals,
        offlineCapable: true,
      },
    };
  }
}

export const nutritionAgent = new NutritionAgent();
