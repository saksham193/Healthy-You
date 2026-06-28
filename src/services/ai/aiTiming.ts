type GlobalWithProcess = typeof globalThis & {
  process?: {
    env?: {
      NODE_ENV?: string;
    };
  };
};

export type AITimingTrace = {
  id: string;
  label: string;
  startedAt: number;
  lastAt: number;
};

const isProduction = (): boolean =>
  (globalThis as GlobalWithProcess).process?.env?.NODE_ENV === "production";

export const createAITimingTrace = (label: string): AITimingTrace => {
  const now = Date.now();

  return {
    id: `${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${now}`,
    label,
    startedAt: now,
    lastAt: now,
  };
};

export const markAITiming = (
  trace: AITimingTrace,
  phase: string,
  details: Record<string, unknown> = {},
): void => {
  if (isProduction()) return;

  const now = Date.now();
  const deltaMs = now - trace.lastAt;
  const totalMs = now - trace.startedAt;
  trace.lastAt = now;

  console.log(`[AI_LATENCY] ${trace.id} ${phase}`, {
    deltaMs,
    totalMs,
    ...details,
  });
};
