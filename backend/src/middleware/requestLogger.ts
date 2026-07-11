import type { NextFunction, Request, Response } from "express";
import { recordRequestMetric } from "../monitoring/metrics";
import { logger } from "../utils/logger";
import { getSafePath } from "../utils/safePath";

export const requestLogger = (request: Request, response: Response, next: NextFunction): void => {
  const startedAt = Date.now();

  response.on("finish", () => {
    const durationMs = Date.now() - startedAt;

    recordRequestMetric(response.statusCode, durationMs);
    logger.info("request", {
      requestId: request.requestId,
      method: request.method,
      path: getSafePath(request.originalUrl),
      statusCode: response.statusCode,
      durationMs,
    });
  });

  next();
};
