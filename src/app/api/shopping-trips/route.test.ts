import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { truncateAll } from "@/test/db";
import { addAccountMember, createHouseholdFixture, jsonRequest, paramsOf, unknownId } from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const signInAs = (id: string) => getSession.mockResolvedValue({ user: { id, name: id, email: `${id}@example.com` } });

import { shoppingTrip } from "@/db/schema";
import { POST } from "./route.ts";
import { DELETE } from "./[id]/route.ts";

const post = (body: unknown) => POST(jsonRequest("POST", "/api/shopping-trips", body), paramsOf());
const del = (id: string) => DELETE(jsonRequest("DELETE", `/api/shopping-trips/${id}`), paramsOf(id));

describe("/api/shopping-trips", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("answers 401 when signed out", async () => {
    expect((await post({ dayOfWeek: 6, time: "10:00" })).status).toBe(401);
  });

  it("creates and deletes a trip", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const created = await post({ dayOfWeek: 6, time: "10:00" });
    expect(created.status).toBe(201);
    const trip = await created.json();
    expect(trip).toMatchObject({ dayOfWeek: 6, time: "10:00", householdId: fixture.householdId });
    expect((await del(trip.id)).status).toBe(204);
    expect(await getDb().select().from(shoppingTrip)).toHaveLength(0);
  });

  it("validates the day and time", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    for (const body of [
      { dayOfWeek: 7, time: "10:00" },
      { dayOfWeek: -1, time: "10:00" },
      { dayOfWeek: 1.5, time: "10:00" },
      { dayOfWeek: "1", time: "10:00" },
      { dayOfWeek: 1, time: "24:00" },
      { dayOfWeek: 1 },
    ]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect((await post({ dayOfWeek: 0, time: "00:00" })).status).toBe(201);
  });

  it("answers 409 for the same day and time, but allows the same time on another day", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    await post({ dayOfWeek: 6, time: "10:00" });
    const again = await post({ dayOfWeek: 6, time: "10:00" });
    expect(again.status).toBe(409);
    expect(Object.keys((await again.json()).error.fields)).toEqual(["time"]);
    expect((await post({ dayOfWeek: 5, time: "10:00" })).status).toBe(201);
  });

  it("answers 403 admin_only to a member who is not an admin", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    signInAs(plain.userId);
    const response = await post({ dayOfWeek: 6, time: "10:00" });
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("admin_only");
    expect((await del(unknownId())).status).toBe(403);
  });

  it("answers 404 for another household's trip", async () => {
    const a = await createHouseholdFixture("a");
    const b = await createHouseholdFixture("b");
    signInAs(b.adminUserId);
    const trip = await (await post({ dayOfWeek: 2, time: "09:00" })).json();
    signInAs(a.adminUserId);
    const response = await del(trip.id);
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");
    expect(await getDb().select().from(shoppingTrip)).toHaveLength(1);
    expect((await del(unknownId())).status).toBe(404);
  });
});
