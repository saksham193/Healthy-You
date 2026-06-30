import { clearStoredTokens, getStoredTokens, saveStoredTokens } from "../secure/TokenStorage";
import { resolveApiBaseUrl } from "../../config/Config";

type ApiEnvelope<T> = {
  data: T;
};

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
};

type RequestOptions = {
  authenticated?: boolean;
  retryOnUnauthorized?: boolean;
  timeoutMs?: number;
};

const API_BASE_URL = resolveApiBaseUrl();
let authFailureHandler: (() => void) | null = null;

export function setAuthFailureHandler(handler: (() => void) | null): void {
  authFailureHandler = handler;
}

async function clearSessionAfterAuthFailure(): Promise<void> {
  await clearStoredTokens();
  authFailureHandler?.();
}

const isApiErrorEnvelope = (value: unknown): value is ApiErrorEnvelope =>
  typeof value === "object" && value !== null && "error" in value;

export class ApiClient {
  constructor(private readonly baseUrl = API_BASE_URL) {}

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { method: "GET" }, options);
  }

  async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }, options);
  }

  async put<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }, options);
  }

  async patch<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }, options);
  }

  async delete(path: string, options: RequestOptions = {}): Promise<void> {
    await this.request<void>(path, { method: "DELETE" }, options);
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    options: RequestOptions,
  ): Promise<T> {
    const tokens = await getStoredTokens();
    const headers = new Headers(init.headers);

    headers.set("Content-Type", "application/json");

    if (options.authenticated && tokens?.accessToken) {
      headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    }

    const controller = typeof AbortController !== "undefined" && options.timeoutMs ? new AbortController() : undefined;
    const timeoutId = controller && options.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller?.signal,
      });
    } catch (error) {
      if (controller?.signal.aborted) {
        throw new Error(`API request timed out after ${options.timeoutMs}ms.`);
      }

      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (response.status === 401 && options.authenticated && options.retryOnUnauthorized !== false && tokens?.refreshToken) {
      const refreshed = await this.refreshToken(tokens.refreshToken);

      if (refreshed) {
        return this.request<T>(path, init, { ...options, retryOnUnauthorized: false });
      }
    }

    if (!response.ok) {
      const errorBody: unknown = await response.json().catch(() => ({}));
      const message = isApiErrorEnvelope(errorBody)
        ? errorBody.error?.message ?? "API request failed."
        : "API request failed.";

      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = await response.json() as ApiEnvelope<T>;

    return payload.data;
  }

  private async refreshToken(refreshToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await clearSessionAfterAuthFailure();
        return false;
      }

      const payload = await response.json() as ApiEnvelope<{ tokens: { accessToken: string; refreshToken: string } }>;

      await saveStoredTokens(payload.data.tokens);
      return true;
    } catch {
      await clearSessionAfterAuthFailure();
      return false;
    }
  }
}

export const apiClient = new ApiClient();
