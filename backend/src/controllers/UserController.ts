import type { Request, Response } from "express";
import { UserService } from "../services/UserService";
import type { UpdateUserBody } from "../types/contracts";
import { HttpError } from "../utils/httpError";

const getUserId = (request: Request): string => {
  if (!request.auth) throw new HttpError(401, "missing_auth_context", "Authentication context is missing.");

  return request.auth.userId;
};

export class UserController {
  constructor(private readonly users = new UserService()) {}

  me = (request: Request, response: Response): void => {
    response.json({ data: this.users.getProfile(getUserId(request)) });
  };

  update = (request: Request<Record<string, never>, unknown, UpdateUserBody>, response: Response): void => {
    response.json({ data: this.users.updateProfile(getUserId(request), request.body.name) });
  };
}
