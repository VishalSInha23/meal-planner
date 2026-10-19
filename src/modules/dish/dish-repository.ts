import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dish, dishIngredient, ingredient } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";
import type { Dish, DishValues, ListDishes } from "./dish-schema.ts";

type Row = typeof dish.$inferSelect;

function toDish(row: Row, ingredients: string[]): Dish {
  return {
    id: row.id,
    householdId: row.householdId,
    name: row.name,
    kcalPerServing: row.kcalPerServing,
    proteinGPerServing: row.proteinGPerServing === null ? null : Number(row.proteinGPerServing),
    ingredients,
  };
}

// The protein column is a numeric, which the driver handles as text.
function toColumns({ proteinGPerServing, ...rest }: Partial<DishValues>) {
  return proteinGPerServing === undefined
    ? rest
    : { ...rest, proteinGPerServing: proteinGPerServing === null ? null : proteinGPerServing.toFixed(1) };
}

async function withIngredients(rows: Row[], db: DbOrTx): Promise<Dish[]> {
  if (rows.length === 0) return [];
  const links = await db
    .select({ dishId: dishIngredient.dishId, name: ingredient.name })
    .from(dishIngredient)
    .innerJoin(ingredient, eq(ingredient.id, dishIngredient.ingredientId))
    .where(
      inArray(
        dishIngredient.dishId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(sql`lower(${ingredient.name})`));
  const byDish = new Map<string, string[]>();
  for (const link of links) byDish.set(link.dishId, [...(byDish.get(link.dishId) ?? []), link.name]);
  return rows.map((row) => toDish(row, byDish.get(row.id) ?? []));
}

// Sorted by name.
export async function list(householdId: string, filter: ListDishes, db: DbOrTx = getDb()): Promise<Dish[]> {
  const rows = await db
    .select()
    .from(dish)
    .where(
      and(
        eq(dish.householdId, householdId),
        filter.query ? ilike(dish.name, `%${filter.query.replace(/[\\%_]/g, "\\$&")}%`) : undefined,
      ),
    )
    .orderBy(asc(sql`lower(${dish.name})`), asc(dish.id));
  return withIngredients(rows, db);
}

export async function findById(householdId: string, id: string, db: DbOrTx = getDb()): Promise<Dish | null> {
  const [row] = await db
    .select()
    .from(dish)
    .where(and(eq(dish.householdId, householdId), eq(dish.id, id)));
  return row ? (await withIngredients([row], db))[0] : null;
}

// The dish whose name matches ignoring case and surrounding spaces.
export async function findByName(householdId: string, name: string, db: DbOrTx = getDb()): Promise<Dish | null> {
  const [row] = await db
    .select()
    .from(dish)
    .where(and(eq(dish.householdId, householdId), sql`lower(trim(${dish.name})) = ${name.trim().toLowerCase()}`));
  return row ? toDish(row, []) : null;
}

export async function insert(householdId: string, values: DishValues, db: DbOrTx = getDb()): Promise<string> {
  const [row] = await db
    .insert(dish)
    .values({ ...toColumns(values), name: values.name, householdId })
    .returning({ id: dish.id });
  return row.id;
}

// Returns false when the household has no such dish.
export async function update(householdId: string, id: string, values: Partial<DishValues>, db: DbOrTx = getDb()): Promise<boolean> {
  const rows = await db
    .update(dish)
    .set({ ...toColumns(values), updatedAt: new Date() })
    .where(and(eq(dish.householdId, householdId), eq(dish.id, id)))
    .returning({ id: dish.id });
  return rows.length > 0;
}

// Returns false when the household has no such dish. Its dish_ingredient rows go with it; ingredients stay.
export async function remove(householdId: string, id: string, db: DbOrTx = getDb()): Promise<boolean> {
  const rows = await db
    .delete(dish)
    .where(and(eq(dish.householdId, householdId), eq(dish.id, id)))
    .returning({ id: dish.id });
  return rows.length > 0;
}

export async function replaceIngredients(dishId: string, ingredientIds: string[], db: DbOrTx = getDb()): Promise<void> {
  await db.delete(dishIngredient).where(eq(dishIngredient.dishId, dishId));
  if (ingredientIds.length === 0) return;
  await db.insert(dishIngredient).values(ingredientIds.map((ingredientId) => ({ dishId, ingredientId })));
}
