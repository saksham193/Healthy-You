const randomPart = (): string => Math.random().toString(36).slice(2, 10);

export class TraceIdService {
  createTraceId(prefix = "mobile-trace"): string {
    return `${prefix}-${Date.now()}-${randomPart()}`;
  }
}

export const traceIdService = new TraceIdService();
