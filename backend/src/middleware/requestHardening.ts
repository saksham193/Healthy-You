import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

const JSON_METHODS = new Set(["POST", "PUT", "PATCH"]);
const RAW_BODY_PREFIXES = [
  "/ai/nutrition/analyze-image",
  "/ai/attachments/analyze",
  "/ai/assistant/analyze-attachment",
];

const hasBody = (request: Request): boolean =>
  Boolean(request.headers["content-length"]) || Boolean(request.headers["transfer-encoding"]);

const isJsonContentType = (value?: string): boolean => {
  if (!value) return false;

  const contentType = value.split(";")[0]?.trim().toLowerCase();

  return contentType === "application/json" || Boolean(contentType?.endsWith("+json"));
};

export const isRawBodyRoute = (path: string): boolean =>
  RAW_BODY_PREFIXES.some((prefix) => path.startsWith(prefix));

export const requireJsonContentType = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  if (!JSON_METHODS.has(request.method)) {
    next();
    return;
  }

  if (isRawBodyRoute(request.path)) {
    next();
    return;
  }

  if (hasBody(request) && !isJsonContentType(request.header("content-type"))) {
    next(new HttpError(415, "unsupported_media_type", "Content-Type must be application/json."));
    return;
  }

  next();
};
