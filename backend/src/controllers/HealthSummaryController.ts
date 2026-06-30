import type { Request, Response } from "express";
import { HealthSummarySyncService } from "../services/HealthSummarySyncService";
import type { HealthSummaryBody } from "../types/contracts";
import { HttpError } from "../utils/httpError";

const getUserId = (request: Request): string => {
  if (!request.auth) throw new HttpError(401, "missing_auth_context", "Authentication context is missing.");

  return request.auth.userId;
};

export class HealthSummaryController {
  constructor(private readonly summarySync = new HealthSummarySyncService()) {}

  list = (request: Request, response: Response): void => {
    response.json({ data: this.summarySync.list(getUserId(request)) });
  };

  save = (request: Request<Record<string, never>, unknown, HealthSummaryBody>, response: Response): void => {
    response.status(201).json({ data: this.summarySync.save(getUserId(request), request.body) });
  };

  remove = (request: Request<{ id: string }>, response: Response): void => {
    this.summarySync.delete(getUserId(request), request.params.id);
    response.status(204).send();
  };
}
