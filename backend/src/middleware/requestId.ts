import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";

const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;

const readIncomingRequestId = (request: Request): string | undefined => {
  const value = request.header(env.REQUEST_ID_HEADER);

  if (!value || !SAFE_REQUEST_ID_PATTERN.test(value)) {
    return undefined;
  }

  return value;
};

export const requestId = (request: Request, response: Response, next: NextFunction): void => {
  const id = readIncomingRequestId(request) ?? `req_${randomUUID()}`;

  request.requestId = id;
  response.setHeader(env.REQUEST_ID_HEADER, id);
  next();
};
