import type { Request, Response } from "express";
import { SyncService } from "../services/SyncService";
import type { SyncPushRequest } from "../types/contracts";
import { HttpError } from "../utils/httpError";

const getUserId = (request: Request): string => {
  if (!request.auth) throw new HttpError(401, "missing_auth_context", "Authentication context is missing.");

  return request.auth.userId;
};

export class SyncController {
  constructor(private readonly sync = new SyncService()) {}

  push = (request: Request<Record<string, never>, unknown, SyncPushRequest>, response: Response): void => {
    response.json({ data: this.sync.push(getUserId(request), request.body) });
  };

  pull = (request: Request, response: Response): void => {
    const updatedAfter = typeof request.query.updatedAfter === "string" ? request.query.updatedAfter : undefined;

    if (updatedAfter && Number.isNaN(Date.parse(updatedAfter))) {
      throw new HttpError(400, "invalid_sync_cursor", "updatedAfter must be a valid ISO date string.");
    }

    response.json({ data: this.sync.pull(getUserId(request), updatedAfter) });
  };
}
