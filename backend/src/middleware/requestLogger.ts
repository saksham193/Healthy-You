import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

export const requestLogger = (request: Request, response: Response, next: NextFunction): void => {
  const startedAt = Date.now();

  response.on("finish", () => {
    logger.info("request", {
      method: request.method,
      path: request.originalUrl.split("?")[0],
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
};
