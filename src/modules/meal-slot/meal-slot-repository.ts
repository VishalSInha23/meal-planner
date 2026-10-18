import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { mealSlot } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";
import { toTimeOfDay } from "@/lib/time-of-day";
import type { CreateMealSlot, MealSlot, UpdateMealSlot } from "./meal-slot-schema.ts";

type Row = typeof mealSlot.$inferSelect;

function toMealSlot(row: Row): MealSlot {
  return { id: row.id, householdId: row.householdId, name: row.name, time: toTimeOfDay(row.time) };
}

// In time order.
export async function listByHousehold(householdId: string, db: DbOrTx = getDb()): Promise<MealSlot[]> {
  const rows = await db.select().from(mealSlot).where(eq(mealSlot.householdId, householdId)).orderBy(asc(mealSlot.time));
  return rows.map(toMealSlot);
}

export async function insertMany(
  householdId: string,
  values: (CreateMealSlot & { id?: string })[],
  db: DbOrTx = getDb(),
): Promise<MealSlot[]> {
  if (values.length === 0) return [];
  const rows = await db
    .insert(mealSlot)
    .values(values.map((value) => ({ ...value, householdId })))
    .returning();
  return rows.map(toMealSlot);
}

export async function countInHousehold(householdId: string, ids: string[], db: DbOrTx = getDb()): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await db
    .select({ id: mealSlot.id })
    .from(mealSlot)
    .where(and(eq(mealSlot.householdId, householdId), inArray(mealSlot.id, ids)));
  return rows.length;
}

export async function update(
  householdId: string,
  id: string,
  values: UpdateMealSlot,
  db: DbOrTx = getDb(),
): Promise<MealSlot | null> {
  const [row] = await db
    .update(mealSlot)
    .set(values)
    .where(and(eq(mealSlot.householdId, householdId), eq(mealSlot.id, id)))
    .returning();
  return row ? toMealSlot(row) : null;
}

// Returns false when the household has no such slot.
export async function remove(householdId: string, id: string, db: DbOrTx = getDb()): Promise<boolean> {
  const rows = await db
    .delete(mealSlot)
    .where(and(eq(mealSlot.householdId, householdId), eq(mealSlot.id, id)))
    .returning({ id: mealSlot.id });
  return rows.length > 0;
}
