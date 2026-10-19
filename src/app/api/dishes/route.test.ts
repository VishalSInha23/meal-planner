import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dishIngredient, ingredient } from "@/db/schema";
import { truncateAll } from "@/test/db";
import { createHouseholdFixture, jsonRequest, paramsOf, unknownId } from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const signInAs = (id: string) => getSession.mockResolvedValue({ user: { id, name: id, email: `${id}@example.com` } });

import { GET as listIngredients } from "../ingredients/route.ts";
import { GET, POST } from "./route.ts";
import { DELETE, GET as getOne, PATCH } from "./[id]/route.ts";

const list = (query = "") => GET(jsonRequest("GET", `/api/dishes${query}`), paramsOf());
const post = (body: unknown) => POST(jsonRequest("POST", "/api/dishes", body), paramsOf());
const patch = (id: string, body: unknown) => PATCH(jsonRequest("PATCH", `/api/dishes/${id}`, body), paramsOf(id));
const read = (id: string) => getOne(jsonRequest("GET", `/api/dishes/${id}`), paramsOf(id));
const del = (id: string) => DELETE(jsonRequest("DELETE", `/api/dishes/${id}`), paramsOf(id));
const suggest = (query: string) => listIngredients(jsonRequest("GET", `/api/ingredients?query=${encodeURIComponent(query)}`), paramsOf());
const names = async (response: Response) => ((await response.json()) as { name: string }[]).map((item) => item.name);

