import { beforeEach, describe, expect, it, vi } from "vitest";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  dish,
  dishIngredient,
  ingredient,
  meal,
  mealDish,
  mealDishMember,
  member,
} from "@/db/schema";
import { truncateAll } from "@/test/db";
import {
  createHouseholdFixture,
  jsonRequest,
  type Fixture,
} from "@/test/fixtures";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({
  getAuth: () => ({ api: { getSession } }),
}));

import { addDishToMeal } from "@/modules/meal/meal-service";
import { POST as postDayCopy } from "../../../days/[date]/copy/route.ts";
import { GET as getLists } from "../../../grocery-lists/route.ts";
import { GET as getWeek } from "../route.ts";
import { POST as postWeekCopy } from "./route.ts";

const MONDAY = "2026-10-19";
const NEXT_MONDAY = "2026-10-26";

const copyWeek = (weekStart: string, body: unknown) =>
  postWeekCopy(jsonRequest("POST", `/api/weeks/${weekStart}/copy`, body), {
    params: Promise.resolve({ weekStart }),
  } as never);
const copyDay = (date: string, body: unknown) =>
  postDayCopy(jsonRequest("POST", `/api/days/${date}/copy`, body), {
    params: Promise.resolve({ date }),
  } as never);

interface Setup extends Fixture {
  sonId: string;
  rice: string;
  dal: string;
  ingredientId: string;
}

// Slots: breakfast and lunch. The admin eats in both; Son is a second member who is ticked by hand.
async function setup(tag = "a"): Promise<Setup> {
  const fixture = await createHouseholdFixture(tag);
  const db = getDb();
  const [son] = await db
    .insert(member)
    .values({
      householdId: fixture.householdId,
      name: "Son",
      sex: "male",
      ageBand: "6-10",
    })
    .returning({ id: member.id });
  const [rice, dal] = await db
    .insert(dish)
    .values([
      { householdId: fixture.householdId, name: "Rice" },
      { householdId: fixture.householdId, name: "Dal" },
    ])
    .returning({ id: dish.id });
  const [lentils] = await db
    .insert(ingredient)
    .values({ householdId: fixture.householdId, name: "lentils" })
    .returning({ id: ingredient.id });
  await db
    .insert(dishIngredient)
    .values({ dishId: dal.id, ingredientId: lentils.id });
  getSession.mockResolvedValue({
    user: { id: fixture.adminUserId, name: "a", email: "a@example.com" },
  });
  return {
    ...fixture,
    sonId: son.id,
    rice: rice.id,
    dal: dal.id,
    ingredientId: lentils.id,
  };
}

const add = (s: Setup, date: string, slot: number, dishId: string) =>
  addDishToMeal(s.householdId, { date, mealSlotId: s.slotIds[slot], dishId });

const tickSon = async (mealDishId: string, sonId: string) => {
  await getDb()
    .insert(mealDishMember)
    .values({ mealDishId, memberId: sonId })
    .onConflictDoNothing();
};

// Every meal dish as "date|slot|dish|version|member,member", in a fixed order.
async function snapshot(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: mealDish.id,
      date: meal.date,
      slot: meal.mealSlotId,
      dish: mealDish.dishId,
      version: mealDish.version,
    })
    .from(mealDish)
    .innerJoin(meal, eq(meal.id, mealDish.mealId))
    .orderBy(asc(meal.date), asc(meal.mealSlotId), asc(mealDish.dishId));
  const ticks = await db.select().from(mealDishMember);
  return rows.map((row) => {
    const members = ticks
      .filter((tick) => tick.mealDishId === row.id)
      .map((tick) => tick.memberId)
      .sort();
    return `${row.date}|${row.slot}|${row.dish}|${row.version}|${members.join(",")}`;
  });
}

