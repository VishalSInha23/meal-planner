import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { household } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";
import type { Household, UpdateHousehold } from "./household-schema.ts";

type Row = typeof household.$inferSelect;

function toHousehold(row: Row): Household {
  return {
    id: row.id,
    name: row.name,
    weekStartDay: row.weekStartDay,
  };
}

export async function insert(values: Omit<Household, "id">, db: DbOrTx = getDb()): Promise<Household> {
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
