import { Platform } from "react-native";
import { mobileEnvironment, rawMobileEnv } from "./Environment";
import { validateMobileEnv } from "./EnvValidator";

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const defaultDevelopmentApiUrl = (): string => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }

  return "http://localhost:4000";
};

export function resolveApiBaseUrl(): string {
  validateMobileEnv(rawMobileEnv);

  if (rawMobileEnv.apiBaseUrl && rawMobileEnv.apiBaseUrl !== "auto") {
    return trimTrailingSlash(rawMobileEnv.apiBaseUrl);
  }

  if (mobileEnvironment === "development") {
    return defaultDevelopmentApiUrl();
  }

  throw new Error(`${mobileEnvironment} builds require EXPO_PUBLIC_API_BASE_URL.`);
}

export const appConfig = {
  apiBaseUrl: resolveApiBaseUrl(),
  environment: mobileEnvironment,
};
