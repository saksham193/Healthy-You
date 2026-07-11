import type { AuthenticatedRequestContext } from "./api";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequestContext;
      requestId?: string;
    }
  }
}

export {};
