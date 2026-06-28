import { backendEnvSchema } from "./EnvValidator";
import { rawBackendEnv } from "./Environment";

const trimSqlitePrefix = (value: string): string => {
  if (value.startsWith("file:")) {
    return value.slice("file:".length);
  }

  if (value.startsWith("sqlite:")) {
    return value.slice("sqlite:".length);
  }

  return value;
};

const parsed = backendEnvSchema.parse(rawBackendEnv);
const baseJwtSecret =
  parsed.JWT_SECRET ?? "development-jwt-secret-change-before-production";

export const backendConfig = {
  ...parsed,
  NODE_ENV: parsed.NODE_ENV ?? (parsed.ENVIRONMENT === "test" ? "test" : parsed.ENVIRONMENT === "production" ? "production" : "development"),
  JWT_ACCESS_SECRET: parsed.JWT_ACCESS_SECRET ?? `${baseJwtSecret}-access-token`,
  JWT_REFRESH_SECRET: parsed.JWT_REFRESH_SECRET ?? `${baseJwtSecret}-refresh-token`,
  DATABASE_PATH: parsed.DATABASE_PATH ?? trimSqlitePrefix(parsed.DATABASE_URL),
};
