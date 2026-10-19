import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { count, eq, inArray } from "drizzle-orm";
import {
  dish,
  dishIngredient,
  groceryCheck,
  household,
  ingredient,
  joinRequest,
  meal,
  mealDish,
  mealDishMember,
  mealSlot,
  member,
  memberMealSlot,
  shoppingTrip,
  user,
  weekPlan,
} from "@/db/schema";
import { newJoinCode } from "@/modules/household/join-code";
import type { Onboarding } from "@/modules/household/household-schema";

export async function createUser(id: string) {
  const row = { id, name: `Name ${id}`, email: `${id}@example.com` };
  await getDb().insert(user).values(row);
  return row;
}

export interface Fixture {
  householdId: string;
  joinCode: string;
  slotIds: string[];
  adminMemberId: string;
  adminUserId: string;
}

// A household with two slots (08:00 and 13:00) and an admin who has an account and eats in both.
export async function createHouseholdFixture(tag: string): Promise<Fixture> {
  const db = getDb();
  const adminUserId = `admin-${tag}`;
  await createUser(adminUserId);
  const joinCode = newJoinCode();
  const [{ id: householdId }] = await db
    .insert(household)
    .values({ name: `House ${tag}`, weekStartDay: 1, joinCode })
    .returning({ id: household.id });
  const slots = await db
    .insert(mealSlot)
    .values([
      { householdId, name: "Breakfast", time: "08:00" },
      { householdId, name: "Lunch", time: "13:00" },
    ])
    .returning({ id: mealSlot.id });
  const slotIds = slots.map((slot) => slot.id);
  const [{ id: adminMemberId }] = await db
    .insert(member)
    .values({ householdId, userId: adminUserId, name: "Admin", sex: "female", ageBand: "36-40", isAdmin: true })
    .returning({ id: member.id });
  await db.insert(memberMealSlot).values(slotIds.map((mealSlotId) => ({ memberId: adminMemberId, mealSlotId })));
  return { householdId, joinCode, slotIds, adminMemberId, adminUserId };
}

// A second member with an account in the household, without admin rights.
export async function addAccountMember(householdId: string, slotIds: string[], userId = "plain-user") {
  await createUser(userId);
  const [{ id }] = await getDb()
    .insert(member)
    .values({ householdId, userId, name: "Plain", sex: "male", ageBand: "36-40" })
    .returning({ id: member.id });
  await getDb().insert(memberMealSlot).values(slotIds.map((mealSlotId) => ({ memberId: id, mealSlotId })));
  return { memberId: id, userId };
}

export function validOnboarding(overrides: Partial<Onboarding> = {}): Onboarding {
  return {
    you: { name: "Asha", sex: "female", dateOfBirth: "1988-04-23", slotPositions: [0, 1] },
    household: { name: "Home", weekStartDay: 1 },
    mealSlots: [
      { name: "Breakfast", time: "08:00" },
      { name: "Dinner", time: "20:00" },
    ],
    shoppingTrips: [{ dayOfWeek: 6, time: "10:00" }],
    members: [{ name: "Ravi", sex: "male", ageBand: "41-45", slotPositions: [1] }],
    ...overrides,
  };
}

export function jsonRequest(method: string, path: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const paramsOf = (id?: string) => ({ params: Promise.resolve(id === undefined ? {} : { id }) }) as never;

export const unknownId = () => randomUUID();

export interface FilledHousehold {
  householdId: string;
  memberIds: string[];
  slotIds: string[];
}

// Puts a row in every table that belongs to the household: a trip, dish, ingredient, meal with a dish and a tick for each
// member, a week plan and a grocery tick. The meal is in the first slot.
export async function fillHousehold(fixture: Fixture, memberIds: string[]): Promise<FilledHousehold> {
  const db = getDb();
  const { householdId } = fixture;
  await db.insert(shoppingTrip).values({ householdId, dayOfWeek: 6, time: "10:00" });
  const [{ id: dishId }] = await db.insert(dish).values({ householdId, name: "Dal" }).returning({ id: dish.id });
  const [{ id: ingredientId }] = await db.insert(ingredient).values({ householdId, name: "Lentils" }).returning({ id: ingredient.id });
  await db.insert(dishIngredient).values({ dishId, ingredientId });
  const [{ id: mealId }] = await db
    .insert(meal)
    .values({ householdId, date: "2026-10-19", mealSlotId: fixture.slotIds[0] })
    .returning({ id: meal.id });
  const [{ id: mealDishId }] = await db.insert(mealDish).values({ mealId, dishId }).returning({ id: mealDish.id });
  await db.insert(mealDishMember).values(memberIds.map((memberId) => ({ mealDishId, memberId })));
  await db.insert(weekPlan).values({ householdId, weekStart: "2026-10-19", plannedByMemberId: memberIds[0] });
  await db.insert(groceryCheck).values({ householdId, listKey: "2026-10-19", ingredientId, checkedByMemberId: memberIds[0] });
  return { householdId, memberIds, slotIds: fixture.slotIds };
}

// The tables that still hold a row of a household filled by `fillHousehold`.
export async function survivingTables(filled: FilledHousehold): Promise<string[]> {
  const db = getDb();
  const { householdId, memberIds, slotIds } = filled;
  const counts = {
    household: await db.select({ n: count() }).from(household).where(eq(household.id, householdId)),
    member: await db.select({ n: count() }).from(member).where(inArray(member.id, memberIds)),
    member_meal_slot: await db.select({ n: count() }).from(memberMealSlot).where(inArray(memberMealSlot.memberId, memberIds)),
    meal_slot: await db.select({ n: count() }).from(mealSlot).where(inArray(mealSlot.id, slotIds)),
    shopping_trip: await db.select({ n: count() }).from(shoppingTrip).where(eq(shoppingTrip.householdId, householdId)),
    dish: await db.select({ n: count() }).from(dish).where(eq(dish.householdId, householdId)),
    ingredient: await db.select({ n: count() }).from(ingredient).where(eq(ingredient.householdId, householdId)),
    meal: await db.select({ n: count() }).from(meal).where(eq(meal.householdId, householdId)),
    week_plan: await db.select({ n: count() }).from(weekPlan).where(eq(weekPlan.householdId, householdId)),
    grocery_check: await db.select({ n: count() }).from(groceryCheck).where(eq(groceryCheck.householdId, householdId)),
    join_request: await db.select({ n: count() }).from(joinRequest).where(eq(joinRequest.householdId, householdId)),
    // These three have no household column; the test fills one household at a time, so any row is that household's.
    dish_ingredient: await db.select({ n: count() }).from(dishIngredient),
    meal_dish: await db.select({ n: count() }).from(mealDish),
    meal_dish_member: await db.select({ n: count() }).from(mealDishMember),
  };
  return Object.entries(counts)
    .filter(([, rows]) => rows[0].n > 0)
    .map(([name]) => name);
}
