import type { Request, Response } from "express";
import { env } from "../config/env";

export class StatusController {
  health = (_request: Request, response: Response): void => {
    response.json({ data: { status: "ok", timestamp: new Date().toISOString() } });
  };

  status = (_request: Request, response: Response): void => {
    response.json({
      data: {
        service: "healthy-you-backend",
        environment: env.ENVIRONMENT,
        openAIConfigured: Boolean(env.OPENAI_API_KEY),
      },
    });
  };
}
