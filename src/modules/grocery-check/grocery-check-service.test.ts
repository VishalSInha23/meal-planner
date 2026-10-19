import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb, getPool } from "@/db/client";
import { dish, dishIngredient, groceryCheck, ingredient, mealDishMember, mealSlot, memberMealSlot, shoppingTrip, weekPlan } from "@/db/schema";
import { AppError } from "@/lib/http/errors";
import { truncateAll } from "@/test/db";
import { createHouseholdFixture, unknownId, addAccountMember, type Fixture } from "@/test/fixtures";
import { listGroceryMeals } from "../meal/meal-repository.ts";
import { addDishToMeal, removeMealDish } from "../meal/meal-service.ts";
import { getGroceryLists, setCheck } from "./grocery-check-service.ts";

// Local-time constructor, like the pure tests. Months are 1-based here.
const at = (month: number, day: number, hour = 0, minute = 0) => new Date(2026, month - 1, day, hour, minute);

interface Setup extends Fixture {
  breakfast: string;
  lunch: string;
  dinner: string;
}

// The spec's household: Monday weeks, Breakfast 08:00, Lunch 13:00, Dinner 20:00, trips Tuesday 21:00 and Friday 10:00.
// The admin eats at every slot.
async function setup(tag = "a"): Promise<Setup> {
  const fixture = await createHouseholdFixture(tag);
  const db = getDb();
  const [{ id: dinner }] = await db
    .insert(mealSlot)
    .values({ householdId: fixture.householdId, name: "Dinner", time: "20:00" })
    .returning({ id: mealSlot.id });
  await db.insert(memberMealSlot).values({ memberId: fixture.adminMemberId, mealSlotId: dinner });
  await db.insert(shoppingTrip).values([
    { householdId: fixture.householdId, dayOfWeek: 2, time: "21:00" },
    { householdId: fixture.householdId, dayOfWeek: 5, time: "10:00" },
  ]);
  return { ...fixture, breakfast: fixture.slotIds[0], lunch: fixture.slotIds[1], dinner };
}

// A dish with the named ingredients, found or created by name.
async function makeDish(householdId: string, name: string, ingredientNames: string[]): Promise<{ dishId: string; ingredientIds: string[] }> {
  const db = getDb();
  const [{ id: dishId }] = await db.insert(dish).values({ householdId, name }).returning({ id: dish.id });
  const ingredientIds: string[] = [];
  for (const ingredientName of ingredientNames) {
    await db.insert(ingredient).values({ householdId, name: ingredientName }).onConflictDoNothing();
    const [row] = await db
      .select({ id: ingredient.id })
      .from(ingredient)
      .where(and(eq(ingredient.householdId, householdId), eq(ingredient.name, ingredientName)));
    ingredientIds.push(row.id);
  }
  if (ingredientIds.length > 0) await db.insert(dishIngredient).values(ingredientIds.map((ingredientId) => ({ dishId, ingredientId })));
  return { dishId, ingredientIds };
}

