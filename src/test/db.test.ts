import { describe, expect, it, vi } from "vitest";

const envOverride = vi.hoisted(() => ({ DATABASE_URL: undefined as string | undefined }));

vi.mock("@/lib/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/env")>();
  return { getEnv: () => ({ ...original.getEnv(), ...(envOverride.DATABASE_URL && { DATABASE_URL: envOverride.DATABASE_URL }) }) };
});

import { getDb } from "@/db/client";
import { user } from "@/db/schema";
import { truncateAll } from "./db.ts";

describe("truncateAll", () => {
  it("empties the tables", async () => {
    await getDb().insert(user).values({ id: "u1", name: "Test", email: "test@example.com" });
    await truncateAll();
    expect(await getDb().select().from(user)).toEqual([]);
  });

  it("refuses to run when the app db is not the test db", async () => {
    envOverride.DATABASE_URL = "postgres://someone@localhost/ceres";
    try {
      await expect(truncateAll()).rejects.toThrow("only runs against DATABASE_URL_TEST");
    } finally {
      envOverride.DATABASE_URL = undefined;
    }
  });
});
