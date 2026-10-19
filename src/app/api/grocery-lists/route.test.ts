import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { dish, dishIngredient, groceryCheck, ingredient } from "@/db/schema";
import { truncateAll } from "@/test/db";
import { createHouseholdFixture, jsonRequest, paramsOf, unknownId } from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

import { addDishToMeal } from "@/modules/meal/meal-service";
import { GET as getLists } from "./route.ts";
import { PUT as putCheck } from "./[key]/checks/[ingredientId]/route.ts";

const KEY = "2026-10-19:0";
const check = (key: string, ingredientId: string, body: unknown) =>
  putCheck(jsonRequest("PUT", `/api/grocery-lists/${encodeURIComponent(key)}/checks/${ingredientId}`, body), {
    params: Promise.resolve({ key, ingredientId }),
  } as never);

async function householdWithIngredient(tag: string) {
  const fixture = await createHouseholdFixture(tag);
  const db = getDb();
  const [{ id: dishId }] = await db.insert(dish).values({ householdId: fixture.householdId, name: "Dal" }).returning({ id: dish.id });
  const [{ id: ingredientId }] = await db
    .insert(ingredient)
    .values({ householdId: fixture.householdId, name: "dal" })
    .returning({ id: ingredient.id });
  await db.insert(dishIngredient).values({ dishId, ingredientId });
  return { ...fixture, dishId, ingredientId };
}

describe("/api/grocery-lists", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  const signInAs = (id: string) => getSession.mockResolvedValue({ user: { id, name: id, email: `${id}@example.com` } });

  it("answers 401 when signed out", async () => {
    expect((await getLists(jsonRequest("GET", "/api/grocery-lists"), paramsOf())).status).toBe(401);
    expect((await check(KEY, unknownId(), { checked: true })).status).toBe(401);
  });

  it("returns the lists with the ticks, for the signed-in household only", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 21, 12) });
    try {
      const mine = await householdWithIngredient("a");
      const theirs = await householdWithIngredient("b");
      await addDishToMeal(mine.householdId, { date: "2026-10-21", mealSlotId: mine.slotIds[0], dishId: mine.dishId });
      await addDishToMeal(theirs.householdId, { date: "2026-10-21", mealSlotId: theirs.slotIds[0], dishId: theirs.dishId });
      signInAs(mine.adminUserId);

      expect((await check(KEY, mine.ingredientId, { checked: true })).status).toBe(200);
      const body = await (await getLists(jsonRequest("GET", "/api/grocery-lists"), paramsOf())).json();
      expect(body.current.key).toBe("2026-10-19:0");
      expect(body.current.items).toEqual([{ ingredientId: mine.ingredientId, name: "dal", dishNames: ["Dal"], checked: true }]);
      expect(body.previous).toBeInstanceOf(Array);
      expect(body.upcoming).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ticks idempotently and answers with the new state", async () => {
    const fixture = await householdWithIngredient("a");
    signInAs(fixture.adminUserId);
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await check(KEY, fixture.ingredientId, { checked: true });
      expect(await response.json()).toEqual({ key: KEY, ingredientId: fixture.ingredientId, checked: true });
    }
    expect(await getDb().select().from(groceryCheck)).toHaveLength(1);
    expect((await check(KEY, fixture.ingredientId, { checked: false })).status).toBe(200);
    expect(await getDb().select().from(groceryCheck)).toHaveLength(0);
  });

  it("answers 400 for a bad body or key, and 404 for an ingredient of another household or a bad id", async () => {
    const mine = await householdWithIngredient("a");
    const theirs = await householdWithIngredient("b");
    signInAs(mine.adminUserId);

    expect((await check(KEY, mine.ingredientId, { checked: "yes" })).status).toBe(400);
    expect((await check(KEY, mine.ingredientId, undefined)).status).toBe(400);
    const badKey = await check("tomorrow", mine.ingredientId, { checked: true });
    expect(badKey.status).toBe(400);
    expect((await badKey.json()).error.fields.key).toBeTruthy();

    expect((await check(KEY, theirs.ingredientId, { checked: true })).status).toBe(404);
    expect((await check(KEY, "not-a-uuid", { checked: true })).status).toBe(404);
    expect(await getDb().select().from(groceryCheck)).toHaveLength(0);
  });
});
