import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../auth/jwt";
import { HttpError } from "../utils/httpError";

export const requireAuth = (request: Request, _response: Response, next: NextFunction): void => {
  const header = request.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    next(new HttpError(401, "missing_access_token", "A bearer access token is required."));
    return;
  }

  const payload = verifyAccessToken(token);
  request.auth = {
    userId: payload.sub,
    email: payload.email,
  };
  next();
};
