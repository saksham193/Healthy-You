type LogLevel = "info" | "warn" | "error";

const write = (level: LogLevel, message: string, meta?: unknown): void => {
  const payload = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;

  console[level](`[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${payload}`);
};

export const logger = {
  info: (message: string, meta?: unknown): void => write("info", message, meta),
  warn: (message: string, meta?: unknown): void => write("warn", message, meta),
  error: (message: string, meta?: unknown): void => write("error", message, meta),
};
