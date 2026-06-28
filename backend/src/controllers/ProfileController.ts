import type { Request, Response } from "express";
import { ProfileSyncService } from "../services/ProfileSyncService";
import type { ProfileSyncBody } from "../types/contracts";
import { HttpError } from "../utils/httpError";

const getUserId = (request: Request): string => {
  if (!request.auth) throw new HttpError(401, "missing_auth_context", "Authentication context is missing.");

  return request.auth.userId;
};

export class ProfileController {
  constructor(private readonly profileSync = new ProfileSyncService()) {}

  get = (request: Request, response: Response): void => {
    response.json({ data: this.profileSync.get(getUserId(request)) });
  };

  sync = (request: Request<Record<string, never>, unknown, ProfileSyncBody>, response: Response): void => {
    response.json({ data: this.profileSync.sync(getUserId(request), request.body.profile, request.body.updatedAt) });
  };
}
