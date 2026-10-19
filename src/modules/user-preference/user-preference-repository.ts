import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userPreference } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";
import type { Preferences, UpdatePreferences } from "./user-preference-schema.ts";

const columns = {
  theme: userPreference.theme,
  fontStyle: userPreference.fontStyle,
  weightUnit: userPreference.weightUnit,
  heightUnit: userPreference.heightUnit,
};

export async function findByUserId(userId: string, db: DbOrTx = getDb()): Promise<Preferences | null> {
  const [row] = await db
    .select(columns)
    .from(userPreference)
    .where(eq(userPreference.userId, userId));
  return row ?? null;
}

// Creates the row, or changes only the given fields of the existing one.
export async function upsert(userId: string, values: UpdatePreferences, db: DbOrTx = getDb()): Promise<Preferences> {
  const [row] = await db
    .insert(userPreference)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userPreference.userId, set: { ...values, updatedAt: new Date() } })
    .returning(columns);
  return row;
}
