import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { household, mealSlot, member, memberMealSlot, shoppingTrip } from "@/db/schema";
import { createUser, validOnboarding } from "@/test/fixtures";
import { truncateAll } from "@/test/db";
import { AppError } from "@/lib/http/errors";
import { createHousehold } from "./household-service.ts";

async function countRows() {
  const db = getDb();
  return {
    households: (await db.select().from(household)).length,
    slots: (await db.select().from(mealSlot)).length,
    trips: (await db.select().from(shoppingTrip)).length,
    members: (await db.select().from(member)).length,
    links: (await db.select().from(memberMealSlot)).length,
  };
}

describe("createHousehold", () => {
  beforeEach(async () => {
    await truncateAll();
    await createUser("user-1");
  });

  it("creates the household, slots, trips, members and their slots", async () => {
    const overview = await createHousehold("user-1", validOnboarding());

    expect(overview.household).toMatchObject({ name: "Home", weekStartDay: 1 });
    expect(overview.mealSlots.map((slot) => [slot.name, slot.time])).toEqual([
      ["Breakfast", "08:00"],
      ["Dinner", "20:00"],
    ]);
    expect(overview.shoppingTrips).toMatchObject([{ dayOfWeek: 6, time: "10:00" }]);
    expect(overview.members).toHaveLength(2);

    const [breakfast, dinner] = overview.mealSlots;
    const asha = overview.members.find((item) => item.name === "Asha");
    const ravi = overview.members.find((item) => item.name === "Ravi");
    expect(asha).toMatchObject({ userId: "user-1", isAdmin: true, ageBand: null, dateOfBirth: "1988-04-23" });
    expect(asha?.slotIds.toSorted()).toEqual([breakfast.id, dinner.id].toSorted());
    expect(ravi).toMatchObject({ userId: null, isAdmin: false });
    expect(ravi?.slotIds).toEqual([dinner.id]);
    expect(await countRows()).toEqual({ households: 1, slots: 2, trips: 1, members: 2, links: 3 });
  });

  it("creates nothing when one member turns out to be invalid", async () => {
    const input = validOnboarding();
    // Skips the schema's check on purpose: the failure comes after the household rows are written.
    input.members.push({ name: "Bad", sex: "male", ageBand: "6-10", slotPositions: [5] });

    await expect(createHousehold("user-1", input)).rejects.toMatchObject({ status: 400 });
    expect(await countRows()).toEqual({ households: 0, slots: 0, trips: 0, members: 0, links: 0 });
  });

  it("answers 409 already_in_household the second time and creates nothing more", async () => {
    await createHousehold("user-1", validOnboarding());
    const error = await createHousehold("user-1", validOnboarding()).catch((caught) => caught);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 409, code: "already_in_household" });
    expect(await countRows()).toEqual({ households: 1, slots: 2, trips: 1, members: 2, links: 3 });
  });

  it("lets only one of two simultaneous onboardings win", async () => {
    const results = await Promise.allSettled([
      createHousehold("user-1", validOnboarding()),
      createHousehold("user-1", validOnboarding()),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((result) => result.status === "rejected");
    expect(failed).toMatchObject({ reason: { status: 409, code: "already_in_household" } });
    expect((await countRows()).households).toBe(1);
  });
});
