import type { AIContext, HealthInsight } from "../../types";

export function generateHealthInsights(context: AIContext): HealthInsight[] {
  const insights: HealthInsight[] = [];

  const hydrationBelowTarget = context.hydrationGlasses < context.hydrationGoal;

  insights.push({
    id: hydrationBelowTarget ? "hydration-below-target" : "hydration-on-track",
    category: "hydration",
    severity: hydrationBelowTarget ? "attention" : "positive",
    message: hydrationBelowTarget
      ? "Hydration is below target today."
      : "Hydration is on track today.",
  });

  if (context.nutritionScore < 70) {
    insights.push({
      id: "nutrition-needs-attention",
      category: "nutrition",
      severity: "attention",
      message: "Nutrition quality needs attention today.",
    });
  } else {
    insights.push({
      id: "nutrition-stable",
      category: "nutrition",
      severity: "positive",
      message: "Your nutrition score is supporting your overall health.",
    });
  }

  const stepProgress = context.stepGoal === 0 ? 100 : Math.round((context.steps / context.stepGoal) * 100);
  const activityDropped = stepProgress < 70 || context.fitnessScore < 70;

  insights.push({
    id: activityDropped ? "activity-dropped" : "activity-on-track",
    category: "fitness",
    severity: activityDropped ? "attention" : "positive",
    message: activityDropped
      ? "Physical activity is below your usual target."
      : "Your activity trend is on track.",
  });

  insights.push({
    id: context.sleepScore < 70 ? "sleep-consistency-low" : "sleep-consistency-stable",
    category: "sleep",
    severity: context.sleepScore < 70 ? "attention" : "positive",
    message:
      context.sleepScore < 70
        ? "Sleep consistency appears lower than your health baseline."
        : "Sleep consistency is supporting recovery.",
  });

  if (context.sleepMinutes && context.sleepMinutes < 420) {
    insights.push({
      id: "device-sleep-low",
      category: "sleep",
      severity: "attention",
      message: "Connected device sleep data is below the 7 hour recovery target.",
    });
  }

  if (context.heartRateBpm && context.heartRateBpm >= 95) {
    insights.push({
      id: "device-heart-rate-elevated",
      category: "recovery",
      severity: "attention",
      message: "Connected device heart rate is higher than your usual wellness range, so keep activity gentle and monitor how you feel.",
    });
  }

  insights.push({
    id: context.adherenceScore < 80 ? "medication-adherence-low" : "medication-adherence-strong",
    category: "medication",
    severity: context.adherenceScore < 80 ? "attention" : "positive",
    message:
      context.adherenceScore < 80
        ? "Medication adherence needs attention today."
        : "Medication adherence is excellent.",
  });

  insights.push({
    id: "overall-health-score",
    category: "general",
    severity: context.healthScore >= 70 ? "positive" : "attention",
    message: `Your overall health score is ${context.healthScore}.`,
  });

  return insights;
}
