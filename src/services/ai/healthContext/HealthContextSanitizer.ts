import type { HealthAIContext } from "./HealthContextTypes";

export const HEALTH_CONTEXT_SUMMARY_MAX_CHARS = 1200;
export const HEALTH_CONTEXT_FIELD_MAX_CHARS = 180;
export const HEALTH_CONTEXT_BACKEND_MAX_CHARS = 4500;

const SECRET_PATTERNS = [
  /authorization/gi,
  /bearer\s+[a-z0-9._-]+/gi,
  /api[_-]?key/gi,
  /secret/gi,
  /token/gi,
  /sk-[a-z0-9_-]+/gi,
  /[a-z]:\\[^\s]+/gi,
  /\/(?:users|home)\/[^\s]+/gi,
];

export const sanitizeHealthContextText = (value: unknown, maxChars = HEALTH_CONTEXT_FIELD_MAX_CHARS): string | undefined => {
  if (typeof value !== "string") return undefined;

  let sanitized = value.replace(/\s+/g, " ").trim();
  SECRET_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[redacted]");
  });

  if (!sanitized) return undefined;

  return sanitized.length > maxChars ? `${sanitized.slice(0, maxChars - 3).trim()}...` : sanitized;
};

export const sanitizeHealthContextNumber = (value: unknown, max = 500000): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;

  return Math.min(Math.round(value), max);
};

export const capHealthContextList = (items: unknown[], maxItems = 4): string[] =>
  items
    .map((item) => sanitizeHealthContextText(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);

export const enforceHealthContextSize = (context: HealthAIContext): HealthAIContext => {
  const serialized = JSON.stringify(context);
  if (serialized.length <= HEALTH_CONTEXT_BACKEND_MAX_CHARS) return context;

  return {
    generatedAt: context.generatedAt,
    scope: context.scope,
    summary: sanitizeHealthContextText(context.summary, HEALTH_CONTEXT_SUMMARY_MAX_CHARS) ??
      "A minimized Healthy You app context summary is available, but details were trimmed for privacy and size limits.",
    today: context.today,
    safety: context.safety,
  };
};
