import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { member, weekPlan } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";
import type { WeekPlanned } from "../meal/meal-schema.ts";

export async function find(householdId: string, weekStart: string, db: DbOrTx = getDb()): Promise<WeekPlanned | null> {
  const [row] = await db
    .select({ plannedAt: weekPlan.plannedAt, byMemberId: weekPlan.plannedByMemberId, byName: member.name })
    .from(weekPlan)
    .leftJoin(member, eq(member.id, weekPlan.plannedByMemberId))
    .where(and(eq(weekPlan.householdId, householdId), eq(weekPlan.weekStart, weekStart)));
  return row ? { at: row.plannedAt.toISOString(), byMemberId: row.byMemberId, byName: row.byName } : null;
}

// A week that is already planned keeps its first mark.
export async function insert(householdId: string, weekStart: string, memberId: string, db: DbOrTx = getDb()): Promise<void> {
  await db.insert(weekPlan).values({ householdId, weekStart, plannedByMemberId: memberId }).onConflictDoNothing();
}

export async function remove(householdId: string, weekStart: string, db: DbOrTx = getDb()): Promise<void> {
  await db.delete(weekPlan).where(and(eq(weekPlan.householdId, householdId), eq(weekPlan.weekStart, weekStart)));
}
