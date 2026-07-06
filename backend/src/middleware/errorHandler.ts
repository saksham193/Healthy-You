import type { NextFunction, Request, Response } from "express";
import { HttpError, isHttpError } from "../utils/httpError";
import { logger } from "../utils/logger";

export const notFoundHandler = (request: Request, _response: Response, next: NextFunction): void => {
  next(new HttpError(404, "route_not_found", `Route not found: ${request.method} ${request.path}`));
};

export const errorHandler = (error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
  if (isHttpError(error)) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  logger.error("unhandled_error", error instanceof Error ? { message: error.message, stack: error.stack } : error);
  response.status(500).json({
    error: {
      code: "internal_error",
      message: "An unexpected error occurred.",
    },
  });
};
