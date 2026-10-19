import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { joinAttempt } from "@/db/schema";
import { AppError } from "@/lib/http/errors";
import { createUser } from "@/test/fixtures";
import { truncateAll } from "@/test/db";
import { assertCanAttempt } from "./join-attempt-service.ts";

const minutesAgo = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60_000);

async function attemptsAt(times: Date[]) {
  await getDb().insert(joinAttempt).values(times.map((attemptedAt) => ({ userId: "user-1", attemptedAt })));
}

async function failure(now: Date): Promise<AppError | null> {
  try {
    await assertCanAttempt("user-1", now);
    return null;
  } catch (error) {
    return error as AppError;
  }
}

describe("assertCanAttempt", () => {
  const now = new Date("2026-03-10T12:00:00Z");

  beforeEach(async () => {
    await truncateAll();
    await createUser("user-1");
  });

  it("allows 9 wrong codes in the last hour", async () => {
    await attemptsAt(Array.from({ length: 9 }, (_, i) => minutesAgo(now, i + 1)));
    expect(await failure(now)).toBeNull();
  });

  it("refuses at 10 and counts the minutes until the oldest is an hour old", async () => {
    await attemptsAt([minutesAgo(now, 45), ...Array.from({ length: 9 }, (_, i) => minutesAgo(now, i + 1))]);
    const error = await failure(now);
    expect(error).toMatchObject({ status: 429, code: "too_many_attempts", message: "Too many attempts, try again in 15 minutes" });
  });

  it("rounds a part minute up and says 1 minute in the singular", async () => {
    await attemptsAt([new Date(now.getTime() - 59 * 60_000 - 30_000), ...Array.from({ length: 9 }, (_, i) => minutesAgo(now, i + 1))]);
    expect((await failure(now))?.message).toBe("Too many attempts, try again in 1 minute");
  });

  it("ignores attempts older than an hour", async () => {
    await attemptsAt([...Array.from({ length: 5 }, (_, i) => minutesAgo(now, 61 + i)), ...Array.from({ length: 5 }, (_, i) => minutesAgo(now, i + 1))]);
    expect(await failure(now)).toBeNull();
  });
});
