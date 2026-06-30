import type { HealthSummaryBackup } from "../../types";
import { apiClient } from "./ApiClient";

export async function fetchHealthSummaries(): Promise<HealthSummaryBackup[]> {
  return apiClient.get<HealthSummaryBackup[]>("/sync/health-summary", { authenticated: true });
}

export async function saveHealthSummary(summary: HealthSummaryBackup): Promise<HealthSummaryBackup> {
  return apiClient.post<HealthSummaryBackup>("/sync/health-summary", summary, { authenticated: true });
}

export async function deleteHealthSummary(id: string): Promise<void> {
  await apiClient.delete(`/sync/health-summary/${encodeURIComponent(id)}`, { authenticated: true });
}
