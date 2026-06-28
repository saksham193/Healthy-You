import type { HealthTrend, HealthTrendPoint, TrendDirection, TrendMetric, TrendPeriod } from "../types";

const getAverage = (points: HealthTrendPoint[]): number => {
  if (points.length === 0) return 0;

  const total = points.reduce((sum, point) => sum + point.value, 0);

  return Math.round((total / points.length) * 10) / 10;
};

const getPercentageChange = (firstValue: number, latestValue: number): number => {
  if (firstValue === 0) return latestValue === 0 ? 0 : 100;

  return Math.round(((latestValue - firstValue) / firstValue) * 100);
};

const getDirection = (
  metric: TrendMetric,
  percentageChange: number,
): TrendDirection => {
  if (Math.abs(percentageChange) < 5) return "stable";

  const higherIsBetter = metric !== "weight";

  if (higherIsBetter) {
    return percentageChange > 0 ? "improving" : "declining";
  }

  return percentageChange > 0 ? "declining" : "improving";
};

const getRiskIndicators = (
  metric: TrendMetric,
  trendDirection: TrendDirection,
  latestValue: number,
): string[] => {
  const risks: string[] = [];

  if (trendDirection === "declining") {
    risks.push(`${metric} trend is moving away from target`);
  }

  if (metric === "sleep" && latestValue < 70) risks.push("sleep recovery is below target");
  if (metric === "water" && latestValue < 6) risks.push("hydration is below daily goal");
  if (metric === "steps" && latestValue < 7000) risks.push("activity is below baseline");
  if (metric === "medicationAdherence" && latestValue < 80) risks.push("medication adherence needs attention");

  return risks;
};

export function analyzeTrend(
  metric: TrendMetric,
  points: HealthTrendPoint[],
  period: TrendPeriod = "7d",
): HealthTrend {
  const sortedPoints = [...points].sort((left, right) => left.date.localeCompare(right.date));
  const firstValue = sortedPoints[0]?.value ?? 0;
  const latestValue = sortedPoints[sortedPoints.length - 1]?.value ?? 0;
  const percentageChange = getPercentageChange(firstValue, latestValue);
  const direction = getDirection(metric, percentageChange);

  return {
    metric,
    period,
    direction,
    percentageChange,
    averageValue: getAverage(sortedPoints),
    latestValue,
    riskIndicators: getRiskIndicators(metric, direction, latestValue),
    points: sortedPoints,
  };
}
