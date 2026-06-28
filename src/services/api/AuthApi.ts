import { clearStoredTokens, saveStoredTokens } from "../secure/TokenStorage";
import { apiClient } from "./ApiClient";

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

export async function register(email: string, name: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/register", { email, name, password });

  await saveStoredTokens(response.tokens);
  return response;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/login", { email, password });

  await saveStoredTokens(response.tokens);
  return response;
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await apiClient.post<void>("/auth/logout", { refreshToken });
  } finally {
    await clearStoredTokens();
  }
}
