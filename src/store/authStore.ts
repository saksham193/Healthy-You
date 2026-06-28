import { create } from "zustand";
import type { User } from "../services/api/AuthApi";
import { login as loginRequest, logout as logoutRequest, register as registerRequest } from "../services/api/AuthApi";
import { getCurrentUser } from "../services/api/UserApi";
import { clearStoredTokens, getStoredTokens } from "../services/secure/TokenStorage";

type AuthStore = {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  hydrateSession: () => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  authenticated: false,
  loading: false,
  error: null,
  hydrateSession: async () => {
    set({ loading: true, error: null });
    const tokens = await getStoredTokens();

    if (!tokens) {
      set({ authenticated: false, loading: false, user: null });
      return;
    }

    try {
      const user = await getCurrentUser();

      set({ authenticated: true, error: null, loading: false, user });
    } catch (error) {
      await clearStoredTokens();
      set({
        authenticated: false,
        error: error instanceof Error ? error.message : "Session restore failed.",
        loading: false,
        user: null,
      });
    }
  },
  register: async (email, name, password) => {
    set({ loading: true, error: null });

    try {
      const response = await registerRequest(email, name, password);

      set({ user: response.user, authenticated: true, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Registration failed.", loading: false });
    }
  },
  login: async (email, password) => {
    set({ loading: true, error: null });

    try {
      const response = await loginRequest(email, password);

      set({ user: response.user, authenticated: true, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Login failed.", loading: false });
    }
  },
  logout: async () => {
    const tokens = await getStoredTokens();

    if (tokens) {
      await logoutRequest(tokens.refreshToken);
    }

    set({ user: null, authenticated: false, error: null });
  },
}));
