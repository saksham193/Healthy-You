import type { Request, Response } from "express";
import { AuthService } from "../auth/AuthService";
import type { LoginBody, RefreshTokenBody, RegisterBody } from "../types/contracts";

export class AuthController {
  constructor(private readonly auth = new AuthService()) {}

  register = async (request: Request<unknown, unknown, RegisterBody>, response: Response): Promise<void> => {
    response.status(201).json({ data: await this.auth.register(request.body.email, request.body.name, request.body.password) });
  };

  login = async (request: Request<unknown, unknown, LoginBody>, response: Response): Promise<void> => {
    response.json({ data: await this.auth.login(request.body.email, request.body.password) });
  };

  refresh = (request: Request<unknown, unknown, RefreshTokenBody>, response: Response): void => {
    response.json({ data: { tokens: this.auth.refresh(request.body.refreshToken) } });
  };

  logout = (request: Request<unknown, unknown, RefreshTokenBody>, response: Response): void => {
    this.auth.logout(request.body.refreshToken);
    response.status(204).send();
  };
}