describe("/api/dishes", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  async function signedIn(tag = "a") {
    const fixture = await createHouseholdFixture(tag);
    signInAs(fixture.adminUserId);
    return fixture;
  }

  it("answers 401 when signed out", async () => {
    expect((await list()).status).toBe(401);
    expect((await post({ name: "Dal" })).status).toBe(401);
    expect((await suggest("a")).status).toBe(401);
  });

  it("creates a dish with new and existing ingredients, merging duplicates and keeping the stored spelling", async () => {
    const fixture = await signedIn();
    const first = await post({ name: " Dal ", kcalPerServing: 250, proteinGPerServing: 12.5, ingredients: ["Lentils", " Onion "] });
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({
      name: "Dal",
      kcalPerServing: 250,
      proteinGPerServing: 12.5,
      householdId: fixture.householdId,
      ingredients: ["Lentils", "Onion"],
    });

    const second = await post({ name: "Soup", ingredients: ["LENTILS", "lentils", "Carrot", "carrot ", "onion"] });
    expect(second.status).toBe(201);
    const soup = await second.json();
    expect(soup).toMatchObject({ kcalPerServing: null, proteinGPerServing: null });
    expect(soup.ingredients).toEqual(["Carrot", "Lentils", "Onion"]);

    const stored = await getDb().select().from(ingredient).where(eq(ingredient.householdId, fixture.householdId));
    expect(stored.map((row) => row.name).sort()).toEqual(["Carrot", "Lentils", "Onion"]);
    expect(await getDb().select().from(dishIngredient)).toHaveLength(5);
  });

  it("lists dishes by name with a search, and reads one", async () => {
    await signedIn();
    await post({ name: "Rice", ingredients: ["Rice"] });
    const dal = await (await post({ name: "Dal tadka", ingredients: ["Lentils"] })).json();
    await post({ name: "Aloo", ingredients: [] });

    expect(await names(await list())).toEqual(["Aloo", "Dal tadka", "Rice"]);
    expect(await names(await list("?query=AL"))).toEqual(["Aloo", "Dal tadka"]);
    expect(await names(await list("?query=%25"))).toEqual([]);
    expect((await (await list("?query=tadka")).json())[0].ingredients).toEqual(["Lentils"]);
    expect(await (await read(dal.id)).json()).toEqual(dal);
  });

  it("saves names with dashes as spaces and a capital first letter, so a differently typed name is a duplicate and search ignores case", async () => {
    await signedIn();
    const created = await post({ name: "dal-makhani", ingredients: ["spring-onion"] });
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ name: "Dal makhani", ingredients: ["Spring onion"] });

    const duplicate = await post({ name: "Dal Makhani" });
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).error.fields.name).toBe("A dish with this name already exists");
    expect(await names(await list("?query=DAL"))).toEqual(["Dal makhani"]);
    expect((await post({ name: "---" })).status).toBe(400);
  });

  it("edits fields and replaces ingredients", async () => {
    await signedIn();
    const dish = await (await post({ name: "Dal", kcalPerServing: 100, ingredients: ["Lentils", "Onion"] })).json();

    const renamed = await patch(dish.id, { name: "Dal tadka", kcalPerServing: null, ingredients: ["onion", "Garlic"] });
    expect(renamed.status).toBe(200);
    expect(await renamed.json()).toMatchObject({ name: "Dal tadka", kcalPerServing: null, ingredients: ["Garlic", "Onion"] });

    const onlyProtein = await (await patch(dish.id, { proteinGPerServing: 9 })).json();
    expect(onlyProtein).toMatchObject({ proteinGPerServing: 9, ingredients: ["Garlic", "Onion"] });
    expect((await patch(dish.id, { ingredients: [] })).status).toBe(200);
    expect((await (await read(dish.id)).json()).ingredients).toEqual([]);
    expect((await patch(dish.id, {})).status).toBe(400);
  });

  it("answers 409 on the name field for a duplicate", async () => {
    await signedIn();
    await post({ name: "Dal" });
    const other = await (await post({ name: "Rice" })).json();

    const duplicate = await post({ name: "  dal " });
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).error.fields).toEqual({ name: "A dish with this name already exists" });
    const renamed = await patch(other.id, { name: "DAL" });
    expect(renamed.status).toBe(409);
    expect((await renamed.json()).error.fields.name).toBe("A dish with this name already exists");
    expect((await patch(other.id, { name: "Rice" })).status).toBe(200);
  });

  it("deletes a dish, keeps its ingredients and frees the name", async () => {
    await signedIn();
    const dal = await (await post({ name: "Dal", ingredients: ["Lentils", "Onion"] })).json();
    await post({ name: "Rice" });

    expect((await del(dal.id)).status).toBe(204);
    expect(await names(await list())).toEqual(["Rice"]);
    expect((await read(dal.id)).status).toBe(404);
    expect((await del(dal.id)).status).toBe(404);
    expect(await names(await suggest(""))).toEqual(["Lentils", "Onion"]);
    expect(await getDb().select().from(dishIngredient)).toHaveLength(0);

    expect((await post({ name: "dal", ingredients: ["lentils"] })).status).toBe(201);
    expect(await getDb().select().from(ingredient)).toHaveLength(2);
  });

  it("orders ingredient suggestions prefix first, then contains, at most 10", async () => {
    await signedIn();
    await post({ name: "Mix", ingredients: ["Red onion", "Onion", "Spring onion", "Oats", "Garlic", "Onion powder"] });
    expect(await names(await suggest("on"))).toEqual(["Onion", "Onion powder", "Red onion", "Spring onion"]);
    expect(await names(await suggest("ONION"))).toEqual(["Onion", "Onion powder", "Red onion", "Spring onion"]);
    expect(await names(await suggest("zzz"))).toEqual([]);
    expect(await names(await suggest("o_"))).toEqual([]);
    expect(await names(await suggest(""))).toEqual(["Garlic", "Oats", "Onion", "Onion powder", "Red onion", "Spring onion"]);

    await post({ name: "Many", ingredients: Array.from({ length: 12 }, (_, index) => `Herb ${String(index).padStart(2, "0")}`) });
    expect(await suggest("herb").then(names)).toHaveLength(10);
  });

  it("answers 404 for another household's dish and shows nothing of it in lists", async () => {
    const other = await createHouseholdFixture("b");
    signInAs(other.adminUserId);
    const theirs = await (await post({ name: "Secret", ingredients: ["Saffron"] })).json();

    await signedIn("a");
    expect((await read(theirs.id)).status).toBe(404);
    expect((await patch(theirs.id, { name: "Mine" })).status).toBe(404);
    expect((await del(theirs.id)).status).toBe(404);
    expect((await read(unknownId())).status).toBe(404);
    expect((await read("not-a-uuid")).status).toBe(404);
    expect(await names(await list())).toEqual([]);
    expect(await names(await suggest("saf"))).toEqual([]);
    // The same name is free in this household.
    expect((await post({ name: "Secret", ingredients: ["saffron"] })).status).toBe(201);
    expect(await getDb().select().from(ingredient)).toHaveLength(2);
  });

  it("validates name, kcal, protein and ingredients", async () => {
    await signedIn();
    for (const body of [
      { name: "" },
      { name: "   " },
      { name: "x".repeat(81) },
      { name: "Dal", kcalPerServing: -1 },
      { name: "Dal", kcalPerServing: 5001 },
      { name: "Dal", kcalPerServing: 250.5 },
      { name: "Dal", kcalPerServing: "250" },
      { name: "Dal", proteinGPerServing: -0.1 },
      { name: "Dal", proteinGPerServing: 300.1 },
      { name: "Dal", proteinGPerServing: 12.25 },
      { name: "Dal", ingredients: [""] },
      { name: "Dal", ingredients: ["x".repeat(61)] },
      { name: "Dal", ingredients: "Onion" },
      { name: "Dal", extra: true },
    ]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    const bad = await post({ name: "Dal", kcalPerServing: 9999, proteinGPerServing: 1.25 });
    expect(Object.keys((await bad.json()).error.fields).sort()).toEqual(["kcalPerServing", "proteinGPerServing"]);

    for (const body of [
      { name: "a".repeat(80), kcalPerServing: 0, proteinGPerServing: 0 },
      { name: "b", kcalPerServing: 5000, proteinGPerServing: 300 },
      { name: "c", proteinGPerServing: 0.1, ingredients: ["x".repeat(60)] },
    ]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(201);
    }
  });
});
