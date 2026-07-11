import { env } from "../config/env";

type StatusCodeGroup = "2xx" | "3xx" | "4xx" | "5xx";

type RequestMetrics = {
  totalRequests: number;
  statusCodeGroups: Record<StatusCodeGroup, number>;
  rateLimitedRequests: number;
  malformedRequests: number;
  totalDurationMs: number;
};

const startedAt = Date.now();
const metrics: RequestMetrics = {
  totalRequests: 0,
  statusCodeGroups: {
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
  },
  rateLimitedRequests: 0,
  malformedRequests: 0,
  totalDurationMs: 0,
};

const getStatusCodeGroup = (statusCode: number): StatusCodeGroup | undefined => {
  if (statusCode >= 200 && statusCode < 300) return "2xx";
  if (statusCode >= 300 && statusCode < 400) return "3xx";
  if (statusCode >= 400 && statusCode < 500) return "4xx";
  if (statusCode >= 500 && statusCode < 600) return "5xx";

  return undefined;
};

export const recordRequestMetric = (statusCode: number, durationMs: number): void => {
  if (!env.MONITORING_ENABLED) return;

  const group = getStatusCodeGroup(statusCode);

  metrics.totalRequests += 1;
  metrics.totalDurationMs += Math.max(0, durationMs);

  if (group) {
    metrics.statusCodeGroups[group] += 1;
  }
};

export const recordRateLimitedRequest = (): void => {
  if (!env.MONITORING_ENABLED) return;

  metrics.rateLimitedRequests += 1;
};

export const recordMalformedRequest = (): void => {
  if (!env.MONITORING_ENABLED) return;

  metrics.malformedRequests += 1;
};

export const getMonitoringSnapshot = () => {
  const averageDurationMs = metrics.totalRequests === 0
    ? 0
    : Math.round(metrics.totalDurationMs / metrics.totalRequests);

  return {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    requests: {
      total: metrics.totalRequests,
      statusCodeGroups: { ...metrics.statusCodeGroups },
      averageDurationMs,
      rateLimited: metrics.rateLimitedRequests,
      malformed: metrics.malformedRequests,
    },
  };
};
