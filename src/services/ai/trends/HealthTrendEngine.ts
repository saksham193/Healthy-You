import { useHealthStore } from "../../../store/healthStore";
import type { HealthTrend, HealthTrendPoint, TrendMetric } from "../types";
import { analyzeTrend } from "./TrendAnalyzer";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getIsoDateForIndex = (index: number, total: number): string => {
  const date = new Date();

  date.setDate(date.getDate() - (total - index - 1));

  return date.toISOString().slice(0, 10);
};

const toPoints = (values: number[]): HealthTrendPoint[] =>
  values.map((value, index) => ({
    date: getIsoDateForIndex(index, values.length),
    value,
  }));

const parseNumber = (value: string | undefined): number | undefined => {
  if (!value) return undefined;

  const parsed = Number.parseFloat(value.replace(/,/g, ""));

  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildStableSeries = (current: number, offsets: number[]): number[] =>
  offsets.map((offset) => Math.max(0, Math.round((current + offset) * 10) / 10));

const getMedicationValues = (): number[] => {
  const schedule = useHealthStore.getState().schedule;

  if (schedule?.adherenceData.values.length) {
    return schedule.adherenceData.values;
  }

  const medications = schedule?.medications ?? [];
  const completed = medications.filter((medication) => medication.status === "completed").length;
  const adherence = medications.length === 0 ? 100 : Math.round((completed / medications.length) * 100);

  return buildStableSeries(adherence, [-4, 3, -2, 2, 0, -1, 0]);
};

const getMetricValues = (metric: TrendMetric): number[] => {
  const state = useHealthStore.getState();

  if (metric === "steps") {
    const activity = state.fitness?.weeklyActivity ?? [];
    const currentSteps = state.fitness?.summary.steps ?? 0;

    return activity.length === dayLabels.length
      ? activity.map((point) => Math.round(point.minutes * 120))
      : buildStableSeries(currentSteps, [-800, 400, -650, 900, -200, 300, 0]);
  }

  if (metric === "sleep") {
    const sleepScore = state.sleep?.schedule.progressPercent ?? 0;

    return buildStableSeries(sleepScore, [-6, 2, -4, 3, 1, -2, 0]);
  }

  if (metric === "calories") {
    const calories = state.nutrition?.summary.caloriesConsumed ?? 0;

    return buildStableSeries(calories, [-120, 90, -60, 40, 80, -30, 0]);
  }

  if (metric === "water") {
    const water = state.nutrition?.summary.waterGlasses ?? 0;

    return buildStableSeries(water, [-1, 0, -1, 1, 0, 0, 0]);
  }

  if (metric === "medicationAdherence") {
    return getMedicationValues();
  }

  const profileWeight = parseNumber(
    state.profile?.bodyMetrics.find((metricItem) => metricItem.id === "weight")?.value,
  );
  const currentWeight = profileWeight ?? parseNumber(state.fitness?.summary.weight) ?? 0;

  return buildStableSeries(currentWeight, [0.4, 0.2, 0.1, 0, -0.1, 0, 0]);
};

export function generateHealthTrends(): HealthTrend[] {
  const metrics: TrendMetric[] = ["weight", "sleep", "calories", "water", "steps", "medicationAdherence"];

  return metrics.map((metric) => analyzeTrend(metric, toPoints(getMetricValues(metric)), "7d"));
}
