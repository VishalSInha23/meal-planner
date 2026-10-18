import { beforeEach, describe, expect, it, vi } from "vitest";
import { truncateAll } from "@/test/db";
import { addAccountMember, createHouseholdFixture, createUser } from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const signInAs = (id: string) => getSession.mockResolvedValue({ user: { id, name: id, email: `${id}@example.com` } });

import { NextRequest } from "next/server";
import { route } from "@/lib/http/route";

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

import { requireAdmin, requireMember } from "./session.ts";

describe("requireMember and requireAdmin", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("redirects a page to /onboarding when the account has no household", async () => {
    await createUser("new-user");
    signInAs("new-user");
    await expect(requireMember()).rejects.toThrow("redirect:/onboarding");
    await expect(requireAdmin()).rejects.toThrow("redirect:/onboarding");
  });

  it("redirects a signed-out page to /sign-in", async () => {
    await expect(requireMember()).rejects.toThrow("redirect:/sign-in");
  });

  it("answers a route handler with 403 no_household", async () => {
    await createUser("new-user");
    signInAs("new-user");
    const handler = route(async () => {
      await requireMember();
      return Response.json({ ok: true });
    });
    const response = await handler(new NextRequest("http://localhost/api/x"), { params: Promise.resolve({}) });
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("no_household");
  });

  it("returns the member with its household", async () => {
    const fixture = await createHouseholdFixture("a");
    signInAs(fixture.adminUserId);
    const current = await requireMember();
    expect(current).toMatchObject({ id: fixture.adminMemberId, isAdmin: true, household: { id: fixture.householdId, name: "House a" } });
    expect(await requireAdmin()).toMatchObject({ id: fixture.adminMemberId });
  });

  it("makes requireAdmin throw admin_only for a member who is not an admin", async () => {
    const fixture = await createHouseholdFixture("a");
    const plain = await addAccountMember(fixture.householdId, fixture.slotIds);
    signInAs(plain.userId);
    await expect(requireMember()).resolves.toMatchObject({ id: plain.memberId });
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403, code: "admin_only" });
  });
});
