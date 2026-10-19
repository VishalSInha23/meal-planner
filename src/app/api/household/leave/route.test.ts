import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { household, joinRequest, member, mealDishMember } from "@/db/schema";
import { truncateAll } from "@/test/db";
import { addAccountMember, createHouseholdFixture, createUser, fillHousehold, jsonRequest, paramsOf, survivingTables } from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const signInAs = (id: string) => getSession.mockResolvedValue({ user: { id, name: id, email: `${id}@example.com` } });

import { POST } from "./route.ts";

const leave = (body?: unknown) => POST(jsonRequest("POST", "/api/household/leave", body), paramsOf());
const errorOf = async (response: Response) => (await response.json()).error;

describe("POST /api/household/leave", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("answers 401 when signed out and 403 no_household without a household", async () => {
    expect((await leave()).status).toBe(401);
    await createUser("new-user");
    signInAs("new-user");
    const response = await leave();
    expect(response.status).toBe(403);
    expect((await errorOf(response)).code).toBe("no_household");
  });

  it("answers 409 last_admin to the only admin while other accounts remain, even with the confirmation", async () => {
    const fixture = await createHouseholdFixture("a");
    await addAccountMember(fixture.householdId, fixture.slotIds);
    signInAs(fixture.adminUserId);
    for (const body of [undefined, { confirmDeleteHousehold: true }]) {
      const response = await leave(body);
      expect(response.status).toBe(409);
      expect(await errorOf(response)).toMatchObject({ code: "last_admin", message: "Make someone else an admin first" });
    }
    expect(await getDb().select().from(member).where(eq(member.householdId, fixture.householdId))).toHaveLength(2);
  });

  it("removes a normal member and their meal ticks, and the household stays", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    const filled = await fillHousehold(fixture, [fixture.adminMemberId, plain.memberId]);
    signInAs(plain.userId);
    const response = await leave();
    expect(response.status).toBe(204);
    expect(await getDb().select().from(member).where(eq(member.id, plain.memberId))).toHaveLength(0);
    expect(await getDb().select().from(mealDishMember).where(eq(mealDishMember.memberId, plain.memberId))).toHaveLength(0);
    expect(await getDb().select().from(mealDishMember).where(eq(mealDishMember.memberId, fixture.adminMemberId))).toHaveLength(1);
    const left = await survivingTables(filled);
    expect(left).toEqual(expect.arrayContaining(["household", "member", "meal", "dish", "meal_dish"]));
    // Signed in again, the account has no household.
    expect((await leave()).status).toBe(403);
  });

  it("lets an admin leave when another admin remains", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    await getDb().update(member).set({ isAdmin: true }).where(eq(member.id, plain.memberId));
    signInAs(fixture.adminUserId);
    expect((await leave()).status).toBe(204);
    expect(await getDb().select().from(member).where(eq(member.householdId, fixture.householdId))).toHaveLength(1);
  });

  it("answers 409 would_delete_household naming the household to the last account without the confirmation", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    for (const body of [undefined, {}, { confirmDeleteHousehold: false }]) {
      const response = await leave(body);
      expect(response.status).toBe(409);
      const error = await errorOf(response);
      expect(error.code).toBe("would_delete_household");
      expect(error.message).toContain("House a");
    }
    expect(await getDb().select().from(household)).toHaveLength(1);
  });

  it("deletes the household and everything in it with the confirmation", async () => {
    const fixture = await createHouseholdFixture("a");
    const kid = (
      await getDb()
        .insert(member)
        .values({ householdId: fixture.householdId, name: "Kid", sex: "male", ageBand: "6-10" })
        .returning({ id: member.id })
    )[0];
    const filled = await fillHousehold(fixture, [fixture.adminMemberId, kid.id]);
    await createUser("asker");
    await getDb()
      .insert(joinRequest)
      .values({ householdId: fixture.householdId, userId: "asker", name: "Nia", sex: "female", dateOfBirth: "1990-01-01" });
    expect(await survivingTables(filled)).toHaveLength(14);
    signInAs(fixture.adminUserId);
    const response = await leave({ confirmDeleteHousehold: true });
    expect(response.status).toBe(204);
    expect(await survivingTables(filled)).toEqual([]);
  });

  it("answers 400 for an unknown field", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    expect((await leave({ confirm: true })).status).toBe(400);
  });

  it("never leaves a household without an admin when its admin and a member leave at once", async () => {
    for (let round = 0; round < 5; round++) {
      await truncateAll();
      const fixture = await createHouseholdFixture("a");
      const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
      // The session mock is shared, so the two leaves are started by calling the service directly.
      const { leave: leaveService } = await import("@/modules/household/household-service");
      const results = await Promise.allSettled([
        leaveService(fixture.adminUserId, { confirmDeleteHousehold: true }),
        leaveService(plain.userId, { confirmDeleteHousehold: true }),
      ]);
      const members = await getDb().select().from(member).where(eq(member.householdId, fixture.householdId));
      const households = await getDb().select().from(household);
      if (households.length > 0) expect(members.some((item) => item.isAdmin)).toBe(true);
      expect(results.filter((result) => result.status === "fulfilled").length).toBeGreaterThanOrEqual(1);
    }
  });
});
