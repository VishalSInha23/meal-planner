import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests read DATABASE_URL_TEST from .env locally; CI sets it in the environment.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    globalSetup: ["src/test/global-setup.ts"],
    // Test files share one db and truncate it between tests, so they run one after another.
    fileParallelism: false,
    // The app code under test always talks to the test db, never the dev db.
    // The auth values are placeholders: no test signs in with Google.
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? "",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0123",
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    },
  },
});
