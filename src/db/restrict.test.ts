import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { ingredient, mealSlot } from "@/db/schema";
import { truncateAll } from "@/test/db";
import { createHouseholdFixture, fillHousehold } from "@/test/fixtures";

// Drizzle wraps the driver error, so the restrict violation code (23001) is looked up on the cause.
async function foreignKeyCode(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return (error as { cause?: { code?: unknown } }).cause?.code;
  }
  return null;
}

describe("restrict foreign keys", () => {
  beforeEach(truncateAll);

  it("refuses to delete a meal slot that meals use", async () => {
    const fixture = await createHouseholdFixture("a");
    await fillHousehold(fixture, [fixture.adminMemberId]);
    const code = await foreignKeyCode(() => getDb().delete(mealSlot).where(eq(mealSlot.id, fixture.slotIds[0])));
    expect(code).toBe("23001");
  });

  it("refuses to delete an ingredient that a dish uses", async () => {
    const fixture = await createHouseholdFixture("a");
    await fillHousehold(fixture, [fixture.adminMemberId]);
    const code = await foreignKeyCode(() => getDb().delete(ingredient).where(eq(ingredient.householdId, fixture.householdId)));
    expect(code).toBe("23001");
  });
});
