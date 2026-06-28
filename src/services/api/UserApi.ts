import type { User } from "./AuthApi";
import { apiClient } from "./ApiClient";

export async function getCurrentUser(): Promise<User> {
  return apiClient.get<User>("/users/me", { authenticated: true });
}

export async function updateCurrentUser(name: string): Promise<User> {
  return apiClient.patch<User>("/users/me", { name }, { authenticated: true });
}