describe("getGroceryLists", () => {
  beforeEach(truncateAll);

  // Marked planned on Sunday 18 Oct 14:00 and Sunday 25 Oct 15:00.
  async function workedExample() {
    const s = await setup();
    await getDb().insert(weekPlan).values([
      { householdId: s.householdId, weekStart: "2026-10-19", plannedAt: at(10, 18, 14) },
      { householdId: s.householdId, weekStart: "2026-10-26", plannedAt: at(10, 25, 15) },
    ]);
    const add = async (date: string, mealSlotId: string, name: string, ingredients: string[]) => {
      const { dishId } = await makeDish(s.householdId, name, ingredients);
      return addDishToMeal(s.householdId, { date, mealSlotId, dishId });
    };
    await add("2026-10-19", s.breakfast, "Oats", ["oats", "milk"]);
    await add("2026-10-20", s.dinner, "Dal", ["dal", "salt"]);
    await add("2026-10-21", s.breakfast, "Toast", ["bread"]);
    await add("2026-10-23", s.breakfast, "Eggs", ["egg"]);
    await add("2026-10-23", s.lunch, "Rice", ["rice"]);
    await add("2026-10-25", s.dinner, "Pasta", ["pasta"]);
    await add("2026-10-26", s.breakfast, "Poha", ["poha"]);
    return { s, add };
  }

  const names = (list: { items: { name: string }[] }) => list.items.map((item) => item.name);

  it("gives the current, previous and upcoming lists of the spec's worked example", async () => {
    const { s } = await workedExample();
    const lists = await getGroceryLists(s.householdId, at(10, 24, 12));

    expect(lists.current).toMatchObject({
      key: "2026-10-19:2",
      shoppingReason: "trip",
      shoppingTime: at(10, 23, 10).toISOString(),
      from: { date: "2026-10-23", slotName: "Lunch" },
      to: { date: "2026-10-25", slotName: "Dinner" },
    });
    expect(names(lists.current)).toEqual(["pasta", "rice"]);
    expect(lists.current.items[1]).toMatchObject({ dishNames: ["Rice"], checked: false });

    // Shopping times from 16 Oct 10:00 (exactly seven days before) to the current list, newest first.
    expect(lists.previous.map((list) => [list.key, names(list)])).toEqual([
      ["2026-10-19:1", ["bread", "egg"]],
      ["2026-10-19:0", ["dal", "milk", "oats", "salt"]],
      ["2026-10-12:2", []],
    ]);
    expect(lists.previous[1].shoppingReason).toBe("planned");

    // The next week's later lists have no meals.
    expect(lists.upcoming.map((list) => [list.key, names(list), list.shoppingTime])).toEqual([
      ["2026-10-26:0", ["poha"], at(10, 25, 15).toISOString()],
    ]);
  });

  it("moves on by itself: the next week's first list is current once it has been marked", async () => {
    const { s } = await workedExample();
    expect((await getGroceryLists(s.householdId, at(10, 25, 14, 59))).current.key).toBe("2026-10-19:2");
    const lists = await getGroceryLists(s.householdId, at(10, 25, 15));
    expect(lists.current.key).toBe("2026-10-26:0");
    expect(lists.upcoming).toEqual([]);
  });

  it("always has a current list, even with no meals", async () => {
    const s = await setup();
    const lists = await getGroceryLists(s.householdId, at(10, 20, 9));
    expect(lists.current).toMatchObject({ key: "2026-10-19:0", shoppingReason: "week_start", items: [] });
    expect(lists.upcoming).toEqual([]);
  });

  it("changes a list's items when its meals change", async () => {
    const { s, add } = await workedExample();
    const now = at(10, 24, 12);
    const added = await add("2026-10-24", s.lunch, "Curry", ["cauliflower", "rice"]);
    let lists = await getGroceryLists(s.householdId, now);
    expect(names(lists.current)).toEqual(["cauliflower", "pasta", "rice"]);
    expect(lists.current.items[2].dishNames).toEqual(["Curry", "Rice"]);

    await removeMealDish(s.householdId, added.id);
    lists = await getGroceryLists(s.householdId, now);
    expect(names(lists.current)).toEqual(["pasta", "rice"]);

    // A past list changes too.
    await add("2026-10-19", s.lunch, "Soup", ["leek"]);
    lists = await getGroceryLists(s.householdId, now);
    expect(names(lists.previous[1])).toEqual(["dal", "leek", "milk", "oats", "salt"]);
  });

  it("leaves out a dish nobody is ticked for", async () => {
    const { s, add } = await workedExample();
    const curry = await add("2026-10-24", s.lunch, "Curry", ["cauliflower"]);
    await getDb().delete(mealDishMember).where(eq(mealDishMember.mealDishId, curry.id));
    const lists = await getGroceryLists(s.householdId, at(10, 24, 12));
    expect(names(lists.current)).toEqual(["pasta", "rice"]);
  });

  it("never shows another household's meals", async () => {
    const { s } = await workedExample();
    const other = await setup("b");
    expect((await getGroceryLists(other.householdId, at(10, 24, 12))).current.items).toEqual([]);
    expect((await getGroceryLists(s.householdId, at(10, 24, 12))).current.items).toHaveLength(2);
  });

  describe("queries", () => {
    afterEach(() => vi.restoreAllMocks());

    async function countQueries<T>(run: () => Promise<T>): Promise<number> {
      const spy = vi.spyOn(getPool(), "query");
      await run();
      const calls = spy.mock.calls.length;
      spy.mockRestore();
      return calls;
    }

    it("loads the meals with one query, whatever the number of meals", async () => {
      const s = await setup();
      expect(await countQueries(() => listGroceryMeals(s.householdId, "2026-10-05"))).toBe(1);

      const now = at(10, 21, 12);
      const first = await makeDish(s.householdId, "Dal", ["dal", "salt"]);
      await addDishToMeal(s.householdId, { date: "2026-10-19", mealSlotId: s.breakfast, dishId: first.dishId });
      const few = await countQueries(() => getGroceryLists(s.householdId, now));

      for (let day = 0; day < 6; day++) {
        const date = `2026-10-${20 + day}`;
        for (const slotId of [s.breakfast, s.lunch, s.dinner]) {
          const made = await makeDish(s.householdId, `Dish ${date} ${slotId}`, [`a ${date} ${slotId}`, `b ${date} ${slotId}`]);
          await addDishToMeal(s.householdId, { date, mealSlotId: slotId, dishId: made.dishId });
        }
      }
      expect(await countQueries(() => listGroceryMeals(s.householdId, "2026-10-05"))).toBe(1);
      expect(await countQueries(() => getGroceryLists(s.householdId, now))).toBe(few);
    });
  });
});

