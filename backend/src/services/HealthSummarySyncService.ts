import { HealthSummaryRepository } from "../repositories/HealthSummaryRepository";
import type { HealthSummaryRecord } from "../types/api";

export class HealthSummarySyncService {
  constructor(private readonly summaries = new HealthSummaryRepository()) {}

  list(userId: string): HealthSummaryRecord[] {
    return this.summaries.list(userId);
  }

  save(userId: string, summary: Omit<HealthSummaryRecord, "userId">): HealthSummaryRecord {
    return this.summaries.upsert(userId, summary);
  }

  delete(userId: string, id: string): void {
    this.summaries.delete(userId, id);
  }
}
