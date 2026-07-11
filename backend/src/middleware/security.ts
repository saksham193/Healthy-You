import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const safeRateLimitHandler = (group: string) =>
  (request: Request, response: Response): void => {
    logger.warn("rate_limited", {
      method: request.method,
      path: `${request.baseUrl}${request.path}`,
      limiterGroup: group,
      statusCode: 429,
    });

    response.status(429).json({
      error: "Too many requests. Please wait and try again.",
      code: "RATE_LIMITED",
    });
  };

const createRateLimit = (group: string, limit: number, windowMs = env.RATE_LIMIT_WINDOW_MS) =>
  rateLimit({
    windowMs,
    limit,
    skip: () => !env.RATE_LIMIT_ENABLED,
    standardHeaders: true,
    legacyHeaders: false,
    handler: safeRateLimitHandler(group),
  });

export const apiRateLimit = createRateLimit(
  "default_api",
  env.RATE_LIMIT_DEFAULT_MAX,
);

export const authRateLimit = createRateLimit(
  "auth_sensitive",
  env.RATE_LIMIT_AUTH_MAX,
  env.RATE_LIMIT_AUTH_WINDOW_MS,
);

export const aiRateLimit = createRateLimit(
  "ai_sensitive",
  env.RATE_LIMIT_AI_MAX,
);

export const syncRateLimit = createRateLimit(
  "sync",
  env.RATE_LIMIT_SYNC_MAX,
);

export const syncPrivacyRateLimit = createRateLimit(
  "sync_privacy_sensitive",
  env.RATE_LIMIT_EXPORT_DELETE_MAX,
);

export const healthRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: Math.max(env.RATE_LIMIT_DEFAULT_MAX * 5, 300),
  skip: () => !env.RATE_LIMIT_ENABLED,
  standardHeaders: true,
  legacyHeaders: false,
  handler: safeRateLimitHandler("public_health"),
});
