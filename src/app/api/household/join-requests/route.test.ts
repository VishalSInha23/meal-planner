import { beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { joinRequest, household, mealDishMember, member, memberMealSlot } from "@/db/schema";
import { truncateAll } from "@/test/db";
import {
  addAccountMember,
  createHouseholdFixture,
  createUser,
  fillHousehold,
  jsonRequest,
  paramsOf,
  survivingTables,
} from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const signInAs = (id: string) => getSession.mockResolvedValue({ user: { id, name: id, email: `${id}@example.com` } });

import { GET } from "./route.ts";
import { POST as approve } from "./[id]/approve/route.ts";
import { POST as decline } from "./[id]/decline/route.ts";

const list = () => GET(jsonRequest("GET", "/api/household/join-requests"), paramsOf());
const approveRequest = (id: string, body?: unknown) =>
  approve(jsonRequest("POST", `/api/household/join-requests/${id}/approve`, body), paramsOf(id));
const declineRequest = (id: string) => decline(jsonRequest("POST", `/api/household/join-requests/${id}/decline`), paramsOf(id));
const errorOf = async (response: Response) => (await response.json()).error;

async function askToJoin(householdId: string, userId: string, status = "pending", confirmedDeleteHousehold = false) {
  const [row] = await getDb()
    .insert(joinRequest)
    .values({
      householdId,
      userId,
      name: "Nia",
      sex: "female",
      dateOfBirth: "1990-01-01",
      status: status as "pending",
      confirmedDeleteHousehold,
    })
    .returning();
  return row;
}

const requestRow = async (id: string) => (await getDb().select().from(joinRequest).where(eq(joinRequest.id, id)))[0];
const memberOf = async (userId: string) => (await getDb().select().from(member).where(eq(member.userId, userId)))[0];

async function placeholder(householdId: string, slotIds: string[]) {
  const [row] = await getDb()
    .insert(member)
    .values({
      householdId,
      name: "Kid",
      sex: "male",
      ageBand: "6-10",
      kcalTarget: 1600,
      proteinTargetG: "40.0",
      heightCm: "130.5",
      weightKg: "30.0",
      activityLevel: "active",
      goal: "maintain",
    })
    .returning();
  await getDb().insert(memberMealSlot).values(slotIds.slice(0, 1).map((mealSlotId) => ({ memberId: row.id, mealSlotId })));
  return row;
}

describe("/api/household/join-requests", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("answers 401 when signed out", async () => {
    const id = crypto.randomUUID();
    for (const response of [await list(), await approveRequest(id), await declineRequest(id)]) {
      expect(response.status).toBe(401);
    }
  });

  it("answers 403 to a member who is not an admin", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    await createUser("asker");
    const request = await askToJoin(fixture.householdId, "asker");
    signInAs(plain.userId);
    for (const response of [await list(), await approveRequest(request.id), await declineRequest(request.id)]) {
      expect(response.status).toBe(403);
      expect((await errorOf(response)).code).toBe("admin_only");
    }
    expect((await requestRow(request.id)).status).toBe("pending");
  });

  it("lists the pending requests of the admin's household with the age in years", async () => {
    const a = await createHouseholdFixture("a");
    const b = await createHouseholdFixture("b");
    await createUser("asker-1");
    await createUser("asker-2");
    await createUser("asker-3");
    const pending = await askToJoin(a.householdId, "asker-1");
    await askToJoin(a.householdId, "asker-2", "declined");
    await askToJoin(b.householdId, "asker-3");
    signInAs(a.adminUserId);
    const response = await list();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: pending.id, name: "Nia", sex: "female" });
    expect(typeof body[0].createdAt).toBe("string");
    const born = new Date("1990-01-01");
    const now = new Date();
    const expected = now.getFullYear() - born.getFullYear() - (now < new Date(now.getFullYear(), 0, 1) ? 1 : 0);
    expect(body[0].ageYears).toBe(expected);
    expect(Object.keys(body[0]).toSorted()).toEqual(["ageYears", "createdAt", "id", "name", "sex"]);
  });

  describe("approving", () => {
    it("links to a member without an account: keeps slots, targets and meal ticks, replaces name, sex and date of birth", async () => {
      const target = await createHouseholdFixture("a");
      const kid = await placeholder(target.householdId, target.slotIds);
      const filled = await fillHousehold(target, [target.adminMemberId, kid.id]);
      await createUser("asker");
      const request = await askToJoin(target.householdId, "asker");
      signInAs(target.adminUserId);

      const response = await approveRequest(request.id, { linkMemberId: kid.id });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ id: kid.id, userId: "asker", slotIds: [target.slotIds[0]] });

      const [row] = await getDb().select().from(member).where(eq(member.id, kid.id));
      expect(row).toMatchObject({
        userId: "asker",
        name: "Nia",
        sex: "female",
        dateOfBirth: "1990-01-01",
        ageBand: null,
        kcalTarget: 1600,
        proteinTargetG: "40.0",
        heightCm: "130.5",
        weightKg: "30.0",
        activityLevel: "active",
        goal: "maintain",
        isAdmin: false,
        householdId: target.householdId,
      });
      expect(await getDb().select().from(memberMealSlot).where(eq(memberMealSlot.memberId, kid.id))).toHaveLength(1);
      expect(await getDb().select().from(mealDishMember).where(eq(mealDishMember.memberId, kid.id))).toHaveLength(1);
      expect(await getDb().select().from(member).where(eq(member.householdId, target.householdId))).toHaveLength(2);
      const decided = await requestRow(request.id);
      expect(decided.status).toBe("approved");
      expect(decided.decidedAt).not.toBeNull();
      expect(decided.decidedByMemberId).toBe(target.adminMemberId);
      expect(filled.householdId).toBe(target.householdId);
    });

    it("adds a new member who eats in every slot and is not an admin", async () => {
      const target = await createHouseholdFixture("a");
      await createUser("asker");
      const request = await askToJoin(target.householdId, "asker");
      signInAs(target.adminUserId);

      const response = await approveRequest(request.id, {});
      expect(response.status).toBe(200);
      const added = await memberOf("asker");
      expect(added).toMatchObject({
        householdId: target.householdId,
        name: "Nia",
        sex: "female",
        dateOfBirth: "1990-01-01",
        ageBand: null,
        isAdmin: false,
        kcalTarget: null,
      });
      const slots = await getDb().select().from(memberMealSlot).where(eq(memberMealSlot.memberId, added.id));
      expect(slots.map((slot) => slot.mealSlotId).toSorted()).toEqual(target.slotIds.toSorted());
      expect((await requestRow(request.id)).status).toBe("approved");
    });

    it("works without a body", async () => {
      const target = await createHouseholdFixture("a");
      await createUser("asker");
      const request = await askToJoin(target.householdId, "asker");
      signInAs(target.adminUserId);
      expect((await approveRequest(request.id)).status).toBe(200);
    });

    it("deletes the asker's old household with all its data when they were its last account member", async () => {
      const target = await createHouseholdFixture("a");
      const old = await createHouseholdFixture("old");
      const kid = await placeholder(old.householdId, old.slotIds);
      const filled = await fillHousehold(old, [old.adminMemberId, kid.id]);
      await createUser("other-asker");
      await askToJoin(old.householdId, "other-asker");
      expect(await survivingTables(filled)).toHaveLength(14);
      const request = await askToJoin(target.householdId, old.adminUserId, "pending", true);
      signInAs(target.adminUserId);

      const response = await approveRequest(request.id);
      expect(response.status).toBe(200);
      expect(await survivingTables(filled)).toEqual([]);
      expect(await getDb().select().from(household).where(eq(household.id, old.householdId))).toHaveLength(0);
      expect((await memberOf(old.adminUserId)).householdId).toBe(target.householdId);
      expect((await requestRow(request.id)).status).toBe("approved");
    });

    it("moves an asker out of a household that has other accounts, which carries on", async () => {
      const target = await createHouseholdFixture("a");
      const old = await createHouseholdFixture("old");
      const other = await addAccountMember(old.householdId, old.slotIds, "old-plain");
      const filled = await fillHousehold(old, [old.adminMemberId, other.memberId]);
      // The asker is a plain member of the old household: two admins keep it safe.
      await getDb().update(member).set({ isAdmin: true }).where(eq(member.id, other.memberId));
      const request = await askToJoin(target.householdId, old.adminUserId);
      signInAs(target.adminUserId);

      expect((await approveRequest(request.id)).status).toBe(200);
      expect(await getDb().select().from(member).where(eq(member.id, old.adminMemberId))).toHaveLength(0);
      expect(await getDb().select().from(household).where(eq(household.id, old.householdId))).toHaveLength(1);
      expect(await getDb().select().from(mealDishMember).where(eq(mealDishMember.memberId, other.memberId))).toHaveLength(1);
      expect(await survivingTables(filled)).toContain("meal");
    });

    it("refuses with last_admin when the asker became the only admin of a household with other accounts, and changes nothing", async () => {
      const target = await createHouseholdFixture("a");
      const old = await createHouseholdFixture("old");
      await addAccountMember(old.householdId, old.slotIds, "old-plain");
      const request = await askToJoin(target.householdId, old.adminUserId);
      signInAs(target.adminUserId);

      const response = await approveRequest(request.id);
      expect(response.status).toBe(409);
      expect((await errorOf(response)).code).toBe("last_admin");
      expect((await requestRow(request.id)).status).toBe("pending");
      expect((await requestRow(request.id)).decidedAt).toBeNull();
      expect((await memberOf(old.adminUserId)).householdId).toBe(old.householdId);
      expect(await getDb().select().from(member).where(eq(member.householdId, target.householdId))).toHaveLength(1);
      expect(await getDb().select().from(member).where(eq(member.householdId, old.householdId))).toHaveLength(2);
    });

    it("refuses with would_delete_household when the other accounts left after the asker asked without confirming", async () => {
      const target = await createHouseholdFixture("a");
      const old = await createHouseholdFixture("old");
      const other = await addAccountMember(old.householdId, old.slotIds, "old-plain");
      const request = await askToJoin(target.householdId, old.adminUserId);
      await getDb().delete(member).where(eq(member.id, other.memberId));
      signInAs(target.adminUserId);

      const response = await approveRequest(request.id);
      expect(response.status).toBe(409);
      const error = await errorOf(response);
      expect(error.code).toBe("would_delete_household");
      expect(error.message).toBe(`Approving would delete House old. Ask them to send a new request`);
      expect((await requestRow(request.id)).status).toBe("pending");
      expect((await memberOf(old.adminUserId)).householdId).toBe(old.householdId);
      expect(await getDb().select().from(household).where(eq(household.id, old.householdId))).toHaveLength(1);
      expect(await getDb().select().from(member).where(eq(member.householdId, target.householdId))).toHaveLength(1);
    });

    it("refuses with would_delete_household when an asker without a household created one after asking", async () => {
      const target = await createHouseholdFixture("a");
      const created = await createHouseholdFixture("created");
      const request = await askToJoin(target.householdId, created.adminUserId);
      signInAs(target.adminUserId);

      const response = await approveRequest(request.id);
      expect(response.status).toBe(409);
      expect((await errorOf(response)).code).toBe("would_delete_household");
      expect((await requestRow(request.id)).status).toBe("pending");
      expect((await memberOf(created.adminUserId)).householdId).toBe(created.householdId);
      expect(await getDb().select().from(household).where(eq(household.id, created.householdId))).toHaveLength(1);
    });

    it("refuses with already_in_household when the asker joined this household meanwhile, and leaves the request pending", async () => {
      const target = await createHouseholdFixture("a");
      const plain = await addAccountMember(target.householdId, target.slotIds);
      const request = await askToJoin(target.householdId, plain.userId);
      signInAs(target.adminUserId);
      const response = await approveRequest(request.id);
      expect(response.status).toBe(409);
      expect((await errorOf(response)).code).toBe("already_in_household");
      expect((await requestRow(request.id)).status).toBe("pending");
      expect(await getDb().select().from(member).where(eq(member.householdId, target.householdId))).toHaveLength(2);
    });

    it("lets exactly one of two parallel approvals win", async () => {
      const target = await createHouseholdFixture("a");
      await createUser("asker");
      const request = await askToJoin(target.householdId, "asker");
      signInAs(target.adminUserId);

      const responses = await Promise.all([approveRequest(request.id), approveRequest(request.id)]);
      const statuses = responses.map((response) => response.status).toSorted();
      expect(statuses).toEqual([200, 409]);
      const loser = responses.find((response) => response.status === 409)!;
      expect((await errorOf(loser)).code).toBe("request_not_pending");
      expect(await getDb().select().from(member).where(eq(member.userId, "asker"))).toHaveLength(1);
    });

    it("answers 409 request_not_pending for a declined, cancelled or already approved request", async () => {
      const target = await createHouseholdFixture("a");
      signInAs(target.adminUserId);
      for (const status of ["declined", "cancelled", "dismissed", "approved"]) {
        await createUser(`asker-${status}`);
        const request = await askToJoin(target.householdId, `asker-${status}`, status);
        for (const response of [await approveRequest(request.id), await declineRequest(request.id)]) {
          expect(response.status).toBe(409);
          expect((await errorOf(response)).code).toBe("request_not_pending");
        }
        expect((await requestRow(request.id)).status).toBe(status);
      }
      expect(await getDb().select().from(member).where(eq(member.householdId, target.householdId))).toHaveLength(1);
    });

    it("answers 404 for another household's request and member, and rolls the claim back", async () => {
      const a = await createHouseholdFixture("a");
      const b = await createHouseholdFixture("b");
      const foreignKid = await placeholder(b.householdId, b.slotIds);
      await createUser("asker-a");
      await createUser("asker-b");
      const requestA = await askToJoin(a.householdId, "asker-a");
      const requestB = await askToJoin(b.householdId, "asker-b");
      signInAs(a.adminUserId);

      for (const response of [await approveRequest(requestB.id), await declineRequest(requestB.id)]) {
        expect(response.status).toBe(404);
      }
      const linkForeign = await approveRequest(requestA.id, { linkMemberId: foreignKid.id });
      expect(linkForeign.status).toBe(404);
      expect((await requestRow(requestA.id)).status).toBe("pending");
      expect((await requestRow(requestB.id)).status).toBe("pending");
      expect((await getDb().select().from(member).where(eq(member.id, foreignKid.id)))[0].userId).toBeNull();
      expect((await approveRequest(crypto.randomUUID())).status).toBe(404);
      expect((await approveRequest("not-a-uuid")).status).toBe(404);
    });

    it("answers 409 member_has_account when linking a member with an account, and 400 for a malformed body", async () => {
      const target = await createHouseholdFixture("a");
      await createUser("asker");
      const request = await askToJoin(target.householdId, "asker");
      signInAs(target.adminUserId);
      const response = await approveRequest(request.id, { linkMemberId: target.adminMemberId });
      expect(response.status).toBe(409);
      expect((await errorOf(response)).code).toBe("member_has_account");
      expect((await requestRow(request.id)).status).toBe("pending");
      expect((await approveRequest(request.id, { linkMemberId: "nope" })).status).toBe(400);
      expect((await approveRequest(request.id, { other: 1 })).status).toBe(400);
    });

    it("lets only one of two requests link the same member", async () => {
      const target = await createHouseholdFixture("a");
      const kid = await placeholder(target.householdId, target.slotIds);
      await createUser("asker-1");
      await createUser("asker-2");
      const first = await askToJoin(target.householdId, "asker-1");
      const second = await askToJoin(target.householdId, "asker-2");
      signInAs(target.adminUserId);
      const responses = await Promise.all([
        approveRequest(first.id, { linkMemberId: kid.id }),
        approveRequest(second.id, { linkMemberId: kid.id }),
      ]);
      expect(responses.map((response) => response.status).toSorted()).toEqual([200, 409]);
      const failed = responses.find((response) => response.status === 409)!;
      expect((await errorOf(failed)).code).toBe("member_has_account");
      const pending = await getDb().select().from(joinRequest).where(and(eq(joinRequest.status, "pending")));
      expect(pending).toHaveLength(1);
    });
  });

  describe("declining", () => {
    it("moves a pending request to declined with who decided and when, and changes nothing else", async () => {
      const target = await createHouseholdFixture("a");
      await createUser("asker");
      const request = await askToJoin(target.householdId, "asker");
      signInAs(target.adminUserId);
      const response = await declineRequest(request.id);
      expect(response.status).toBe(204);
      const row = await requestRow(request.id);
      expect(row.status).toBe("declined");
      expect(row.decidedAt).not.toBeNull();
      expect(row.decidedByMemberId).toBe(target.adminMemberId);
      expect(await memberOf("asker")).toBeUndefined();
      expect(await list().then((r) => r.json())).toEqual([]);
    });
  });
});
