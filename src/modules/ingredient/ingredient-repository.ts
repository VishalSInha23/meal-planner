import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { ingredient } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";
import type { Ingredient } from "./ingredient-schema.ts";

const key = sql<string>`lower(trim(${ingredient.name}))`;

// Escapes the characters that mean something in a like pattern.
function likeEscape(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

export async function findByLowerNames(householdId: string, lowerNames: string[], db: DbOrTx = getDb()): Promise<Ingredient[]> {
  if (lowerNames.length === 0) return [];
  return db
    .select({ id: ingredient.id, name: ingredient.name })
    .from(ingredient)
    .where(and(eq(ingredient.householdId, householdId), inArray(key, lowerNames)));
}

// A name that already exists (even one added by a concurrent save) is skipped.
export async function insertMany(householdId: string, names: string[], db: DbOrTx = getDb()): Promise<void> {
  if (names.length === 0) return;
  await db
    .insert(ingredient)
    .values(names.map((name) => ({ householdId, name })))
    .onConflictDoNothing();
}

// Names starting with the text come first, then names containing it; each group by name.
export async function search(householdId: string, text: string, limit: number, db: DbOrTx = getDb()): Promise<Ingredient[]> {
  const escaped = likeEscape(text);
  const where = text
    ? and(eq(ingredient.householdId, householdId), ilike(ingredient.name, `%${escaped}%`))
    : eq(ingredient.householdId, householdId);
  const order = text ? [sql`case when ${ingredient.name} ilike ${`${escaped}%`} then 0 else 1 end`, asc(key)] : [asc(key)];
  return db
    .select({ id: ingredient.id, name: ingredient.name })
    .from(ingredient)
    .where(where)
    .orderBy(...order)
    .limit(limit);
}

export async function existsInHousehold(householdId: string, id: string, db: DbOrTx = getDb()): Promise<boolean> {
  const rows = await db
    .select({ id: ingredient.id })
    .from(ingredient)
    .where(and(eq(ingredient.householdId, householdId), eq(ingredient.id, id)));
  return rows.length > 0;
}
