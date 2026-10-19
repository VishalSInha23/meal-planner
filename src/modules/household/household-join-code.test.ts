import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { household } from "@/db/schema";
import { createHouseholdFixture, createUser, validOnboarding } from "@/test/fixtures";
import { truncateAll } from "@/test/db";
import { createHousehold, regenerateJoinCode } from "./household-service.ts";

vi.mock("./join-code.ts", async (importOriginal) => {
  const original = await importOriginal<typeof import("./join-code.ts")>();
  return { ...original, newJoinCode: vi.fn(original.newJoinCode) };
});

import { newJoinCode } from "./join-code.ts";

const stubbed = vi.mocked(newJoinCode);

describe("join codes of new households", () => {
  beforeEach(async () => {
    await truncateAll();
    stubbed.mockReset();
    await createUser("user-1");
  });

  it("gives a new household a code of 8 uppercase letters and digits", async () => {
    const { household: created } = await createHousehold("user-1", validOnboarding());
    const [row] = await getDb().select().from(household).where(eq(household.id, created.id));
    expect(row.joinCode).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("tries again with a new code when the code is taken", async () => {
    const taken = (await createHouseholdFixture("taken")).joinCode;
    stubbed.mockClear();
    stubbed.mockReturnValueOnce(taken).mockReturnValueOnce(taken).mockReturnValueOnce(taken).mockReturnValue("FRESH123");

    const { household: created } = await createHousehold("user-1", validOnboarding());

    expect(stubbed).toHaveBeenCalledTimes(4);
    const [row] = await getDb().select().from(household).where(eq(household.id, created.id));
    expect(row.joinCode).toBe("FRESH123");
  });

  it("gives up after 5 clashes and creates nothing", async () => {
    const taken = (await createHouseholdFixture("taken")).joinCode;
    stubbed.mockClear();
    stubbed.mockReturnValue(taken);

    await expect(createHousehold("user-1", validOnboarding())).rejects.toThrow();

    expect(stubbed).toHaveBeenCalledTimes(5);
    expect(await getDb().select().from(household)).toHaveLength(1);
  });

  it("tries again when a regenerated code is taken", async () => {
    const mine = await createHouseholdFixture("mine");
    const taken = (await createHouseholdFixture("taken")).joinCode;
    stubbed.mockClear();
    stubbed.mockReturnValueOnce(taken).mockReturnValue("FRESH456");

    expect(await regenerateJoinCode(mine.householdId)).toBe("FRESH456");
    expect(stubbed).toHaveBeenCalledTimes(2);
  });
});
