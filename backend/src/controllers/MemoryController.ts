import type { Request, Response } from "express";
import { MemorySyncService } from "../services/MemorySyncService";
import type { MemoryRecord } from "../types/api";
import { memorySchema } from "../types/contracts";
import { HttpError } from "../utils/httpError";

const getUserId = (request: Request): string => {
  if (!request.auth) throw new HttpError(401, "missing_auth_context", "Authentication context is missing.");

  return request.auth.userId;
};

export class MemoryController {
  constructor(private readonly memorySync = new MemorySyncService()) {}

  list = (request: Request, response: Response): void => {
    response.json({ data: this.memorySync.list(getUserId(request)) });
  };

  save = (request: Request<Record<string, never>, unknown, MemoryRecord>, response: Response): void => {
    const memory = memorySchema.parse(request.body);

    response.status(201).json({ data: this.memorySync.save(getUserId(request), memory) });
  };

  remove = (request: Request<{ id: string }>, response: Response): void => {
    this.memorySync.delete(getUserId(request), request.params.id);
    response.status(204).send();
  };
}
