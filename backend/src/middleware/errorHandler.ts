import type { NextFunction, Request, Response } from "express";
import { recordMalformedRequest } from "../monitoring/metrics";
import { HttpError, isHttpError } from "../utils/httpError";
import { logger } from "../utils/logger";

export const notFoundHandler = (request: Request, _response: Response, next: NextFunction): void => {
  next(new HttpError(404, "route_not_found", "Route not found."));
};

export const errorHandler = (error: unknown, request: Request, response: Response, _next: NextFunction): void => {
  if (isHttpError(error)) {
    if (error.statusCode === 415) {
      recordMalformedRequest();
    }

    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
      requestId: request.requestId,
    });
    return;
  }

  if (
    error &&
    typeof error === "object" &&
    ((error as { type?: unknown }).type === "entity.too.large" || (error as { status?: unknown }).status === 413)
  ) {
    response.status(413).json({
      error: {
        code: "payload_too_large",
        message: "Request payload is too large.",
      },
      requestId: request.requestId,
    });
    return;
  }

  if (
    error &&
    typeof error === "object" &&
    ((error as { type?: unknown }).type === "entity.parse.failed" || error instanceof SyntaxError)
  ) {
    recordMalformedRequest();
    response.status(400).json({
      error: {
        code: "malformed_json",
        message: "Request body must be valid JSON.",
      },
      requestId: request.requestId,
    });
    return;
  }

  logger.error("unhandled_error", {
    requestId: request.requestId,
    errorCode: "internal_error",
  });
  response.status(500).json({
    error: {
      code: "internal_error",
      message: "An unexpected error occurred.",
    },
    requestId: request.requestId,
  });
};
