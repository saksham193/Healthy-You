const randomPart = (): string => Math.random().toString(36).slice(2, 10);

export class TraceIdService {
  createTraceId(prefix = "trace"): string {
    return `${prefix}-${Date.now()}-${randomPart()}`;
  }

  createProviderId(provider: string): string {
    return this.createTraceId(`provider-${provider}`);
  }

  createRetrievalId(): string {
    return this.createTraceId("retrieval");
  }

  createMemoryId(): string {
    return this.createTraceId("memory");
  }
}

export const traceIdService = new TraceIdService();
