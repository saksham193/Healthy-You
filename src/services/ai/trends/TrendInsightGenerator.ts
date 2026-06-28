import type { HealthTrend, TrendInsight } from "../types";

const metricLabels: Record<HealthTrend["metric"], string> = {
  weight: "Weight",
  sleep: "Sleep",
  calories: "Calories",
  water: "Hydration",
  steps: "Steps",
  medicationAdherence: "Medication adherence",
};

export function generateTrendInsights(trends: HealthTrend[]): TrendInsight[] {
  return trends.map((trend) => {
    const label = metricLabels[trend.metric];
    const severity = trend.riskIndicators.length > 0
      ? "attention"
      : trend.direction === "improving"
        ? "positive"
        : "neutral";
    const directionText = trend.direction === "stable"
      ? "is stable"
      : `is ${trend.direction} by ${Math.abs(trend.percentageChange)}%`;

    return {
      id: `trend-${trend.metric}-${trend.period}`,
      metric: trend.metric,
      period: trend.period,
      severity,
      message: `${label} ${directionText}; latest value is ${trend.latestValue}.`,
    };
  });
}
