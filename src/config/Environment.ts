export type MobileEnvironment = "development" | "staging" | "production";

declare const process: {
  env?: {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_ENVIRONMENT?: string;
  };
};

const normalizeEnvironment = (value?: string): MobileEnvironment => {
  if (value === "staging" || value === "production") {
    return value;
  }

  return "development";
};

export const mobileEnvironment = normalizeEnvironment(process.env?.EXPO_PUBLIC_ENVIRONMENT);

export const rawMobileEnv = {
  apiBaseUrl: process.env?.EXPO_PUBLIC_API_BASE_URL,
  environment: mobileEnvironment,
};
