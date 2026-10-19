import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { truncateAll } from "@/test/db";
import { createHouseholdFixture, jsonRequest, paramsOf, unknownId, type Fixture } from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const signInAs = (id: string) => getSession.mockResolvedValue({ user: { id, name: id, email: `${id}@example.com` } });

import { dish, meal, mealDish, mealDishMember, member, memberMealSlot, weekPlan } from "@/db/schema";
import { DELETE as deleteSlot } from "../meal-slots/[id]/route.ts";
import { POST as postMealDish } from "../meal-dishes/route.ts";
import { DELETE as deleteMealDish } from "../meal-dishes/[id]/route.ts";
import { PUT as putMember } from "../meal-dishes/[id]/members/[memberId]/route.ts";
import { DELETE as deleteDish } from "../dishes/[id]/route.ts";
import { GET as getCurrent } from "./current/route.ts";
import { GET as getWeek } from "./[weekStart]/route.ts";
import { DELETE as unplan, PUT as plan } from "./[weekStart]/planned/route.ts";

const MONDAY = "2026-10-19";
const THURSDAY = "2026-10-22";

const week = (weekStart: string) =>
  getWeek(jsonRequest("GET", `/api/weeks/${weekStart}`), { params: Promise.resolve({ weekStart }) } as never);
const putPlanned = (weekStart: string) =>
  plan(jsonRequest("PUT", `/api/weeks/${weekStart}/planned`), { params: Promise.resolve({ weekStart }) } as never);
const deletePlanned = (weekStart: string) =>
  unplan(jsonRequest("DELETE", `/api/weeks/${weekStart}/planned`), { params: Promise.resolve({ weekStart }) } as never);
const addDish = (body: unknown) => postMealDish(jsonRequest("POST", "/api/meal-dishes", body), paramsOf());
const removeFromMeal = (id: string) => deleteMealDish(jsonRequest("DELETE", `/api/meal-dishes/${id}`), paramsOf(id));
const tick = (id: string, memberId: string, body: unknown) =>
  putMember(jsonRequest("PUT", `/api/meal-dishes/${id}/members/${memberId}`, body), {
    params: Promise.resolve({ id, memberId }),
  } as never);
const removeSlot = (id: string) => deleteSlot(jsonRequest("DELETE", `/api/meal-slots/${id}`), paramsOf(id));
const removeDish = (id: string) => deleteDish(jsonRequest("DELETE", `/api/dishes/${id}`), paramsOf(id));

interface Setup extends Fixture {
  breakfast: string;
  lunch: string;
  plainId: string;
  sonId: string;
  dishes: Record<"rice" | "dal" | "curry" | "roti" | "plain", string>;
}

// Slots: breakfast and lunch. The admin (target 2000 kcal, 60 g) and Plain eat in both; the son eats only at breakfast.
async function setup(tag = "a"): Promise<Setup> {
  const fixture = await createHouseholdFixture(tag);
  const db = getDb();
  await db.update(member).set({ kcalTarget: 2000, proteinTargetG: "60.0" }).where(eq(member.id, fixture.adminMemberId));
  const [plain, son] = await db
    .insert(member)
    .values([
      { householdId: fixture.householdId, name: "Plain", sex: "male", ageBand: "36-40" },
      { householdId: fixture.householdId, name: "Son", sex: "male", ageBand: "6-10" },
    ])
    .returning({ id: member.id });
  const [breakfast, lunch] = fixture.slotIds;
  await db.insert(memberMealSlot).values([
    { memberId: plain.id, mealSlotId: breakfast },
    { memberId: plain.id, mealSlotId: lunch },
    { memberId: son.id, mealSlotId: breakfast },
  ]);
  const rows = await db
    .insert(dish)
    .values([
      { householdId: fixture.householdId, name: "Rice", kcalPerServing: 200, proteinGPerServing: "4.0" },
      { householdId: fixture.householdId, name: "Dal", kcalPerServing: 150, proteinGPerServing: "9.0" },
      { householdId: fixture.householdId, name: "Cauliflower curry", kcalPerServing: 100, proteinGPerServing: "3.0" },
      { householdId: fixture.householdId, name: "Roti", kcalPerServing: 120, proteinGPerServing: "3.5" },
      { householdId: fixture.householdId, name: "Plain bread" },
    ])
    .returning({ id: dish.id });
  const [rice, dal, curry, roti, bread] = rows.map((row) => row.id);
  return {
    ...fixture,
    breakfast,
    lunch,
    plainId: plain.id,
    sonId: son.id,
    dishes: { rice, dal, curry, roti, plain: bread },
  };
}

