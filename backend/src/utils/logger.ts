import { env } from "../config/env";

type LogLevel = "debug" | "info" | "warn" | "error";
type SafeLogValue = string | number | boolean | null | undefined;
type SafeLogMeta = Record<string, SafeLogValue>;

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const allowedMetaKeys = new Set([
  "requestId",
  "method",
  "path",
  "statusCode",
  "durationMs",
  "limiterGroup",
  "environment",
  "serviceName",
  "errorCode",
  "migrationId",
  "migrationName",
  "migrationStatus",
  "smokeCheck",
  "port",
]);

const shouldWrite = (level: LogLevel): boolean =>
  levelPriority[level] >= levelPriority[env.LOG_LEVEL];

const sanitizeMeta = (meta?: SafeLogMeta): SafeLogMeta | undefined => {
  if (!meta) return undefined;

  return Object.fromEntries(
    Object.entries(meta).filter(([key, value]) =>
      allowedMetaKeys.has(key) &&
      (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null ||
        value === undefined)),
  );
};

const write = (level: LogLevel, event: string, meta?: SafeLogMeta): void => {
  if (!shouldWrite(level)) return;

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    serviceName: "healthy-you-backend",
    environment: env.ENVIRONMENT,
    ...sanitizeMeta(meta),
  };

  console[level === "debug" ? "log" : level](JSON.stringify(payload));
};

export const logger = {
  debug: (event: string, meta?: SafeLogMeta): void => write("debug", event, meta),
  info: (event: string, meta?: SafeLogMeta): void => write("info", event, meta),
  warn: (event: string, meta?: SafeLogMeta): void => write("warn", event, meta),
  error: (event: string, meta?: SafeLogMeta): void => write("error", event, meta),
};