describe("copying meals", () => {
  beforeEach(async () => {
    await truncateAll();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("answers 401 when signed out", async () => {
    expect(
      (await copyWeek(NEXT_MONDAY, { fromWeekStart: MONDAY })).status,
    ).toBe(401);
    expect(
      (await copyDay("2026-10-20", { fromDate: "2026-10-19" })).status,
    ).toBe(401);
  });

  it("copies a week's meals, dishes and ticks to the same slots a week later", async () => {
    const s = await setup();
    const riceMonday = await add(s, MONDAY, 0, s.rice);
    await tickSon(riceMonday.id, s.sonId);
    await add(s, MONDAY, 0, s.dal);
    await add(s, "2026-10-25", 1, s.rice);

    const response = await copyWeek(NEXT_MONDAY, { fromWeekStart: MONDAY });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ addedDishes: 3 });

    const rows = await getDb()
      .select({
        date: meal.date,
        slot: meal.mealSlotId,
        dish: mealDish.dishId,
        id: mealDish.id,
        version: mealDish.version,
      })
      .from(mealDish)
      .innerJoin(meal, eq(meal.id, mealDish.mealId));
    const ticks = await getDb().select().from(mealDishMember);
    const membersOf = (date: string, slot: string, dishId: string) => {
      const row = rows.find(
        (candidate) =>
          candidate.date === date &&
          candidate.slot === slot &&
          candidate.dish === dishId,
      )!;
      return ticks
        .filter((tick) => tick.mealDishId === row.id)
        .map((tick) => tick.memberId)
        .sort();
    };
    expect(rows).toHaveLength(6);
    expect(membersOf("2026-10-26", s.slotIds[0], s.rice)).toEqual(
      [s.adminMemberId, s.sonId].sort(),
    );
    expect(membersOf("2026-10-26", s.slotIds[0], s.dal)).toEqual([
      s.adminMemberId,
    ]);
    expect(membersOf("2026-11-01", s.slotIds[1], s.rice)).toEqual([
      s.adminMemberId,
    ]);
    expect(
      rows
        .filter((row) => row.date >= "2026-10-26")
        .every((row) => row.version === 1),
    ).toBe(true);
  });

  it("keeps the ticks of a dish already in the target meal and adds the others", async () => {
    const s = await setup();
    await add(s, MONDAY, 0, s.rice);
    await add(s, MONDAY, 0, s.dal);
    const existing = await add(s, NEXT_MONDAY, 0, s.rice);
    await getDb()
      .delete(mealDishMember)
      .where(eq(mealDishMember.mealDishId, existing.id));
    await tickSon(existing.id, s.sonId);

    expect(
      await (await copyWeek(NEXT_MONDAY, { fromWeekStart: MONDAY })).json(),
    ).toEqual({ addedDishes: 1 });

    const rice = (
      await getDb().select().from(mealDish).where(eq(mealDish.id, existing.id))
    )[0];
    expect(rice.version).toBe(1);
    const riceTicks = await getDb()
      .select()
      .from(mealDishMember)
      .where(eq(mealDishMember.mealDishId, existing.id));
    expect(riceTicks.map((tick) => tick.memberId)).toEqual([s.sonId]);
    const week = await (
      await getWeek(jsonRequest("GET", `/api/weeks/${NEXT_MONDAY}`), {
        params: Promise.resolve({ weekStart: NEXT_MONDAY }),
      } as never)
    ).json();
    expect(week.meals).toHaveLength(1);
    expect(
      week.meals[0].dishes.map((item: { name: string }) => item.name).sort(),
    ).toEqual(["Dal", "Rice"]);
  });

  it("adds nothing when copied a second time and changes nothing", async () => {
    const s = await setup();
    await add(s, MONDAY, 0, s.rice);
    await add(s, MONDAY, 1, s.dal);
    expect(
      await (await copyWeek(NEXT_MONDAY, { fromWeekStart: MONDAY })).json(),
    ).toEqual({ addedDishes: 2 });
    const before = await snapshot();
    expect(
      await (await copyWeek(NEXT_MONDAY, { fromWeekStart: MONDAY })).json(),
    ).toEqual({ addedDishes: 0 });
    expect(await snapshot()).toEqual(before);
  });

  it("ends the same with two copies at once as with one", async () => {
    const s = await setup();
    for (const slot of [0, 1]) {
      await add(s, MONDAY, slot, s.rice);
      await add(s, "2026-10-21", slot, s.dal);
    }
    const responses = await Promise.all([
      copyWeek(NEXT_MONDAY, { fromWeekStart: MONDAY }),
      copyWeek(NEXT_MONDAY, { fromWeekStart: MONDAY }),
      copyWeek(NEXT_MONDAY, { fromWeekStart: MONDAY }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([
      200, 200, 200,
    ]);
    const added = (
      await Promise.all(responses.map((response) => response.json()))
    ).map((body) => body.addedDishes as number);
    expect(added.reduce((sum, value) => sum + value, 0)).toBe(4);
    const rows = await snapshot();
    expect(rows).toHaveLength(8);
    expect(await getDb().select().from(meal)).toHaveLength(8);
    expect(
      rows
        .slice(4)
        .every(
          (row) =>
            row.split("|")[3] === "1" && row.split("|")[4] === s.adminMemberId,
        ),
    ).toBe(true);
  });

  it("copies a day the same way", async () => {
    const s = await setup();
    const rice = await add(s, MONDAY, 0, s.rice);
    await tickSon(rice.id, s.sonId);
    await add(s, MONDAY, 1, s.dal);
    await add(s, "2026-10-20", 0, s.dal);

    const response = await copyDay("2026-10-22", { fromDate: MONDAY });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ addedDishes: 2 });
    expect(
      await (await copyDay("2026-10-22", { fromDate: MONDAY })).json(),
    ).toEqual({ addedDishes: 0 });

    const rows = await snapshot();
    expect(rows).toHaveLength(5);
    expect(rows.filter((row) => row.startsWith("2026-10-22"))).toHaveLength(2);
    expect(
      rows
        .find((row) => row.startsWith("2026-10-22") && row.includes(s.rice))!
        .split("|")[4],
    ).toBe([s.adminMemberId, s.sonId].sort().join(","));
    expect(rows.filter((row) => row.startsWith("2026-10-20"))).toHaveLength(1);
  });

  it("answers 400 for bad or equal dates", async () => {
    const s = await setup();
    await add(s, MONDAY, 0, s.rice);
    const fields = async (response: Response) =>
      (await response.json()).error.fields;

    for (const [weekStart, fromWeekStart] of [
      [NEXT_MONDAY, "2026-10-20"],
      ["2026-10-27", MONDAY],
      [NEXT_MONDAY, NEXT_MONDAY],
      [NEXT_MONDAY, "not a date"],
      [NEXT_MONDAY, "2026-02-30"],
    ]) {
      const response = await copyWeek(weekStart, { fromWeekStart });
      expect(response.status).toBe(400);
    }
    expect(
      await fields(await copyWeek(NEXT_MONDAY, { fromWeekStart: NEXT_MONDAY })),
    ).toEqual({ fromWeekStart: "Choose a different week" });
    expect((await copyWeek(NEXT_MONDAY, {})).status).toBe(400);
    expect(
      (await copyWeek(NEXT_MONDAY, { fromWeekStart: MONDAY, extra: 1 })).status,
    ).toBe(400);

    for (const [date, fromDate] of [
      ["2026-10-20", "2026-10-20"],
      ["2026-10-20", "2026-13-01"],
      ["2026-02-30", MONDAY],
      ["soon", MONDAY],
    ]) {
      expect((await copyDay(date, { fromDate })).status).toBe(400);
    }
    expect(
      await fields(await copyDay("2026-10-20", { fromDate: "2026-10-20" })),
    ).toEqual({ fromDate: "Choose a different day" });
    expect(await snapshot()).toHaveLength(1);
  });

  it("never copies from or into another household", async () => {
    await setup("a");
    const theirs = await createHouseholdFixture("b");
    const [theirDish] = await getDb()
      .insert(dish)
      .values({ householdId: theirs.householdId, name: "Theirs" })
      .returning({ id: dish.id });
    await addDishToMeal(theirs.householdId, {
      date: MONDAY,
      mealSlotId: theirs.slotIds[0],
      dishId: theirDish.id,
    });
    expect(
      await (await copyWeek(NEXT_MONDAY, { fromWeekStart: MONDAY })).json(),
    ).toEqual({ addedDishes: 0 });
    expect(await snapshot()).toHaveLength(1);
  });

  it("shows the copied meals in the target week and in its grocery list", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 28, 12) });
    try {
      const s = await setup();
      await add(s, MONDAY, 0, s.dal);
      await copyWeek(NEXT_MONDAY, { fromWeekStart: MONDAY });

      const week = await (
        await getWeek(jsonRequest("GET", `/api/weeks/${NEXT_MONDAY}`), {
          params: Promise.resolve({ weekStart: NEXT_MONDAY }),
        } as never)
      ).json();
      expect(week.meals).toHaveLength(1);
      expect(week.meals[0]).toMatchObject({
        date: NEXT_MONDAY,
        mealSlotId: s.slotIds[0],
      });
      expect(week.meals[0].dishes[0]).toMatchObject({
        name: "Dal",
        memberIds: [s.adminMemberId],
        version: 1,
      });

      const lists = await (
        await getLists(jsonRequest("GET", "/api/grocery-lists"), {
          params: Promise.resolve({}),
        } as never)
      ).json();
      expect(lists.current.key).toBe(`${NEXT_MONDAY}:0`);
      expect(lists.current.items).toEqual([
        {
          ingredientId: s.ingredientId,
          name: "lentils",
          dishNames: ["Dal"],
          checked: false,
        },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});
