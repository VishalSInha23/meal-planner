import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// Outside a Next request there is no cookie store: the request has no session.
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

import { route } from "@/lib/http/route";
import { getUser, requireUser } from "./session.ts";

describe("requireUser", () => {
  it("makes a route handler answer 401 in the error shape when there is no session", async () => {
    const handler = route(async () => {
      await requireUser();
      return Response.json({ ok: true });
    });
    const response = await handler(new NextRequest("http://localhost/api/anything"), { params: Promise.resolve({}) });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "unauthorized", message: "Not signed in" } });
  });

  it("redirects a page to /sign-in when there is no session", async () => {
    await expect(requireUser()).rejects.toThrow("redirect:/sign-in");
  });

  it("getUser returns null when there is no session", async () => {
    expect(await getUser()).toBeNull();
  });
});
