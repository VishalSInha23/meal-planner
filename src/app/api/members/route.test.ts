import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { truncateAll } from "@/test/db";
import { addAccountMember, createHouseholdFixture, jsonRequest, paramsOf, unknownId } from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const signInAs = (id: string) => getSession.mockResolvedValue({ user: { id, name: id, email: `${id}@example.com` } });

import { member, memberMealSlot } from "@/db/schema";
import { POST } from "./route.ts";
import { DELETE, PATCH } from "./[id]/route.ts";

const post = (body: unknown) => POST(jsonRequest("POST", "/api/members", body), paramsOf());
const patch = (id: string, body: unknown) => PATCH(jsonRequest("PATCH", `/api/members/${id}`, body), paramsOf(id));
const del = (id: string) => DELETE(jsonRequest("DELETE", `/api/members/${id}`), paramsOf(id));

const memberBody = (slotIds: string[], extra: object = {}) => ({ name: "Kid", sex: "male", ageBand: "6-10", slotIds, ...extra });
const yearsAgo = (years: number, days = 0) => {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

describe("/api/members", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("answers 401 when signed out", async () => {
    expect((await post(memberBody([unknownId()]))).status).toBe(401);
  });

  it("lets an admin add a member without an account, with the slots they eat in", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const response = await post(memberBody([fixture.slotIds[1]], { kcalTarget: 1800, proteinTargetG: 55.5 }));
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created).toMatchObject({
      name: "Kid",
      userId: null,
      isAdmin: false,
      householdId: fixture.householdId,
      kcalTarget: 1800,
      proteinTargetG: 55.5,
      ageBand: "6-10",
      slotIds: [fixture.slotIds[1]],
    });
  });

  it("accepts and returns height, weight, activity level and goal", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const slots = [fixture.slotIds[0]];
    const created = await post(
      memberBody(slots, { heightCm: 170.5, weightKg: 70.3, activityLevel: "very_active", goal: "lose" }),
    );
    expect(created.status).toBe(201);
    const kid = await created.json();
    expect(kid).toMatchObject({ heightCm: 170.5, weightKg: 70.3, activityLevel: "very_active", goal: "lose" });

    const bounds = await patch(kid.id, { heightCm: 50, weightKg: 300 });
    expect(await bounds.json()).toMatchObject({ heightCm: 50, weightKg: 300, activityLevel: "very_active", goal: "lose" });
    const changed = await patch(kid.id, { heightCm: 250, weightKg: 5, activityLevel: "sedentary", goal: "gain" });
    expect(await changed.json()).toMatchObject({ heightCm: 250, weightKg: 5, activityLevel: "sedentary", goal: "gain" });
    const cleared = await patch(kid.id, { heightCm: null, weightKg: null, activityLevel: null, goal: null });
    expect(await cleared.json()).toMatchObject({ heightCm: null, weightKg: null, activityLevel: null, goal: null });

    const plain = await (await post(memberBody(slots))).json();
    expect(plain).toMatchObject({ heightCm: null, weightKg: null, activityLevel: null, goal: null });
  });

  it("rejects out-of-range body values on update, naming the field", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const kid = await (await post(memberBody([fixture.slotIds[0]], { heightCm: 170, weightKg: 70 }))).json();
    for (const [field, value] of [["heightCm", 49], ["heightCm", 251], ["weightKg", 4], ["weightKg", 301], ["activityLevel", "x"], ["goal", "x"]]) {
      const response = await patch(kid.id, { [field]: value });
      expect(response.status, `${field} ${value}`).toBe(400);
      expect(Object.keys((await response.json()).error.fields)).toEqual([field]);
    }
    expect(await patch(kid.id, {}).then((response) => response.status)).toBe(400);
    expect((await getDb().select().from(member).where(eq(member.id, kid.id)))[0]).toMatchObject({ heightCm: "170.0", weightKg: "70.0" });
  });

  it("lets a non-admin set their own body details but not another member's", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    signInAs(plain.userId);
    const own = await patch(plain.memberId, { heightCm: 160, goal: "maintain" });
    expect(own.status).toBe(200);
    expect(await own.json()).toMatchObject({ heightCm: 160, goal: "maintain" });
    expect((await patch(fixture.adminMemberId, { heightCm: 160 })).status).toBe(403);
  });

  it("validates the member fields", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const slots = [fixture.slotIds[0]];
    const rejected: object[] = [
      memberBody(slots, { name: "" }),
      memberBody(slots, { name: "x".repeat(41) }),
      memberBody(slots, { sex: "other" }),
      memberBody(slots, { ageBand: "0-5" }),
      memberBody(slots, { ageBand: undefined }),
      memberBody(slots, { kcalTarget: 499 }),
      memberBody(slots, { kcalTarget: 6001 }),
      memberBody(slots, { proteinTargetG: 9.9 }),
      memberBody(slots, { proteinTargetG: 300.5 }),
      memberBody(slots, { proteinTargetG: 20.25 }),
      memberBody(slots, { heightCm: 49.9 }),
      memberBody(slots, { heightCm: 250.1 }),
      memberBody(slots, { heightCm: 170.25 }),
      memberBody(slots, { weightKg: 4.9 }),
      memberBody(slots, { weightKg: 300.1 }),
      memberBody(slots, { weightKg: 70.25 }),
      memberBody(slots, { activityLevel: "extreme" }),
      memberBody(slots, { goal: "bulk" }),
      memberBody([]),
      memberBody(slots, { isAdmin: true }),
      memberBody(slots, { userId: "someone" }),
    ];
    for (const body of rejected) expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    expect(await getDb().select().from(member)).toHaveLength(1);
  });

  it("checks the date of birth against the household's today", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const slots = [fixture.slotIds[0]];
    const withDob = (dateOfBirth: string) => memberBody(slots, { ageBand: undefined, dateOfBirth });

    for (const dateOfBirth of [yearsAgo(-1), yearsAgo(0, 1), yearsAgo(1, 2), "2025-02-30"]) {
      const response = await post(withDob(dateOfBirth));
      expect(response.status, dateOfBirth).toBe(400);
      expect(Object.keys((await response.json()).error.fields)).toEqual(["dateOfBirth"]);
    }
    // The household is on UTC, so a year and a day ago is always old enough.
    expect((await post(withDob(yearsAgo(1, -2)))).status).toBe(201);
    expect((await post(withDob("1990-04-23"))).status).toBe(201);
  });

  it("answers 404 when a slot belongs to another household", async () => {
    const a = await createHouseholdFixture("a");
    const b = await createHouseholdFixture("b");
    signInAs(a.adminUserId);
    const response = await post(memberBody([b.slotIds[0]]));
    expect(response.status).toBe(404);
    expect(await getDb().select().from(member)).toHaveLength(2);
    expect((await post(memberBody([a.slotIds[0], unknownId()]))).status).toBe(404);
  });

  it("answers 403 admin_only to a non-admin adding or removing members", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    signInAs(plain.userId);
    for (const response of [await post(memberBody(fixture.slotIds)), await del(unknownId())]) {
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("admin_only");
    }
  });

  it("lets an admin change any member, including admin right and slots", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const kid = await (await post(memberBody([fixture.slotIds[0]]))).json();
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    expect((await patch(plain.memberId, { isAdmin: true })).status).toBe(200);
    const response = await patch(kid.id, {
      name: "Kid Two",
      isAdmin: false,
      kcalTarget: 2000,
      slotIds: fixture.slotIds,
      dateOfBirth: "2015-05-05",
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ name: "Kid Two", isAdmin: false, kcalTarget: 2000, dateOfBirth: "2015-05-05", ageBand: "6-10" });
    expect(body.slotIds.toSorted()).toEqual(fixture.slotIds.toSorted());

    const cleared = await patch(kid.id, { kcalTarget: null, slotIds: [fixture.slotIds[1]] });
    expect(await cleared.json()).toMatchObject({ kcalTarget: null, slotIds: [fixture.slotIds[1]] });
    expect(await getDb().select().from(memberMealSlot).where(eq(memberMealSlot.memberId, kid.id))).toHaveLength(1);
  });

  it("keeps a member's age known: it can't clear both the band and the date of birth", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const kid = await (await post(memberBody(fixture.slotIds))).json();
    const response = await patch(kid.id, { ageBand: null });
    expect(response.status).toBe(400);
    expect(Object.keys((await response.json()).error.fields)).toEqual(["ageBand"]);
    await patch(kid.id, { dateOfBirth: "2015-05-05" });
    expect((await patch(kid.id, { ageBand: null })).status).toBe(200);
  });

  it("lets a non-admin edit their own details and slots", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    signInAs(plain.userId);
    const response = await patch(plain.memberId, { name: "Me", proteinTargetG: 60, slotIds: [fixture.slotIds[0]] });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: "Me", proteinTargetG: 60, slotIds: [fixture.slotIds[0]], isAdmin: false });
    expect((await patch(plain.memberId, { isAdmin: false })).status).toBe(200);
  });

  it("answers 403 when a non-admin changes admin right or someone else", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    signInAs(plain.userId);

    const promote = await patch(plain.memberId, { isAdmin: true });
    expect(promote.status).toBe(403);
    expect((await promote.json()).error.code).toBe("admin_only");

    const other = await patch(fixture.adminMemberId, { name: "Hacked" });
    expect(other.status).toBe(403);
    const otherSlots = await patch(fixture.adminMemberId, { slotIds: [fixture.slotIds[0]] });
    expect(otherSlots.status).toBe(403);

    const [row] = await getDb().select().from(member).where(eq(member.id, fixture.adminMemberId));
    expect(row.name).toBe("Admin");
    const [self] = await getDb().select().from(member).where(eq(member.id, plain.memberId));
    expect(self.isAdmin).toBe(false);
  });

  it("answers 404 for another household's member", async () => {
    const a = await createHouseholdFixture("a");
    const b = await createHouseholdFixture("b");
    signInAs(a.adminUserId);
    for (const response of [
      await patch(b.adminMemberId, { name: "Mine" }),
      await del(b.adminMemberId),
      await patch(unknownId(), { name: "Mine" }),
    ]) {
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("not_found");
    }
    const [row] = await getDb().select().from(member).where(eq(member.id, b.adminMemberId));
    expect(row.name).toBe("Admin");
  });

  it("answers 404 for another household's member even to a non-admin", async () => {
    const a = await createHouseholdFixture("a");
    const b = await createHouseholdFixture("b");
    const plain = await addAccountMember(a.householdId, a.slotIds);
    signInAs(plain.userId);
    expect((await patch(b.adminMemberId, { name: "Mine" })).status).toBe(404);
  });

  it("removes a member without an account, and their slot links", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const kid = await (await post(memberBody(fixture.slotIds))).json();
    expect((await del(kid.id)).status).toBe(204);
    expect(await getDb().select().from(member).where(eq(member.id, kid.id))).toHaveLength(0);
    expect(await getDb().select().from(memberMealSlot).where(eq(memberMealSlot.memberId, kid.id))).toHaveLength(0);
  });

  it("answers 400 on isAdmin when making a member without an account an admin", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const kid = await (await post(memberBody(fixture.slotIds))).json();
    const response = await patch(kid.id, { isAdmin: true });
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields).toEqual({ isAdmin: "Only members with an account can be admins" });
    const [row] = await getDb().select().from(member).where(eq(member.id, kid.id));
    expect(row.isAdmin).toBe(false);
  });

  it("answers 409 last_admin when the only admin removes their own admin right, and allows it with a second admin", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    signInAs(fixture.adminUserId);
    const response = await patch(fixture.adminMemberId, { isAdmin: false });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatchObject({ code: "last_admin", message: "Make someone else an admin first" });
    const [still] = await getDb().select().from(member).where(eq(member.id, fixture.adminMemberId));
    expect(still.isAdmin).toBe(true);

    expect((await patch(plain.memberId, { isAdmin: true })).status).toBe(200);
    expect((await patch(fixture.adminMemberId, { isAdmin: false })).status).toBe(200);
  });

  it("lets an admin remove another account member, who then has no household, but not themselves", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    signInAs(fixture.adminUserId);

    const self = await del(fixture.adminMemberId);
    expect(self.status).toBe(409);
    expect((await self.json()).error).toMatchObject({ code: "use_leave", message: "Leave the household instead" });
    expect(await getDb().select().from(member)).toHaveLength(2);

    const response = await del(plain.memberId);
    expect(response.status).toBe(204);
    expect(await getDb().select().from(member).where(eq(member.userId, plain.userId))).toHaveLength(0);
    expect(await getDb().select().from(member)).toHaveLength(1);
  });
});
