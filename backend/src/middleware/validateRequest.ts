import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { HttpError } from "../utils/httpError";

const getValidationMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues?: Array<{ message?: unknown }> }).issues;
    const message = Array.isArray(issues) ? issues[0]?.message : undefined;

    if (typeof message === "string" && message.length > 0) return message;
  }

  return "Invalid request body.";
};

export const validateBody = <T>(schema: ZodSchema<T>) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(request.body);

    if (!parsed.success) {
      next(new HttpError(400, "invalid_request", getValidationMessage(parsed.error)));
      return;
    }

    request.body = parsed.data;
    next();
  };
