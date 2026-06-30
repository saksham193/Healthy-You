import type { User } from "./AuthApi";
import { apiClient } from "./ApiClient";

const USER_REQUEST_TIMEOUT_MS = 12000;

export async function getCurrentUser(): Promise<User> {
  return apiClient.get<User>("/users/me", { authenticated: true, timeoutMs: USER_REQUEST_TIMEOUT_MS });
}

export async function updateCurrentUser(name: string): Promise<User> {
  return apiClient.patch<User>("/users/me", { name }, { authenticated: true, timeoutMs: USER_REQUEST_TIMEOUT_MS });
}
