import type { MobileEnvironment } from "./Environment";

type MobileEnvInput = {
  apiBaseUrl?: string;
  environment: MobileEnvironment;
};

const isLocalUrl = (value: string): boolean =>
  value.includes("localhost") || value.includes("127.0.0.1") || value.includes("10.0.2.2");

export function validateMobileEnv(env: MobileEnvInput): void {
  if (env.apiBaseUrl === "auto" && env.environment === "development") {
    return;
  }

  if (env.apiBaseUrl && !/^https?:\/\//.test(env.apiBaseUrl)) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must start with http:// or https://.");
  }

  if (env.environment === "production" && (!env.apiBaseUrl || isLocalUrl(env.apiBaseUrl))) {
    throw new Error("Production mobile builds require a non-local EXPO_PUBLIC_API_BASE_URL.");
  }
}
