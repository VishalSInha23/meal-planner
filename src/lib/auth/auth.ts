import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { getAppConfig } from "@/lib/config";
import { getEnv } from "@/lib/env";

function createAuth() {
  const env = getEnv();
  if (!env.BETTER_AUTH_SECRET || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }
  return betterAuth({
    baseURL: getAppConfig().baseUrl,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

// Created on first use, so a build does not need secrets.
export function getAuth() {
  return (auth ??= createAuth());
}
