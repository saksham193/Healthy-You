import dotenv from "dotenv";

export type BackendEnvironment = "development" | "staging" | "production" | "test";

const normalizeEnvironment = (value?: string): BackendEnvironment => {
  if (value === "staging" || value === "production" || value === "test") {
    return value;
  }

  return "development";
};

export const backendEnvironment = normalizeEnvironment(process.env.ENVIRONMENT ?? process.env.NODE_ENV);
export const backendEnvFile = process.env.HEALTHY_YOU_BACKEND_ENV ?? `backend/.env.${backendEnvironment}`;

dotenv.config({ path: backendEnvFile });

export const rawBackendEnv = process.env;
