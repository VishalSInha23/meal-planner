import { beforeEach, describe, expect, it, vi } from "vitest";
import { truncateAll } from "@/test/db";
import { addAccountMember, createHouseholdFixture, createUser, jsonRequest, paramsOf } from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const signInAs = (id: string) => getSession.mockResolvedValue({ user: { id, name: id, email: `${id}@example.com` } });

import { POST as ask } from "../../join-requests/route.ts";
import { GET, POST } from "./route.ts";

const get = () => GET(jsonRequest("GET", "/api/household/join-code"), paramsOf());
const regenerate = () => POST(jsonRequest("POST", "/api/household/join-code"), paramsOf());

describe("/api/household/join-code", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("answers 401 when signed out", async () => {
    for (const response of [await get(), await regenerate()]) expect(response.status).toBe(401);
  });

  it("gives an admin the code of the household", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const response = await get();
    expect(response.status).toBe(200);
    const { code } = await response.json();
    expect(code).toBe(fixture.joinCode);
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("answers 403 admin_only to a member who is not an admin", async () => {
    const fixture = await createHouseholdFixture("a");
    const { userId } = await addAccountMember(fixture.householdId, fixture.slotIds);
    signInAs(userId);
    for (const response of [await get(), await regenerate()]) {
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("admin_only");
    }
  });

  it("answers 403 no_household to an account without a household", async () => {
    await createUser("new-user");
    signInAs("new-user");
    expect((await get()).status).toBe(403);
  });

  it("regenerates the code, and the old code stops working", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const response = await regenerate();
    expect(response.status).toBe(200);
    const { code } = await response.json();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
    expect(code).not.toBe(fixture.joinCode);
    expect((await (await get()).json()).code).toBe(code);

    await createUser("newcomer");
    signInAs("newcomer");
    const you = { name: "Nia", sex: "female", dateOfBirth: "1990-01-01" };
    const old = await ask(jsonRequest("POST", "/api/join-requests", { code: fixture.joinCode, you }), paramsOf());
    expect(old.status).toBe(404);
    expect((await old.json()).error.code).toBe("unknown_code");
    const fresh = await ask(jsonRequest("POST", "/api/join-requests", { code, you }), paramsOf());
    expect(fresh.status).toBe(201);
  });
});