describe("/api/weeks and /api/meal-dishes", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function signedIn(tag = "a") {
    const setupResult = await setup(tag);
    signInAs(setupResult.adminUserId);
    return setupResult;
  }

  it("answers 401 when signed out", async () => {
    expect((await getCurrent(jsonRequest("GET", "/api/weeks/current"), paramsOf())).status).toBe(401);
    expect((await week(MONDAY)).status).toBe(401);
    expect((await putPlanned(MONDAY)).status).toBe(401);
    expect((await deletePlanned(MONDAY)).status).toBe(401);
    expect((await addDish({})).status).toBe(401);
    expect((await removeFromMeal(unknownId())).status).toBe(401);
    expect((await tick(unknownId(), unknownId(), { eats: true })).status).toBe(401);
  });

  it("gives the current week, and the next one on the planning deadline", async () => {
    await signedIn();
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 24, 12) });
    expect(await (await getCurrent(jsonRequest("GET", "/api/weeks/current"), paramsOf())).json()).toEqual({ weekStart: MONDAY });
    vi.setSystemTime(new Date(2026, 9, 25, 12));
    expect(await (await getCurrent(jsonRequest("GET", "/api/weeks/current"), paramsOf())).json()).toEqual({ weekStart: "2026-10-26" });
  });

  it("returns an empty week with its dates, slots in time order and a nutrition entry per member per day", async () => {
    const fixture = await signedIn();
    const response = await week(MONDAY);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.weekStart).toBe(MONDAY);
    expect(body.dates).toHaveLength(7);
    expect(body.dates[0]).toBe(MONDAY);
    expect(body.dates[6]).toBe("2026-10-25");
    expect(body.mealSlots.map((slot: { id: string }) => slot.id)).toEqual(fixture.slotIds);
    expect(body.meals).toEqual([]);
    expect(body.planned).toBeNull();
    expect(body.nutrition).toHaveLength(21);
  });

  it("adds a dish ticked for exactly the members who eat in the slot", async () => {
    const s = await signedIn();
    const lunch = await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.rice });
    expect(lunch.status).toBe(201);
    const added = await lunch.json();
    expect(added).toMatchObject({ dishId: s.dishes.rice, name: "Rice", date: THURSDAY, mealSlotId: s.lunch });
    expect([...added.memberIds].sort()).toEqual([s.adminMemberId, s.plainId].sort());

    const breakfast = await (await addDish({ date: THURSDAY, mealSlotId: s.breakfast, dishId: s.dishes.rice })).json();
    expect([...breakfast.memberIds].sort()).toEqual([s.adminMemberId, s.plainId, s.sonId].sort());
    expect(await getDb().select().from(meal)).toHaveLength(2);
  });

  it("adds a dish by a new name, creating the dish, and 409s on an existing name", async () => {
    const s = await signedIn();
    const created = await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishName: " pasta-bake " });
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ name: "Pasta bake", kcalPerServing: null, proteinGPerServing: null });
    expect(await getDb().select().from(dish).where(eq(dish.name, "Pasta bake"))).toHaveLength(1);

    const duplicate = await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishName: "rice" });
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).error.fields.name).toBe("A dish with this name already exists");
    // The failed add leaves no empty meal behind.
    expect(await getDb().select().from(meal)).toHaveLength(1);
  });

  it("answers 409 dish_already_in_meal for a dish that is already there", async () => {
    const s = await signedIn();
    await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.rice });
    const again = await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.rice });
    expect(again.status).toBe(409);
    expect((await again.json()).error.code).toBe("dish_already_in_meal");
    expect(await getDb().select().from(mealDish)).toHaveLength(1);
    // The same dish in another slot or on another day is fine.
    expect((await addDish({ date: THURSDAY, mealSlotId: s.breakfast, dishId: s.dishes.rice })).status).toBe(201);
    expect((await addDish({ date: "2026-10-23", mealSlotId: s.lunch, dishId: s.dishes.rice })).status).toBe(201);
  });

  it("validates the add input", async () => {
    const s = await signedIn();
    for (const body of [
      {},
      { date: THURSDAY, mealSlotId: s.lunch },
      { date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.rice, dishName: "Both" },
      { date: "2026-02-30", mealSlotId: s.lunch, dishId: s.dishes.rice },
      { date: THURSDAY, mealSlotId: "nope", dishId: s.dishes.rice },
      { date: THURSDAY, mealSlotId: s.lunch, dishName: "  " },
    ]) {
      expect((await addDish(body)).status, JSON.stringify(body)).toBe(400);
    }
  });

  it("ticks and unticks idempotently, and any household member can be ticked", async () => {
    const s = await signedIn();
    const added = await (await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.roti })).json();

    // The son doesn't eat in this slot but can be ticked.
    for (let attempt = 0; attempt < 2; attempt++) {
      const ticked = await tick(added.id, s.sonId, { eats: true });
      expect(ticked.status).toBe(200);
      expect(await ticked.json()).toEqual({ mealDishId: added.id, memberId: s.sonId, eats: true });
    }
    expect(await getDb().select().from(mealDishMember).where(eq(mealDishMember.memberId, s.sonId))).toHaveLength(1);

    for (let attempt = 0; attempt < 2; attempt++) expect((await tick(added.id, s.adminMemberId, { eats: false })).status).toBe(200);
    const stored = await getDb().select().from(mealDishMember);
    expect(stored.map((row) => row.memberId).sort()).toEqual([s.plainId, s.sonId].sort());

    expect((await tick(added.id, s.sonId, { eats: "yes" })).status).toBe(400);
    expect((await tick(added.id, s.sonId, {})).status).toBe(400);
  });

  it("answers 404 for ids from another household or unknown ids", async () => {
    const other = await setup("b");
    const s = await signedIn("a");
    const mine = await (await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.rice })).json();

    expect((await addDish({ date: THURSDAY, mealSlotId: other.lunch, dishId: s.dishes.rice })).status).toBe(404);
    expect((await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: other.dishes.rice })).status).toBe(404);
    expect((await addDish({ date: THURSDAY, mealSlotId: unknownId(), dishId: s.dishes.rice })).status).toBe(404);
    expect((await tick(mine.id, other.adminMemberId, { eats: true })).status).toBe(404);
    expect((await tick(mine.id, unknownId(), { eats: true })).status).toBe(404);
    expect((await tick(unknownId(), s.sonId, { eats: true })).status).toBe(404);
    expect((await tick("not-a-uuid", s.sonId, { eats: true })).status).toBe(404);
    expect(await getDb().select().from(meal)).toHaveLength(1);

    // Another household's meal dish.
    signInAs(other.adminUserId);
    const theirs = await (await addDish({ date: THURSDAY, mealSlotId: other.lunch, dishId: other.dishes.rice })).json();
    signInAs(s.adminUserId);
    expect((await tick(theirs.id, s.sonId, { eats: true })).status).toBe(404);
    expect((await removeFromMeal(theirs.id)).status).toBe(404);
    expect(await getDb().select().from(mealDish).where(eq(mealDish.id, theirs.id))).toHaveLength(1);
    expect((await removeFromMeal(unknownId())).status).toBe(404);
  });

  it("removes a dish, and the meal when it was the last dish", async () => {
    const s = await signedIn();
    const rice = await (await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.rice })).json();
    const dal = await (await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.dal })).json();

    expect((await removeFromMeal(rice.id)).status).toBe(204);
    expect(await getDb().select().from(meal)).toHaveLength(1);
    expect(await getDb().select().from(mealDishMember)).toHaveLength(2);
    expect((await removeFromMeal(rice.id)).status).toBe(404);

    expect((await removeFromMeal(dal.id)).status).toBe(204);
    expect(await getDb().select().from(meal)).toHaveLength(0);
    expect(await getDb().select().from(mealDishMember)).toHaveLength(0);
    expect((await (await week(MONDAY)).json()).meals).toEqual([]);
  });

  it("removes a deleted dish from every meal and from the nutrition", async () => {
    const s = await signedIn();
    await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.rice });
    await addDish({ date: "2026-10-23", mealSlotId: s.breakfast, dishId: s.dishes.rice });
    await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.dal });

    expect((await removeDish(s.dishes.rice)).status).toBe(204);
    const body = await (await week(MONDAY)).json();
    expect(body.meals).toHaveLength(1);
    expect(body.meals[0].dishes.map((item: { name: string }) => item.name)).toEqual(["Dal"]);
    const admin = body.nutrition.find((item: { memberId: string; date: string }) => item.memberId === s.adminMemberId && item.date === THURSDAY);
    expect(admin).toMatchObject({ kcal: 150, proteinG: 9 });
    // The Friday meal held only rice, so it is not left empty.
    expect(await getDb().select().from(meal)).toHaveLength(1);
    expect(await getDb().select().from(mealDish)).toHaveLength(1);
  });

  it("returns the nutrition of the spec's Thursday lunch example", async () => {
    const s = await signedIn();
    const add = async (dishId: string) => (await (await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId })).json()).id as string;
    const rice = await add(s.dishes.rice);
    const dal = await add(s.dishes.dal);
    const curry = await add(s.dishes.curry);
    const roti = await add(s.dishes.roti);
    // Rice and dal for the parents, cauliflower curry for everyone, roti only for the son.
    await tick(curry, s.sonId, { eats: true });
    await tick(roti, s.adminMemberId, { eats: false });
    await tick(roti, s.plainId, { eats: false });
    await tick(roti, s.sonId, { eats: true });
    expect(rice && dal).toBeTruthy();

    const body = await (await week(MONDAY)).json();
    expect(body.meals).toHaveLength(1);
    expect(body.meals[0]).toMatchObject({ date: THURSDAY, mealSlotId: s.lunch });
    const dishes = body.meals[0].dishes as { name: string; memberIds: string[] }[];
    expect(dishes.map((item) => item.name)).toEqual(["Rice", "Dal", "Cauliflower curry", "Roti"]);
    const ids = (name: string) => [...dishes.find((item) => item.name === name)!.memberIds].sort();
    expect(ids("Rice")).toEqual([s.adminMemberId, s.plainId].sort());
    expect(ids("Cauliflower curry")).toEqual([s.adminMemberId, s.plainId, s.sonId].sort());
    expect(ids("Roti")).toEqual([s.sonId]);

    const day = (memberId: string, date = THURSDAY) =>
      body.nutrition.find((item: { memberId: string; date: string }) => item.memberId === memberId && item.date === date);
    // 200 + 150 + 100 kcal and 4 + 9 + 3 g for the parents; 100 + 120 kcal and 3 + 3.5 g for the son.
    expect(day(s.adminMemberId)).toMatchObject({
      kcal: 450,
      proteinG: 16,
      dishesWithoutKcal: 0,
      dishesWithoutProtein: 0,
      kcalStatus: { status: "under", difference: 1550 },
      proteinStatus: { status: "under", difference: 44 },
    });
    expect(day(s.plainId)).toMatchObject({ kcal: 450, proteinG: 16, kcalStatus: null, proteinStatus: null });
    expect(day(s.sonId)).toMatchObject({ kcal: 220, proteinG: 6.5 });
    expect(day(s.sonId, "2026-10-21")).toMatchObject({ kcal: 0, proteinG: 0 });
  });

  it("counts dishes without values and notes them", async () => {
    const s = await signedIn();
    await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.plain });
    await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.rice });
    const body = await (await week(MONDAY)).json();
    const admin = body.nutrition.find((item: { memberId: string; date: string }) => item.memberId === s.adminMemberId && item.date === THURSDAY);
    expect(admin).toMatchObject({ kcal: 200, proteinG: 4, dishesWithoutKcal: 1, dishesWithoutProtein: 1 });
  });

  it("only shows the meals of the requested week", async () => {
    const s = await signedIn();
    await addDish({ date: "2026-10-25", mealSlotId: s.lunch, dishId: s.dishes.rice });
    await addDish({ date: "2026-10-26", mealSlotId: s.lunch, dishId: s.dishes.dal });
    expect((await (await week(MONDAY)).json()).meals.map((item: { date: string }) => item.date)).toEqual(["2026-10-25"]);
    expect((await (await week("2026-10-26")).json()).meals.map((item: { date: string }) => item.date)).toEqual(["2026-10-26"]);
  });

  it("orders meals by date then slot time", async () => {
    const s = await signedIn();
    await addDish({ date: "2026-10-21", mealSlotId: s.lunch, dishId: s.dishes.rice });
    await addDish({ date: "2026-10-21", mealSlotId: s.breakfast, dishId: s.dishes.rice });
    await addDish({ date: "2026-10-20", mealSlotId: s.lunch, dishId: s.dishes.rice });
    const meals = (await (await week(MONDAY)).json()).meals as { date: string; mealSlotId: string }[];
    expect(meals.map((item) => [item.date, item.mealSlotId])).toEqual([
      ["2026-10-20", s.lunch],
      ["2026-10-21", s.breakfast],
      ["2026-10-21", s.lunch],
    ]);
  });

  it("refuses to delete a slot that meals use, saying how many", async () => {
    const s = await signedIn();
    await addDish({ date: THURSDAY, mealSlotId: s.lunch, dishId: s.dishes.rice });
    await addDish({ date: "2026-10-23", mealSlotId: s.lunch, dishId: s.dishes.rice });
    const refused = await removeSlot(s.lunch);
    expect(refused.status).toBe(409);
    expect((await refused.json()).error).toEqual({ code: "slot_in_use", message: "Used by 2 meals" });

    await removeFromMeal((await getDb().select().from(mealDish))[0].id);
    const one = await removeSlot(s.lunch);
    expect((await one.json()).error.message).toBe("Used by 1 meal");

    await getDb().delete(meal);
    expect((await removeSlot(s.lunch)).status).toBe(204);
  });

  it("marks a week planned and unmarks it", async () => {
    const s = await signedIn();
    const marked = await putPlanned(MONDAY);
    expect(marked.status).toBe(200);
    const planned = await marked.json();
    expect(planned).toMatchObject({ byMemberId: s.adminMemberId, byName: "Admin" });
    expect(new Date(planned.at).getTime()).toBeGreaterThan(Date.now() - 60_000);
    expect((await (await week(MONDAY)).json()).planned).toEqual(planned);
    expect((await (await week("2026-10-26")).json()).planned).toBeNull();

    // Pressing it again keeps the first mark.
    expect(await (await putPlanned(MONDAY)).json()).toEqual(planned);
    expect(await getDb().select().from(weekPlan)).toHaveLength(1);

    expect((await deletePlanned(MONDAY)).status).toBe(204);
    expect((await deletePlanned(MONDAY)).status).toBe(204);
    expect((await (await week(MONDAY)).json()).planned).toBeNull();
    expect(await getDb().select().from(weekPlan)).toHaveLength(0);
  });

  it("keeps the mark when the member who made it is removed", async () => {
    const s = await signedIn();
    await putPlanned(MONDAY);
    await getDb().delete(member).where(eq(member.id, s.plainId));
    const marked = await getDb().update(weekPlan).set({ plannedByMemberId: null }).returning();
    expect(marked).toHaveLength(1);
    expect((await (await week(MONDAY)).json()).planned).toMatchObject({ byMemberId: null, byName: null });
  });

  it("answers 400 invalid_week_start for a date that doesn't start a week", async () => {
    await signedIn();
    for (const date of ["2026-10-20", "2026-10-25", "2026-02-30", "not-a-date", "2026-10-19T00:00"]) {
      for (const call of [week, putPlanned, deletePlanned]) {
        const response = await call(date);
        expect(response.status, date).toBe(400);
        expect((await response.json()).error.code).toBe("invalid_week_start");
      }
    }
    expect(await getDb().select().from(weekPlan)).toHaveLength(0);
  });

  it("follows the household's week start day", async () => {
    const s = await signedIn();
    await getDb().execute(`update household set week_start_day = 3 where id = '${s.householdId}'`);
    expect((await week(MONDAY)).status).toBe(400);
    const response = await week("2026-10-21");
    expect(response.status).toBe(200);
    expect((await response.json()).dates[6]).toBe("2026-10-27");
  });

  it("keeps meals in the database when listing another household's week", async () => {
    const other = await setup("b");
    signInAs(other.adminUserId);
    await addDish({ date: THURSDAY, mealSlotId: other.lunch, dishId: other.dishes.rice });
    await putPlanned(MONDAY);
    const s = await signedIn("a");
    const body = await (await week(MONDAY)).json();
    expect(body.meals).toEqual([]);
    expect(body.planned).toBeNull();
    expect(body.nutrition.every((item: { memberId: string }) => [s.adminMemberId, s.plainId, s.sonId].includes(item.memberId))).toBe(true);
  });
});
