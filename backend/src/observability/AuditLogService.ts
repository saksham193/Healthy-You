import { evaluationStore, EvaluationStore } from "./EvaluationStore";
import { promptVersionRegistry } from "./PromptVersionRegistry";
import { traceIdService } from "./TraceIdService";
import type { AuditLogEntry, EvaluationMetric } from "./TelemetryTypes";

export class AuditLogService {
  constructor(private readonly store: EvaluationStore = evaluationStore) {}

  log(input: Omit<AuditLogEntry, "id" | "timestamp" | "versions"> & { evaluation?: EvaluationMetric }): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: traceIdService.createTraceId("audit"),
      timestamp: new Date().toISOString(),
      versions: promptVersionRegistry.getVersions(),
      ...input,
    };

    this.store.saveAuditLog(entry);

    return entry;
  }
}

export const auditLogService = new AuditLogService();
