import { count } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { truncateAll } from "@/test/db";
import { getDb } from "./client.ts";
import { user } from "./schema/index.ts";
import { withTransaction } from "./transaction.ts";

const row = { id: "u1", name: "Test", email: "test@example.com" };

async function userCount(): Promise<number> {
  const [result] = await getDb().select({ value: count() }).from(user);
  return result.value;
}

describe("withTransaction", () => {
  beforeEach(truncateAll);

  it("commits when the function returns", async () => {
    const result = await withTransaction(async (tx) => {
      await tx.insert(user).values(row);
      return "done";
    });
    expect(result).toBe("done");
    expect(await userCount()).toBe(1);
  });

  it("rolls back when the function throws", async () => {
    await expect(
      withTransaction(async (tx) => {
        await tx.insert(user).values(row);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await userCount()).toBe(0);
  });
});