describe("setCheck", () => {
  beforeEach(truncateAll);

  async function withDish() {
    const s = await setup();
    const { dishId, ingredientIds } = await makeDish(s.householdId, "Dal", ["dal"]);
    await addDishToMeal(s.householdId, { date: "2026-10-23", mealSlotId: s.lunch, dishId });
    return { s, ingredientId: ingredientIds[0] };
  }
  const now = at(10, 24, 12);
  const KEY = "2026-10-19:2";

  it("ticks and unticks, and doing either twice changes nothing more", async () => {
    const { s, ingredientId } = await withDish();
    await setCheck(s.householdId, s.adminMemberId, KEY, ingredientId, true);
    await setCheck(s.householdId, s.adminMemberId, KEY, ingredientId, true);
    expect(await getDb().select().from(groceryCheck)).toHaveLength(1);
    expect((await getGroceryLists(s.householdId, now)).current.items[0].checked).toBe(true);

    await setCheck(s.householdId, s.adminMemberId, KEY, ingredientId, false);
    await setCheck(s.householdId, s.adminMemberId, KEY, ingredientId, false);
    expect(await getDb().select().from(groceryCheck)).toHaveLength(0);
    expect((await getGroceryLists(s.householdId, now)).current.items[0].checked).toBe(false);
  });

  it("shares ticks within the household and keeps the first member who ticked", async () => {
    const { s, ingredientId } = await withDish();
    const other = await addAccountMember(s.householdId, [s.lunch]);
    await setCheck(s.householdId, s.adminMemberId, KEY, ingredientId, true);
    await setCheck(s.householdId, other.memberId, KEY, ingredientId, true);
    const rows = await getDb().select().from(groceryCheck);
    expect(rows).toHaveLength(1);
    expect(rows[0].checkedByMemberId).toBe(s.adminMemberId);
    // Anyone can untick it.
    await setCheck(s.householdId, other.memberId, KEY, ingredientId, false);
    expect((await getGroceryLists(s.householdId, now)).current.items[0].checked).toBe(false);
  });

  it("keeps a tick to its list", async () => {
    const { s, ingredientId } = await withDish();
    await setCheck(s.householdId, s.adminMemberId, "2026-10-19:1", ingredientId, true);
    expect((await getGroceryLists(s.householdId, now)).current.items[0].checked).toBe(false);
  });

  it("answers 404 for an ingredient of another household or one that does not exist", async () => {
    const { s } = await withDish();
    const other = await setup("b");
    const foreign = await makeDish(other.householdId, "Dal", ["dal"]);
    await expect(setCheck(s.householdId, s.adminMemberId, KEY, foreign.ingredientIds[0], true)).rejects.toMatchObject({ status: 404 });
    await expect(setCheck(s.householdId, s.adminMemberId, KEY, foreign.ingredientIds[0], false)).rejects.toMatchObject({ status: 404 });
    await expect(setCheck(s.householdId, s.adminMemberId, KEY, unknownId(), true)).rejects.toBeInstanceOf(AppError);
    expect(await getDb().select().from(groceryCheck)).toHaveLength(0);
  });

  it.each(["", "2026-10-19", "2026-10-19:", "2026-10-19:x", "2026-13-40:0", "2026-10-19:123", "x2026-10-19:0"])(
    "answers 400 for the malformed key %j",
    async (key) => {
      const { s, ingredientId } = await withDish();
      await expect(setCheck(s.householdId, s.adminMemberId, key, ingredientId, true)).rejects.toMatchObject({
        status: 400,
        fields: { key: expect.any(String) },
      });
    },
  );
});
