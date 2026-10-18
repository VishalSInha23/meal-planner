import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { shoppingTrip } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";
import { toTimeOfDay } from "@/lib/time-of-day";
import type { CreateShoppingTrip, ShoppingTrip } from "./shopping-trip-schema.ts";

type Row = typeof shoppingTrip.$inferSelect;

function toShoppingTrip(row: Row): ShoppingTrip {
  return { id: row.id, householdId: row.householdId, dayOfWeek: row.dayOfWeek, time: toTimeOfDay(row.time) };
}

// By day, then time.
export async function listByHousehold(householdId: string, db: DbOrTx = getDb()): Promise<ShoppingTrip[]> {
  const rows = await db
    .select()
    .from(shoppingTrip)
    .where(eq(shoppingTrip.householdId, householdId))
    .orderBy(asc(shoppingTrip.dayOfWeek), asc(shoppingTrip.time));
  return rows.map(toShoppingTrip);
}

export async function insertMany(
  householdId: string,
  values: CreateShoppingTrip[],
  db: DbOrTx = getDb(),
): Promise<ShoppingTrip[]> {
  if (values.length === 0) return [];
  const rows = await db
    .insert(shoppingTrip)
    .values(values.map((value) => ({ ...value, householdId })))
    .returning();
  return rows.map(toShoppingTrip);
}

// Returns false when the household has no such trip.
export async function remove(householdId: string, id: string, db: DbOrTx = getDb()): Promise<boolean> {
  const rows = await db
    .delete(shoppingTrip)
    .where(and(eq(shoppingTrip.householdId, householdId), eq(shoppingTrip.id, id)))
    .returning({ id: shoppingTrip.id });
  return rows.length > 0;
}
