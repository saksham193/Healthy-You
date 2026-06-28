import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { HttpError } from "../utils/httpError";

export const validateBody = <T>(schema: ZodSchema<T>) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(request.body);

    if (!parsed.success) {
      next(new HttpError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid request body."));
      return;
    }

    request.body = parsed.data;
    next();
  };
