import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { household, joinAttempt, joinRequest, member } from "@/db/schema";
import { truncateAll } from "@/test/db";
import { addAccountMember, createHouseholdFixture, createUser, jsonRequest, paramsOf } from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const signInAs = (id: string) => getSession.mockResolvedValue({ user: { id, name: id, email: `${id}@example.com` } });

import { DELETE, GET } from "./mine/route.ts";
import { POST as dismiss } from "./mine/dismiss/route.ts";
import { POST } from "./route.ts";

const you = { name: "Nia", sex: "female", dateOfBirth: "1990-01-01" };
const ask = (body: unknown) => POST(jsonRequest("POST", "/api/join-requests", body), paramsOf());
const mine = () => GET(jsonRequest("GET", "/api/join-requests/mine"), paramsOf());
const cancel = () => DELETE(jsonRequest("DELETE", "/api/join-requests/mine"), paramsOf());
const dismissMine = () => dismiss(jsonRequest("POST", "/api/join-requests/mine/dismiss"), paramsOf());
const errorOf = async (response: Response) => (await response.json()).error;
const attempts = async () => (await getDb().select().from(joinAttempt)).length;

describe("/api/join-requests", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("answers 401 when signed out", async () => {
    for (const response of [await ask({ code: "ABCD2345" }), await mine(), await cancel(), await dismissMine()]) {
      expect(response.status).toBe(401);
    }
  });

  describe("asking without a household", () => {
    beforeEach(async () => {
      await createUser("newcomer");
      signInAs("newcomer");
    });

    it("creates a pending request from a lowercase code with spaces, and counts nothing", async () => {
      const target = await createHouseholdFixture("a");
      const response = await ask({ code: `  ${target.joinCode.toLowerCase()} `, you });
      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({
        householdId: target.householdId,
        householdName: "House a",
        name: "Nia",
        sex: "female",
        dateOfBirth: "1990-01-01",
        status: "pending",
        decidedAt: null,
      });
      expect(await attempts()).toBe(0);
    });

    it("needs the details, validated like onboarding", async () => {
      const target = await createHouseholdFixture("a");
      const missing = await ask({ code: target.joinCode });
      expect(missing.status).toBe(400);
      expect((await errorOf(missing)).fields).toHaveProperty("you");

      const invalid = await ask({ code: target.joinCode, you: { name: " ", sex: "other", dateOfBirth: "2999-01-01" } });
      expect(invalid.status).toBe(400);
      expect(Object.keys((await errorOf(invalid)).fields).toSorted()).toEqual(["you.name", "you.sex"]);

      const future = await ask({ code: target.joinCode, you: { ...you, dateOfBirth: "2999-01-01" } });
      expect(future.status).toBe(400);
      expect((await errorOf(future)).fields).toEqual({ "you.dateOfBirth": "The date of birth can't be in the future" });

      expect(await getDb().select().from(joinRequest)).toHaveLength(0);
    });

    it("answers 404 unknown_code and records the attempt, also for a code of the wrong shape", async () => {
      await createHouseholdFixture("a");
      for (const code of ["ZZZZZZZZ", "abc", ""]) {
        const response = await ask({ code, you });
        expect(response.status).toBe(404);
        expect(await errorOf(response)).toMatchObject({ code: "unknown_code", message: "No household has this code" });
      }
      expect(await attempts()).toBe(3);
    });

    it("answers 429 from the 11th attempt in an hour, and right codes don't count", async () => {
      const target = await createHouseholdFixture("a");
      for (let i = 0; i < 9; i++) expect((await ask({ code: "ZZZZZZZZ", you })).status).toBe(404);

      const right = await ask({ code: target.joinCode, you });
      expect(right.status).toBe(201);
      expect(await attempts()).toBe(9);
      expect((await cancel()).status).toBe(204);

      expect((await ask({ code: "ZZZZZZZZ", you })).status).toBe(404);
      expect(await attempts()).toBe(10);

      for (const code of ["ZZZZZZZZ", target.joinCode]) {
        const blocked = await ask({ code, you });
        expect(blocked.status).toBe(429);
        expect(await errorOf(blocked)).toMatchObject({
          code: "too_many_attempts",
          message: "Too many attempts, try again in 60 minutes",
        });
      }
      expect(await attempts()).toBe(10);
    });

    it("answers 409 request_pending for a second request, also to another household", async () => {
      const first = await createHouseholdFixture("a");
      const second = await createHouseholdFixture("b");
      expect((await ask({ code: first.joinCode, you })).status).toBe(201);
      for (const code of [first.joinCode, second.joinCode]) {
        const response = await ask({ code, you });
        expect(response.status).toBe(409);
        expect((await errorOf(response)).code).toBe("request_pending");
      }
    });

    it("lets only one of two parallel requests through", async () => {
      const target = await createHouseholdFixture("a");
      const responses = await Promise.all([ask({ code: target.joinCode, you }), ask({ code: target.joinCode, you })]);
      expect(responses.map((response) => response.status).toSorted()).toEqual([201, 409]);
      const loser = responses.find((response) => response.status === 409)!;
      expect((await errorOf(loser)).code).toBe("request_pending");
      expect(await getDb().select().from(joinRequest)).toHaveLength(1);
    });
  });

  describe("asking from a household", () => {
    it("refuses the own household", async () => {
      const own = await createHouseholdFixture("a");
      signInAs(own.adminUserId);
      const response = await ask({ code: own.joinCode });
      expect(response.status).toBe(409);
      expect(await errorOf(response)).toMatchObject({ code: "already_in_household", message: "You're already in this household" });
    });

    it("uses the details of the member, not the ones sent", async () => {
      const own = await createHouseholdFixture("a");
      const target = await createHouseholdFixture("b");
      const { userId, memberId } = await addAccountMember(own.householdId, own.slotIds);
      await getDb().update(member).set({ dateOfBirth: "1985-06-15" }).where(eq(member.id, memberId));
      signInAs(userId);

      const response = await ask({ code: target.joinCode, you });
      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({ name: "Plain", sex: "male", dateOfBirth: "1985-06-15", status: "pending" });
    });

    it("answers 409 date_of_birth_needed for a member with only an age band", async () => {
      const own = await createHouseholdFixture("a");
      const target = await createHouseholdFixture("b");
      const { userId } = await addAccountMember(own.householdId, own.slotIds);
      signInAs(userId);
      const response = await ask({ code: target.joinCode });
      expect(response.status).toBe(409);
      expect(await errorOf(response)).toMatchObject({
        code: "date_of_birth_needed",
        message: "Add your date of birth in household settings first",
      });
    });

    describe("leaving check", () => {
      let own: Awaited<ReturnType<typeof createHouseholdFixture>>;
      let target: Awaited<ReturnType<typeof createHouseholdFixture>>;

      beforeEach(async () => {
        own = await createHouseholdFixture("a");
        target = await createHouseholdFixture("b");
        await getDb().update(member).set({ dateOfBirth: "1980-02-02" }).where(eq(member.id, own.adminMemberId));
        signInAs(own.adminUserId);
      });

      it("answers 409 last_admin for the only admin of a household with other account members", async () => {
        await addAccountMember(own.householdId, own.slotIds);
        const response = await ask({ code: target.joinCode, confirmDeleteHousehold: true });
        expect(response.status).toBe(409);
        expect(await errorOf(response)).toMatchObject({ code: "last_admin", message: "Make someone else an admin first" });
      });

      it("lets an admin go when another account member is admin too", async () => {
        const other = await addAccountMember(own.householdId, own.slotIds);
        await getDb().update(member).set({ isAdmin: true }).where(eq(member.id, other.memberId));
        expect((await ask({ code: target.joinCode })).status).toBe(201);
      });

      it("counts only members with an account", async () => {
        await getDb()
          .insert(member)
          .values({ householdId: own.householdId, name: "Kid", sex: "male", ageBand: "6-10" });
        expect((await errorOf(await ask({ code: target.joinCode }))).code).toBe("would_delete_household");
      });

      it("answers 409 would_delete_household for the last account member, unless confirmed", async () => {
        const refused = await ask({ code: target.joinCode });
        expect(refused.status).toBe(409);
        const error = await errorOf(refused);
        expect(error.code).toBe("would_delete_household");
        expect(error.message).toContain("House a");
        expect(await getDb().select().from(joinRequest)).toHaveLength(0);

        const confirmed = await ask({ code: target.joinCode, confirmDeleteHousehold: true });
        expect(confirmed.status).toBe(201);
        expect(await getDb().select().from(household)).toHaveLength(2);
      });
    });
  });

  describe("own request", () => {
    let target: Awaited<ReturnType<typeof createHouseholdFixture>>;

    beforeEach(async () => {
      target = await createHouseholdFixture("a");
      await createUser("newcomer");
      signInAs("newcomer");
    });

    it("is null before asking, then the pending request with the household's name", async () => {
      expect(await (await mine()).json()).toBeNull();
      await ask({ code: target.joinCode, you });
      const response = await mine();
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: "pending", householdName: "House a", name: "Nia" });
    });

    it("cancels a pending request, and then 404s", async () => {
      await ask({ code: target.joinCode, you });
      expect((await cancel()).status).toBe(204);
      expect(await (await mine()).json()).toBeNull();
      const [row] = await getDb().select().from(joinRequest);
      expect(row.status).toBe("cancelled");
      const again = await cancel();
      expect(again.status).toBe(404);
      expect((await errorOf(again)).code).toBe("not_found");
      // After cancelling, asking again is allowed.
      expect((await ask({ code: target.joinCode, you })).status).toBe(201);
    });

    it("shows a declined request until it is dismissed", async () => {
      await ask({ code: target.joinCode, you });
      await getDb().update(joinRequest).set({ status: "declined", decidedAt: new Date(), decidedByMemberId: target.adminMemberId });

      const declined = await (await mine()).json();
      expect(declined).toMatchObject({ status: "declined", householdName: "House a" });
      expect((await cancel()).status).toBe(404);

      expect((await dismissMine()).status).toBe(204);
      expect(await (await mine()).json()).toBeNull();
      const [row] = await getDb().select().from(joinRequest);
      expect(row.status).toBe("dismissed");
      expect((await dismissMine()).status).toBe(404);
    });

    it("answers 404 to dismiss when the request is pending", async () => {
      await ask({ code: target.joinCode, you });
      expect((await dismissMine()).status).toBe(404);
    });

    it("shows a new pending request instead of an older declined one", async () => {
      await ask({ code: target.joinCode, you });
      await getDb().update(joinRequest).set({ status: "declined", createdAt: new Date(Date.now() - 60_000) });
      await ask({ code: target.joinCode, you });
      expect((await (await mine()).json()).status).toBe("pending");
    });

    it("never shows another account's request", async () => {
      await ask({ code: target.joinCode, you });
      await createUser("other");
      signInAs("other");
      expect(await (await mine()).json()).toBeNull();
      expect((await cancel()).status).toBe(404);
    });
  });
});
