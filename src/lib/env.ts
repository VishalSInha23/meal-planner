import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  DATABASE_URL_TEST: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  LOG_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  REQUEST_ID_FORMAT: z.enum(["base36", "uuid"]).default("base36"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

// Validated on first use, so a build does not need runtime secrets.
export function getEnv(): Env {
  if (!cached) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
    }
    cached = result.data;
  }
  return cached;
}
