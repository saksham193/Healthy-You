import { create } from "zustand";
import type { User } from "../services/api/AuthApi";
import {
  login as loginRequest,
  logout as logoutRequest,
  refreshSession as refreshSessionRequest,
  register as registerRequest,
} from "../services/api/AuthApi";
import { setAuthFailureHandler } from "../services/api/ApiClient";
import { getCurrentUser } from "../services/api/UserApi";
import { clearStoredTokens, getStoredTokens } from "../services/secure/TokenStorage";
import { useHealthStore } from "./healthStore";

type AuthStore = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  authenticated: boolean;
  loading: boolean;
  hydrate: () => Promise<void>;
  hydrateSession: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  loadCurrentUser: () => Promise<User | null>;
  clearError: () => void;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const isNetworkUnavailable = (error: unknown): boolean => {
  const message = getErrorMessage(error, "").toLowerCase();

  return (
    message.includes("network request failed") ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch") ||
    message.includes("timed out") ||
    message.includes("networkerror") ||
    message.includes("could not connect") ||
    message.includes("unknownhostexception") ||
    message.includes("unable to resolve host")
  );
};

const getAuthErrorMessage = (error: unknown, fallback: string): string => {
  if (isNetworkUnavailable(error)) {
    return "Unable to reach Healthy You services. Check your connection and try again.";
  }

  return getErrorMessage(error, fallback);
};

const setLoggedOut = {
  user: null,
  isAuthenticated: false,
  authenticated: false,
};

const loadCloudMemoriesInBackground = (): void => {
  void import("../services/ai/memory/LongTermMemory")
    .then(({ longTermMemory }) => longTermMemory.loadMemoriesFromCloud())
    .catch(() => undefined);
};

const clearMemorySyncQueue = (): void => {
  void import("../services/local-ai/OfflineMemoryQueue")
    .then(({ offlineMemoryQueue }) => offlineMemoryQueue.clearQueue())
    .catch(() => undefined);
};

const loadCloudHealthSummariesInBackground = (): void => {
  void useHealthStore.getState().loadHealthSummariesFromCloud();
};

const clearHealthSummarySyncQueue = (): void => {
  void import("../services/health/HealthSummaryCloudSync")
    .then(({ clearHealthSummaryBackupQueue }) => clearHealthSummaryBackupQueue())
    .catch(() => undefined);
};

export const useAuthStore = create<AuthStore>((set, get) => {
  const hydrate = async (): Promise<void> => {
    set({ isLoading: true, loading: true, error: null });
    const tokens = await getStoredTokens();

    if (!tokens) {
      set({ ...setLoggedOut, isHydrated: true, isLoading: false, loading: false });
      return;
    }

    try {
      const user = await getCurrentUser();

      set({
        user,
        isAuthenticated: true,
        authenticated: true,
        isHydrated: true,
        isLoading: false,
        loading: false,
        error: null,
      });
      void useHealthStore.getState().loadProfileFromCloud();
      loadCloudMemoriesInBackground();
      loadCloudHealthSummariesInBackground();
    } catch (error) {
      if (isNetworkUnavailable(error)) {
        set({
          isAuthenticated: true,
          authenticated: true,
          isHydrated: true,
          isLoading: false,
          loading: false,
          error: "Backend is unavailable. Your saved session will be retried when connection returns.",
        });
        void useHealthStore.getState().loadProfileFromCloud();
        loadCloudMemoriesInBackground();
        loadCloudHealthSummariesInBackground();
        return;
      }

      await clearStoredTokens();
      set({
        ...setLoggedOut,
        isHydrated: true,
        isLoading: false,
        loading: false,
        error: getErrorMessage(error, "Session restore failed."),
      });
    }
  };

  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isHydrated: false,
    error: null,
    authenticated: false,
    loading: false,
    hydrate,
    hydrateSession: hydrate,
    register: async (name, email, password) => {
      set({ isLoading: true, loading: true, error: null });

      try {
        const response = await registerRequest(name, email, password);

        set({
          user: response.user,
          isAuthenticated: true,
          authenticated: true,
          isHydrated: true,
          isLoading: false,
          loading: false,
          error: null,
        });
        void useHealthStore.getState().loadProfileFromCloud();
        loadCloudMemoriesInBackground();
        loadCloudHealthSummariesInBackground();
      } catch (error) {
        set({
          error: getAuthErrorMessage(error, "Registration failed."),
          isHydrated: true,
          isLoading: false,
          loading: false,
        });
      }
    },
    login: async (email, password) => {
      set({ isLoading: true, loading: true, error: null });

      try {
        const response = await loginRequest(email, password);

        set({
          user: response.user,
          isAuthenticated: true,
          authenticated: true,
          isHydrated: true,
          isLoading: false,
          loading: false,
          error: null,
        });
        void useHealthStore.getState().loadProfileFromCloud();
        loadCloudMemoriesInBackground();
        loadCloudHealthSummariesInBackground();
      } catch (error) {
        set({
          error: getAuthErrorMessage(error, "Login failed."),
          isHydrated: true,
          isLoading: false,
          loading: false,
        });
      }
    },
    logout: async () => {
      set({ isLoading: true, loading: true, error: null });

      try {
        const tokens = await getStoredTokens();

        if (tokens) {
          await logoutRequest(tokens.refreshToken);
        } else {
          await clearStoredTokens();
        }
      } catch {
        await clearStoredTokens();
      } finally {
        clearMemorySyncQueue();
        clearHealthSummarySyncQueue();
        set({ ...setLoggedOut, isHydrated: true, isLoading: false, loading: false, error: null });
      }
    },
    refreshSession: async () => {
      const tokens = await getStoredTokens();

      if (!tokens) {
        set({ ...setLoggedOut, isHydrated: true });
        return false;
      }

      try {
        await refreshSessionRequest(tokens.refreshToken);
        return true;
      } catch (error) {
        await clearStoredTokens();
        set({
          ...setLoggedOut,
          isHydrated: true,
          isLoading: false,
          loading: false,
          error: getErrorMessage(error, "Session refresh failed."),
        });
        return false;
      }
    },
    loadCurrentUser: async () => {
      set({ isLoading: true, loading: true, error: null });

      try {
        const user = await getCurrentUser();

        set({
          user,
          isAuthenticated: true,
          authenticated: true,
          isHydrated: true,
          isLoading: false,
          loading: false,
          error: null,
        });
        void useHealthStore.getState().loadProfileFromCloud();
        loadCloudMemoriesInBackground();
        loadCloudHealthSummariesInBackground();
        return user;
      } catch (error) {
        if (isNetworkUnavailable(error) && get().isAuthenticated) {
          set({
            isLoading: false,
            loading: false,
            error: "Backend is unavailable. Your session is still saved locally.",
          });
          return get().user;
        }

        await clearStoredTokens();
        set({
          ...setLoggedOut,
          isHydrated: true,
          isLoading: false,
          loading: false,
          error: getErrorMessage(error, "Unable to load your account."),
        });
        return null;
      }
    },
    clearError: () => set({ error: null }),
  };
});

setAuthFailureHandler(() => {
  clearMemorySyncQueue();
  clearHealthSummarySyncQueue();
  useAuthStore.setState({
    ...setLoggedOut,
    isHydrated: true,
    isLoading: false,
    loading: false,
    error: "Your session expired. Please log in again.",
  });
});
