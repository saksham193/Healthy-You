import type { Request, Response } from "express";
import { OpenAIProxyService } from "../services/OpenAIProxyService";
import type { BackendAIRequest } from "../types/contracts";

export class AIController {
  constructor(private readonly openAI = new OpenAIProxyService()) {}

  sendMessage = async (request: Request<unknown, unknown, BackendAIRequest>, response: Response): Promise<void> => {
    response.json({ data: await this.openAI.sendMessage(request.body) });
  };
}
