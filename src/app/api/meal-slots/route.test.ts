import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { truncateAll } from "@/test/db";
import { addAccountMember, createHouseholdFixture, jsonRequest, paramsOf, unknownId } from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const signInAs = (id: string) => getSession.mockResolvedValue({ user: { id, name: id, email: `${id}@example.com` } });

import { mealSlot, member, memberMealSlot } from "@/db/schema";
import { POST } from "./route.ts";
import { DELETE, PATCH } from "./[id]/route.ts";

const post = (body: unknown) => POST(jsonRequest("POST", "/api/meal-slots", body), paramsOf());
const patch = (id: string, body: unknown) => PATCH(jsonRequest("PATCH", `/api/meal-slots/${id}`, body), paramsOf(id));
const del = (id: string) => DELETE(jsonRequest("DELETE", `/api/meal-slots/${id}`), paramsOf(id));

describe("/api/meal-slots", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("answers 401 when signed out", async () => {
    expect((await post({ name: "Tea", time: "16:00" })).status).toBe(401);
  });

  it("creates, renames, retimes and deletes a slot", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const created = await post({ name: " Tea ", time: "16:00" });
    expect(created.status).toBe(201);
    const slot = await created.json();
    expect(slot).toMatchObject({ name: "Tea", time: "16:00", householdId: fixture.householdId });

    const changed = await patch(slot.id, { time: "16:30" });
    expect(await changed.json()).toMatchObject({ name: "Tea", time: "16:30" });
    expect((await patch(slot.id, { name: "High tea" })).status).toBe(200);

    expect((await del(slot.id)).status).toBe(204);
    expect(await getDb().select().from(mealSlot).where(eq(mealSlot.id, slot.id))).toHaveLength(0);
  });

  it("validates name length and time", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    for (const body of [
      { name: "", time: "16:00" },
      { name: "x".repeat(31), time: "16:00" },
      { name: "Tea", time: "4pm" },
      { name: "Tea" },
      { name: "Tea", time: "16:00", extra: true },
    ]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect((await post({ name: "x".repeat(30), time: "16:00" })).status).toBe(201);
    expect((await patch(fixture.slotIds[0], {})).status).toBe(400);
  });

  it("answers 409 naming the field when the name or time is taken", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);

    const sameName = await post({ name: "LUNCH", time: "15:00" });
    expect(sameName.status).toBe(409);
    expect(Object.keys((await sameName.json()).error.fields)).toEqual(["name"]);

    const sameTime = await post({ name: "Brunch", time: "13:00" });
    expect(sameTime.status).toBe(409);
    expect(Object.keys((await sameTime.json()).error.fields)).toEqual(["time"]);

    const renamed = await patch(fixture.slotIds[0], { name: "lunch" });
    expect(renamed.status).toBe(409);
    expect(Object.keys((await renamed.json()).error.fields)).toEqual(["name"]);
    expect((await patch(fixture.slotIds[0], { time: "13:00" })).status).toBe(409);
  });

  it("lets another household use the same name and time", async () => {
    await createHouseholdFixture("a");
    const b = await createHouseholdFixture("b");
    signInAs(b.adminUserId);
    expect((await post({ name: "Tea", time: "16:00" })).status).toBe(201);
    const a2 = await getDb().select().from(mealSlot).where(eq(mealSlot.name, "Breakfast"));
    expect(a2).toHaveLength(2);
  });

  it("answers 403 admin_only to a member who is not an admin", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    signInAs(plain.userId);
    for (const response of [
      await post({ name: "Tea", time: "16:00" }),
      await patch(fixture.slotIds[0], { name: "Tea" }),
      await del(fixture.slotIds[0]),
    ]) {
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("admin_only");
    }
  });

  it("answers 404 for another household's slot, and for an id that is not a uuid", async () => {
    const a = await createHouseholdFixture("a");
    const b = await createHouseholdFixture("b");
    signInAs(a.adminUserId);
    for (const response of [
      await patch(b.slotIds[0], { name: "Mine" }),
      await del(b.slotIds[0]),
      await patch(unknownId(), { name: "Mine" }),
      await del("not-a-uuid"),
    ]) {
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("not_found");
    }
    const [untouched] = await getDb().select().from(mealSlot).where(eq(mealSlot.id, b.slotIds[0]));
    expect(untouched.name).toBe("Breakfast");
  });

  it("deleting a slot removes it from the members who eat in it", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    expect(await getDb().select().from(memberMealSlot)).toHaveLength(2);
    expect((await del(fixture.slotIds[0])).status).toBe(204);
    const links = await getDb().select().from(memberMealSlot);
    expect(links).toEqual([{ memberId: fixture.adminMemberId, mealSlotId: fixture.slotIds[1] }]);
    expect(await getDb().select().from(member)).toHaveLength(1);
  });
});
