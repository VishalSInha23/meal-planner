import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { truncateAll } from "@/test/db";
import { addAccountMember, createHouseholdFixture, createUser, jsonRequest, paramsOf, validOnboarding } from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const signInAs = (id: string) => getSession.mockResolvedValue({ user: { id, name: id, email: `${id}@example.com` } });

import { household, member } from "@/db/schema";
import { GET, PATCH, POST } from "./route.ts";

const post = (body: unknown) => POST(jsonRequest("POST", "/api/household", body), paramsOf());
const patch = (body: unknown) => PATCH(jsonRequest("PATCH", "/api/household", body), paramsOf());
const get = () => GET(jsonRequest("GET", "/api/household"), paramsOf());

describe("/api/household", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("answers 401 when signed out", async () => {
    for (const response of [await get(), await post(validOnboarding()), await patch({ name: "x" })]) {
      expect(response.status).toBe(401);
    }
  });

  it("answers 403 no_household to a signed-in user who has not onboarded", async () => {
    await createUser("new-user");
    signInAs("new-user");
    for (const response of [await get(), await patch({ name: "x" })]) {
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("no_household");
    }
  });

  it("onboards, then reads the household back with each member's slot ids", async () => {
    await createUser("new-user");
    signInAs("new-user");
    const created = await post(validOnboarding());
    expect(created.status).toBe(201);

    const response = await get();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.household.name).toBe("Home");
    expect(body.mealSlots.map((slot: { time: string }) => slot.time)).toEqual(["08:00", "20:00"]);
    expect(body.shoppingTrips).toHaveLength(1);
    expect(body.members.map((item: { name: string; slotIds: string[] }) => [item.name, item.slotIds.length])).toEqual([
      ["Asha", 2],
      ["Ravi", 1],
    ]);
  });

  it("answers 409 already_in_household on a second onboarding", async () => {
    await createUser("new-user");
    signInAs("new-user");
    await post(validOnboarding());
    const second = await post(validOnboarding());
    expect(second.status).toBe(409);
    expect((await second.json()).error.code).toBe("already_in_household");
    expect(await getDb().select().from(household)).toHaveLength(1);
  });

  it("answers 400 naming the fields and creates nothing when a member is invalid", async () => {
    await createUser("new-user");
    signInAs("new-user");
    const input = validOnboarding();
    input.members.push({ name: "", sex: "male", ageBand: "6-10", slotPositions: [0] });
    input.household.weekStartDay = 9;
    const response = await post(input);
    expect(response.status).toBe(400);
    expect(Object.keys((await response.json()).error.fields).toSorted()).toEqual(["household.weekStartDay", "members.1.name"]);
    expect(await getDb().select().from(household)).toHaveLength(0);
    expect(await getDb().select().from(member)).toHaveLength(0);
  });

  it("lets an admin change the settings, and only the given fields", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const response = await patch({ name: "  New name ", weekStartDay: 0 });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: "New name", weekStartDay: 0 });

    const partial = await patch({ weekStartDay: 3 });
    expect(await partial.json()).toMatchObject({ name: "New name", weekStartDay: 3 });
  });

  it("validates the settings", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    for (const body of [
      {},
      { name: "" },
      { name: "x".repeat(61) },
      { weekStartDay: 7 },
      { weekStartDay: -1 },
    ]) {
      expect((await patch(body)).status, JSON.stringify(body)).toBe(400);
    }
    const [row] = await getDb().select().from(household).where(eq(household.id, fixture.householdId));
    expect(row.name).toBe("House a");
  });

  it("answers 403 admin_only to a member who is not an admin", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    signInAs(plain.userId);
    const response = await patch({ name: "Mine now" });
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("admin_only");
    expect((await get()).status).toBe(200);
  });

  it("only ever shows the signed-in user's own household", async () => {
    const a = await createHouseholdFixture("a");
    await createHouseholdFixture("b");
    signInAs(a.adminUserId);
    expect((await (await get()).json()).household.name).toBe("House a");
  });

  it("ignores a household id in the body", async () => {
    const a = await createHouseholdFixture("a");
    const b = await createHouseholdFixture("b");
    signInAs(a.adminUserId);
    expect((await patch({ id: b.householdId, name: "x" })).status).toBe(400);
  });
});
