import { clearStoredTokens, saveStoredTokens } from "../secure/TokenStorage";
import { apiClient } from "./ApiClient";

const AUTH_REQUEST_TIMEOUT_MS = 12000;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: User;
  tokens: AuthTokens;
};

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    "/auth/register",
    { email, name, password },
    { timeoutMs: AUTH_REQUEST_TIMEOUT_MS },
  );

  await saveStoredTokens(response.tokens);
  return response;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    "/auth/login",
    { email, password },
    { timeoutMs: AUTH_REQUEST_TIMEOUT_MS },
  );

  await saveStoredTokens(response.tokens);
  return response;
}

export async function refreshSession(refreshToken: string): Promise<AuthTokens> {
  try {
    const response = await apiClient.post<{ tokens: AuthTokens }>(
      "/auth/refresh-token",
      { refreshToken },
      { timeoutMs: AUTH_REQUEST_TIMEOUT_MS },
    );

    await saveStoredTokens(response.tokens);
    return response.tokens;
  } catch (error) {
    await clearStoredTokens();
    throw error;
  }
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await apiClient.post<void>("/auth/logout", { refreshToken }, { timeoutMs: AUTH_REQUEST_TIMEOUT_MS });
  } finally {
    await clearStoredTokens();
  }
}
