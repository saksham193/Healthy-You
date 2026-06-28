import type { AuthResponse, AuthTokens, User } from "../types/api";
import { randomUUID } from "node:crypto";
import { HttpError } from "../utils/httpError";
import { TokenRepository } from "../repositories/TokenRepository";
import { UserRepository } from "../repositories/UserRepository";
import { createAccessToken, createRefreshToken, verifyRefreshToken } from "./jwt";
import { UserService } from "../services/UserService";

const getRefreshExpiry = (): string => {
  const date = new Date();

  date.setDate(date.getDate() + 30);

  return date.toISOString();
};

export class AuthService {
  constructor(
    private readonly users = new UserService(),
    private readonly userRepository = new UserRepository(),
    private readonly tokens = new TokenRepository(),
  ) {}

  async register(email: string, name: string, password: string): Promise<AuthResponse> {
    const user = await this.users.register(email, name, password);

    return { user, tokens: this.issueTokens(user) };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.users.verifyCredentials(email, password);

    return { user, tokens: this.issueTokens(user) };
  }

  refresh(refreshToken: string): AuthTokens {
    const payload = verifyRefreshToken(refreshToken);
    const stored = this.tokens.findValid(refreshToken);
    const user = this.userRepository.findById(payload.sub);

    if (!stored || stored.userId !== payload.sub || !user) {
      throw new HttpError(401, "invalid_refresh_token", "Refresh token is invalid.");
    }

    this.tokens.revoke(refreshToken);

    return this.issueTokens(user);
  }

  logout(refreshToken: string): void {
    this.tokens.revoke(refreshToken);
  }

  private issueTokens(user: User): AuthTokens {
    const payload = { sub: user.id, email: user.email };
    const accessToken = createAccessToken({ ...payload, jti: randomUUID() });
    const refreshToken = createRefreshToken({ ...payload, jti: randomUUID() });

    this.tokens.save(refreshToken, user.id, getRefreshExpiry());

    return { accessToken, refreshToken };
  }
}
