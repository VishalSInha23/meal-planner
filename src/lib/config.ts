import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { getLogger } from "./log/logger.ts";

// Relative imports with extensions: scripts/next.mjs loads this file with plain Node.

const appConfigSchema = z.object({
  port: z.number().int().min(1).max(65535),
  baseUrl: z
    .url({ protocol: /^https?$/ })
    .refine((value) => !value.endsWith("/"), "Must not end with a slash"),
  plannerRefreshSeconds: z.number().int().min(5).max(300),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export function readAppConfig(dir = join(process.cwd(), "config")): { config: AppConfig; file: string } {
  const real = join(dir, "app.json");
  const file = existsSync(real) ? real : join(dir, "app.example.json");
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  const result = appConfigSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid config ${file}:\n${z.prettifyError(result.error)}`);
  }
  return { config: result.data, file };
}

let cached: AppConfig | undefined;

export function getAppConfig(): AppConfig {
  if (!cached) {
    const { config, file } = readAppConfig();
    getLogger().info({ file }, "app config loaded");
    cached = config;
  }
  return cached;
}
