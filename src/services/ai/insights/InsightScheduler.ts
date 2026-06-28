import type { DailyInsight } from "../types";

const lastInsightDates = new Map<string, string>();

const todayKey = (): string => new Date().toISOString().slice(0, 10);

export function shouldGenerateDailyInsights(userId = "local-user"): boolean {
  return lastInsightDates.get(userId) !== todayKey();
}

export function markDailyInsightsGenerated(userId = "local-user"): void {
  lastInsightDates.set(userId, todayKey());
}

export function filterTodaysInsights(insights: DailyInsight[]): DailyInsight[] {
  const today = todayKey();

  return insights.filter((insight) => insight.createdAt.startsWith(today));
}
