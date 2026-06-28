import type { AIInteractionMetric, AuditLogEntry, EvaluationMetric } from "./TelemetryTypes";

const MAX_METRICS = 1000;
const MAX_AUDIT_LOGS = 1000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const withinRetention = (timestamp: string): boolean => {
  const time = new Date(timestamp).getTime();

  return Number.isFinite(time) && Date.now() - time <= RETENTION_MS;
};

export class EvaluationStore {
  private metrics: AIInteractionMetric[] = [];
  private evaluations: Array<{ traceId: string; timestamp: string; evaluation: EvaluationMetric }> = [];
  private auditLogs: AuditLogEntry[] = [];

  saveInteraction(metric: AIInteractionMetric): void {
    this.metrics = [metric, ...this.metrics.filter(withMetricRetention)].slice(0, MAX_METRICS);
  }

  saveEvaluation(traceId: string, evaluation: EvaluationMetric): void {
    const record = { traceId, evaluation, timestamp: new Date().toISOString() };

    this.evaluations = [record, ...this.evaluations.filter((item) => withinRetention(item.timestamp))].slice(0, MAX_METRICS);
  }

  saveAuditLog(entry: AuditLogEntry): void {
    this.auditLogs = [entry, ...this.auditLogs.filter((item) => withinRetention(item.timestamp))].slice(0, MAX_AUDIT_LOGS);
  }

  getInteractions(): AIInteractionMetric[] {
    return [...this.metrics.filter(withMetricRetention)];
  }

  getEvaluations(): Array<{ traceId: string; timestamp: string; evaluation: EvaluationMetric }> {
    return [...this.evaluations.filter((item) => withinRetention(item.timestamp))];
  }

  getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs.filter((item) => withinRetention(item.timestamp))];
  }

  clear(): void {
    this.metrics = [];
    this.evaluations = [];
    this.auditLogs = [];
  }
}

const withMetricRetention = (metric: AIInteractionMetric): boolean => withinRetention(metric.timestamp);

export const evaluationStore = new EvaluationStore();
