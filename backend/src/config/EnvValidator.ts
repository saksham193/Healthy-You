import { z } from "zod";
import { backendEnvironment } from "./Environment";

const placeholderValues = new Set([
  "",
  "replace_me",
  "replace-with-secure-secret-min-32-chars",
  "replace-with-openai-key-in-deployment-secret-store",
]);

const isPlaceholder = (value?: string): boolean => !value || placeholderValues.has(value);

export const backendEnvSchema = z
  .object({
    ENVIRONMENT: z.enum(["development", "staging", "production", "test"]).default(backendEnvironment),
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    PORT: z.coerce.number().int().positive().default(4000),
    JWT_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).optional()),
    JWT_ACCESS_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).optional()),
    JWT_REFRESH_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).optional()),
    ACCESS_TOKEN_TTL: z.string().default("15m"),
    REFRESH_TOKEN_TTL: z.string().default("30d"),
    OPENAI_API_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
    DATABASE_URL: z.string().min(1).default("file:backend/data/healthy-you.sqlite"),
    DATABASE_PATH: z.string().min(1).optional(),
    CORS_ORIGIN: z.string().default("*"),
    OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  })
  .superRefine((env, context) => {
    if (env.ENVIRONMENT === "production") {
      if (isPlaceholder(env.JWT_SECRET) && (!env.JWT_ACCESS_SECRET || !env.JWT_REFRESH_SECRET)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production requires JWT_SECRET or both JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.",
          path: ["JWT_SECRET"],
        });
      }

      if (isPlaceholder(env.OPENAI_API_KEY)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production requires OPENAI_API_KEY to be supplied by the deployment secret store.",
          path: ["OPENAI_API_KEY"],
        });
      }

      if (env.CORS_ORIGIN === "*") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production requires a restricted CORS_ORIGIN.",
          path: ["CORS_ORIGIN"],
        });
      }
    }
  });

export type BackendEnv = z.infer<typeof backendEnvSchema>;
