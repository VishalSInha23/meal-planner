import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { user, userPreference } from "@/db/schema";
import { truncateAll } from "@/test/db";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

import { GET, PUT } from "./route.ts";

const params = { params: Promise.resolve({}) };
const put = (body: unknown) =>
  PUT(
    new NextRequest("http://localhost/api/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    params,
  );
const get = () => GET(new NextRequest("http://localhost/api/preferences"), params);

const setCookies = (response: Response) => response.headers.getSetCookie();
const cookieValue = (response: Response, name: string) =>
  setCookies(response)
    .find((line) => line.startsWith(`${name}=`))
    ?.split(";")[0]
    .slice(name.length + 1);

async function signIn(id = "user-1") {
  await getDb().insert(user).values({ id, name: "Test", email: `${id}@example.com` });
  getSession.mockResolvedValue({ user: { id, name: "Test", email: `${id}@example.com` } });
}

describe("/api/preferences", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("answers 401 when signed out", async () => {
    for (const response of [await get(), await put({ theme: "dark" })]) {
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("unauthorized");
    }
  });

  it("returns the defaults before anything is saved", async () => {
    await signIn();
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ theme: null, fontStyle: null });
  });

  it("answers 400 naming the field on an invalid value", async () => {
    await signIn();
    const response = await put({ theme: "blue" });
    expect(response.status).toBe(400);
    expect(Object.keys((await response.json()).error.fields)).toEqual(["theme"]);
    expect((await put({ theme: "system" })).status).toBe(400);
    expect((await put({ fontStyle: "mono" })).status).toBe(400);
    expect((await put({})).status).toBe(400);
    expect((await put({ theme: "dark", extra: 1 })).status).toBe(400);
    expect(await getDb().select().from(userPreference)).toHaveLength(0);
  });

  it("creates the row, then changes only the given fields", async () => {
    await signIn();
    const created = await put({ fontStyle: "sans" });
    expect(created.status).toBe(200);
    expect(await created.json()).toEqual({ theme: null, fontStyle: "sans" });

    const updated = await put({ theme: "dark" });
    expect(await updated.json()).toEqual({ theme: "dark", fontStyle: "sans" });
    expect(await (await get()).json()).toEqual({ theme: "dark", fontStyle: "sans" });

    const reset = await put({ fontStyle: null });
    expect(await reset.json()).toEqual({ theme: "dark", fontStyle: null });
    expect(await getDb().select().from(userPreference).where(eq(userPreference.userId, "user-1"))).toHaveLength(1);
  });

  it("keeps each user's preferences apart", async () => {
    await signIn("user-1");
    await put({ theme: "dark" });
    await signIn("user-2");
    expect(await (await get()).json()).toEqual({ theme: null, fontStyle: null });
  });

  it("sets the theme and font cookies for a year", async () => {
    await signIn();
    const response = await put({ theme: "light", fontStyle: "sans" });
    expect(cookieValue(response, "theme")).toBe("light");
    expect(cookieValue(response, "font")).toBe("sans");
    const setCookie = setCookies(response).join("\n");
    expect(setCookie).toMatch(/theme=light;.*Max-Age=31536000/);
    expect(setCookie).toMatch(/SameSite=lax/i);
  });

  it("sets the font cookie to the brand default when the font style is reset", async () => {
    await signIn();
    const response = await put({ theme: "dark" });
    expect(cookieValue(response, "font")).toBe("serif");
  });

  it("sets no theme cookie while no theme is chosen", async () => {
    await signIn();
    const response = await put({ fontStyle: "sans" });
    expect(cookieValue(response, "theme") ?? "").toBe("");
    expect(cookieValue(response, "font")).toBe("sans");
  });
});
