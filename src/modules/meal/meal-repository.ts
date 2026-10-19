import { and, asc, count, eq, gte, inArray, lte, notExists, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dish, dishIngredient, ingredient, meal, mealDish, mealDishMember } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";
import type { GroceryMeal } from "../grocery-check/grocery-list.ts";
import type { MealDishRow } from "./meal-schema.ts";

async function readMealDishes(householdId: string, where: SQL | undefined, db: DbOrTx): Promise<MealDishRow[]> {
  const rows = await db
    .select({
      id: mealDish.id,
      version: mealDish.version,
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

// The household's meals from a date on, with each dish, its ingredients and the number of members ticked for it.
// One query whatever the number of meals: a row per meal, dish and ingredient, folded here.
export async function listGroceryMeals(householdId: string, from: string, db: DbOrTx = getDb()): Promise<GroceryMeal[]> {
  const rows = await db
    .select({
      date: meal.date,
      mealSlotId: meal.mealSlotId,
      dishId: dish.id,
      dishName: dish.name,
      eaterCount: sql<number>`(select count(*)::int from ${mealDishMember} where ${mealDishMember.mealDishId} = ${mealDish.id})`,
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
    })
    .from(meal)
    .innerJoin(mealDish, eq(mealDish.mealId, meal.id))
    .innerJoin(dish, eq(dish.id, mealDish.dishId))
    .leftJoin(dishIngredient, eq(dishIngredient.dishId, dish.id))
    .leftJoin(ingredient, eq(ingredient.id, dishIngredient.ingredientId))
    .where(and(eq(meal.householdId, householdId), gte(meal.date, from)))
    .orderBy(asc(meal.date), asc(meal.id), asc(mealDish.createdAt), asc(mealDish.id));

  const meals = new Map<string, GroceryMeal>();
  const dishes = new Map<string, GroceryMeal["dishes"][number]>();
  for (const row of rows) {
    const mealKey = `${row.date}|${row.mealSlotId}`;
    const found = meals.get(mealKey) ?? { date: row.date, mealSlotId: row.mealSlotId, dishes: [] };
    meals.set(mealKey, found);
    const dishKey = `${mealKey}|${row.dishId}`;
    let entry = dishes.get(dishKey);
    if (!entry) {
      entry = { dishId: row.dishId, dishName: row.dishName, eaterCount: row.eaterCount, ingredients: [] };
      dishes.set(dishKey, entry);
      found.dishes.push(entry);
    }
    if (row.ingredientId !== null && row.ingredientName !== null) entry.ingredients.push({ id: row.ingredientId, name: row.ingredientName });
  }
  return [...meals.values()];
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

// Adds the dishes to the meal, skipping those already in it. Returns the rows it added, in the order of `dishIds`.
export async function insertMealDishesIfMissing(mealId: string, dishIds: string[], db: DbOrTx = getDb()): Promise<{ id: string; dishId: string }[]> {
  if (dishIds.length === 0) return [];
  return db
    .insert(mealDish)
    .values(dishIds.map((dishId) => ({ mealId, dishId })))
    .onConflictDoNothing()
    .returning({ id: mealDish.id, dishId: mealDish.dishId });
}

// Ticks members for dishes, leaving existing ticks as they are.
export async function tickAll(ticks: { mealDishId: string; memberId: string }[], db: DbOrTx = getDb()): Promise<void> {
  if (ticks.length === 0) return;
  await db.insert(mealDishMember).values(ticks).onConflictDoNothing();
}

// Returns how many members were newly ticked; members already ticked are left as they are.
export async function tickMembers(mealDishId: string, memberIds: string[], db: DbOrTx = getDb()): Promise<number> {
  if (memberIds.length === 0) return 0;
  const inserted = await db
    .insert(mealDishMember)
    .values(memberIds.map((memberId) => ({ mealDishId, memberId })))
    .onConflictDoNothing()
    .returning({ memberId: mealDishMember.memberId });
  return inserted.length;
}

// Returns how many ticks were removed (0 when the member was not ticked).
export async function untickMember(mealDishId: string, memberId: string, db: DbOrTx = getDb()): Promise<number> {
  const removed = await db
    .delete(mealDishMember)
    .where(and(eq(mealDishMember.mealDishId, mealDishId), eq(mealDishMember.memberId, memberId)))
    .returning({ memberId: mealDishMember.memberId });
  return removed.length;
}

// Locks the household's meal dish row until the transaction ends, so changes to one dish take turns.
// Returns its current version, or null when the dish is not in the household's meals.
export async function lockMealDish(
  householdId: string,
  mealDishId: string,
  db: DbOrTx = getDb(),
): Promise<{ mealId: string; version: number } | null> {
  const rows = await db
    .select({ mealId: mealDish.mealId, version: mealDish.version })
    .from(mealDish)
    .innerJoin(meal, eq(meal.id, mealDish.mealId))
    .where(and(eq(meal.householdId, householdId), eq(mealDish.id, mealDishId)))
    .for("update", { of: mealDish });
  return rows[0] ?? null;
}

export async function bumpVersion(mealDishId: string, db: DbOrTx = getDb()): Promise<void> {
  await db
    .update(mealDish)
    .set({ version: sql`${mealDish.version} + 1` })
    .where(eq(mealDish.id, mealDishId));
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

// Deletes all the household's meals; their dishes and ticks go with them.
export async function removeAllMeals(householdId: string, db: DbOrTx = getDb()): Promise<void> {
  await db.delete(meal).where(eq(meal.householdId, householdId));
}
