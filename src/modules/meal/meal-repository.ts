import { and, asc, count, eq, gte, inArray, lte, notExists, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dish, meal, mealDish, mealDishMember } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";
import type { MealDishRow } from "./meal-schema.ts";

async function readMealDishes(householdId: string, where: SQL | undefined, db: DbOrTx): Promise<MealDishRow[]> {
  const rows = await db
    .select({
      id: mealDish.id,
      mealId: meal.id,
      date: meal.date,
      mealSlotId: meal.mealSlotId,
      dishId: dish.id,
      name: dish.name,
      kcalPerServing: dish.kcalPerServing,
      proteinGPerServing: dish.proteinGPerServing,
    })
    .from(mealDish)
    .innerJoin(meal, eq(meal.id, mealDish.mealId))
    .innerJoin(dish, eq(dish.id, mealDish.dishId))
    .where(and(eq(meal.householdId, householdId), where))
    .orderBy(asc(meal.date), asc(mealDish.createdAt), asc(mealDish.id));
  if (rows.length === 0) return [];
  const ticks = await db
    .select({ mealDishId: mealDishMember.mealDishId, memberId: mealDishMember.memberId })
    .from(mealDishMember)
    .where(
      inArray(
        mealDishMember.mealDishId,
        rows.map((row) => row.id),
      ),
    );
  const byMealDish = new Map<string, string[]>();
  for (const tick of ticks) byMealDish.set(tick.mealDishId, [...(byMealDish.get(tick.mealDishId) ?? []), tick.memberId]);
  return rows.map((row) => ({
    ...row,
    proteinGPerServing: row.proteinGPerServing === null ? null : Number(row.proteinGPerServing),
    memberIds: byMealDish.get(row.id) ?? [],
  }));
}

// Every dish of the household's meals from one date to another, both included, oldest first.
export function listMealDishes(householdId: string, from: string, to: string, db: DbOrTx = getDb()): Promise<MealDishRow[]> {
  return readMealDishes(householdId, and(gte(meal.date, from), lte(meal.date, to)), db);
}

export async function findMealDish(householdId: string, id: string, db: DbOrTx = getDb()): Promise<MealDishRow | null> {
  return (await readMealDishes(householdId, eq(mealDish.id, id), db))[0] ?? null;
}

export async function countBySlot(householdId: string, mealSlotId: string, db: DbOrTx = getDb()): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(meal)
    .where(and(eq(meal.householdId, householdId), eq(meal.mealSlotId, mealSlotId)));
  return row.value;
}

// The meal for the date and slot, created when missing. Two requests at once end with one meal.
export async function ensureMeal(householdId: string, date: string, mealSlotId: string, db: DbOrTx = getDb()): Promise<string> {
  const [row] = await db
    .insert(meal)
    .values({ householdId, date, mealSlotId })
    .onConflictDoUpdate({ target: [meal.householdId, meal.date, meal.mealSlotId], set: { updatedAt: new Date() } })
    .returning({ id: meal.id });
  return row.id;
}

// A violation of meal_dish_meal_dish_idx means the dish is already in the meal.
export async function insertMealDish(mealId: string, dishId: string, db: DbOrTx = getDb()): Promise<string> {
  const [row] = await db.insert(mealDish).values({ mealId, dishId }).returning({ id: mealDish.id });
  return row.id;
}

export async function tickMembers(mealDishId: string, memberIds: string[], db: DbOrTx = getDb()): Promise<void> {
  if (memberIds.length === 0) return;
  await db
    .insert(mealDishMember)
    .values(memberIds.map((memberId) => ({ mealDishId, memberId })))
    .onConflictDoNothing();
}

export async function untickMember(mealDishId: string, memberId: string, db: DbOrTx = getDb()): Promise<void> {
  await db.delete(mealDishMember).where(and(eq(mealDishMember.mealDishId, mealDishId), eq(mealDishMember.memberId, memberId)));
}

export async function touchMeal(mealId: string, db: DbOrTx = getDb()): Promise<void> {
  await db.update(meal).set({ updatedAt: new Date() }).where(eq(meal.id, mealId));
}

// Locks the household's meal row until the transaction ends, so adding and removing dishes of one meal take turns.
export async function lockMeal(householdId: string, mealId: string, db: DbOrTx = getDb()): Promise<boolean> {
  const rows = await db
    .select({ id: meal.id })
    .from(meal)
    .where(and(eq(meal.householdId, householdId), eq(meal.id, mealId)))
    .for("update");
  return rows.length > 0;
}

export async function removeMealDish(mealDishId: string, db: DbOrTx = getDb()): Promise<void> {
  await db.delete(mealDish).where(eq(mealDish.id, mealDishId));
}

export async function countMealDishes(mealId: string, db: DbOrTx = getDb()): Promise<number> {
  const [row] = await db.select({ value: count() }).from(mealDish).where(eq(mealDish.mealId, mealId));
  return row.value;
}

export async function removeMeal(householdId: string, mealId: string, db: DbOrTx = getDb()): Promise<void> {
  await db.delete(meal).where(and(eq(meal.householdId, householdId), eq(meal.id, mealId)));
}

// Deletes the household's meals that have no dish left, as after a dish is deleted.
export async function removeEmptyMeals(householdId: string, db: DbOrTx = getDb()): Promise<void> {
  await db
    .delete(meal)
    .where(and(eq(meal.householdId, householdId), notExists(db.select({ id: mealDish.id }).from(mealDish).where(eq(mealDish.mealId, meal.id)))));
}
