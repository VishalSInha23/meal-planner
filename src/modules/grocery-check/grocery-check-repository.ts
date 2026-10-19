import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { groceryCheck } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";

export interface CheckRow {
  listKey: string;
  ingredientId: string;
}

export async function listByKeys(householdId: string, listKeys: string[], db: DbOrTx = getDb()): Promise<CheckRow[]> {
  if (listKeys.length === 0) return [];
  return db
    .select({ listKey: groceryCheck.listKey, ingredientId: groceryCheck.ingredientId })
    .from(groceryCheck)
    .where(and(eq(groceryCheck.householdId, householdId), inArray(groceryCheck.listKey, listKeys)));
}

// An item that is already checked keeps its first check.
export async function insert(
  householdId: string,
  listKey: string,
  ingredientId: string,
  memberId: string,
  db: DbOrTx = getDb(),
): Promise<void> {
  await db.insert(groceryCheck).values({ householdId, listKey, ingredientId, checkedByMemberId: memberId }).onConflictDoNothing();
}

export async function remove(householdId: string, listKey: string, ingredientId: string, db: DbOrTx = getDb()): Promise<void> {
  await db
    .delete(groceryCheck)
    .where(
      and(eq(groceryCheck.householdId, householdId), eq(groceryCheck.listKey, listKey), eq(groceryCheck.ingredientId, ingredientId)),
    );
}
