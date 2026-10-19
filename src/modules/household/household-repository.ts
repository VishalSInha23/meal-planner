import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { household } from "@/db/schema";
import type { DbOrTx, Tx } from "@/db/transaction";
import * as dishRepository from "../dish/dish-repository.ts";
import * as mealRepository from "../meal/meal-repository.ts";
import type { Household, UpdateHousehold } from "./household-schema.ts";

type Row = typeof household.$inferSelect;

function toHousehold(row: Row): Household {
  return {
    id: row.id,
    name: row.name,
    weekStartDay: row.weekStartDay,
  };
}

export async function insert(values: Omit<Household, "id"> & { joinCode: string }, db: DbOrTx = getDb()): Promise<Household> {
  const [row] = await db.insert(household).values(values).returning();
  return toHousehold(row);
}

export async function findById(householdId: string, db: DbOrTx = getDb()): Promise<Household | null> {
  const [row] = await db.select().from(household).where(eq(household.id, householdId));
  return row ? toHousehold(row) : null;
}

export async function update(householdId: string, values: UpdateHousehold, db: DbOrTx = getDb()): Promise<Household | null> {
  const [row] = await db.update(household).set(values).where(eq(household.id, householdId)).returning();
  return row ? toHousehold(row) : null;
}

export async function findJoinCode(householdId: string, db: DbOrTx = getDb()): Promise<string | null> {
  const [row] = await db.select({ joinCode: household.joinCode }).from(household).where(eq(household.id, householdId));
  return row ? row.joinCode : null;
}

export async function setJoinCode(householdId: string, joinCode: string, db: DbOrTx = getDb()): Promise<boolean> {
  const rows = await db.update(household).set({ joinCode }).where(eq(household.id, householdId)).returning({ id: household.id });
  return rows.length > 0;
}

// Looks a household up by its join code, so it is the one query that does not start from a household id.
export async function findByJoinCode(joinCode: string, db: DbOrTx = getDb()): Promise<Household | null> {
  const [row] = await db.select().from(household).where(eq(household.joinCode, joinCode));
  return row ? toHousehold(row) : null;
}

// Deletes the household with everything in it. Returns false when there is no such household. The db refuses to delete
// a slot that meals use or an ingredient that dishes use, so the meals and the ingredient links go first.
// It takes a transaction, so the three deletes always succeed or fail together.
export async function remove(householdId: string, tx: Tx): Promise<boolean> {
  await mealRepository.removeAllMeals(householdId, tx);
  await dishRepository.removeAllDishIngredients(householdId, tx);
  const rows = await tx.delete(household).where(eq(household.id, householdId)).returning({ id: household.id });
  return rows.length > 0;
}
