import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { household, joinRequest } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";
import type { JoinRequest, MyJoinRequest } from "./join-request-schema.ts";

type Row = typeof joinRequest.$inferSelect;

function toJoinRequest(row: Row): JoinRequest {
  return {
    id: row.id,
    householdId: row.householdId,
    name: row.name,
    sex: row.sex,
    dateOfBirth: row.dateOfBirth,
    status: row.status,
    createdAt: row.createdAt,
    decidedAt: row.decidedAt,
  };
}

export interface JoinRequestValues {
  name: string;
  sex: "male" | "female";
  dateOfBirth: string;
}

// The request is made by an account, so these queries start from the account, not from a household.
export async function insert(
  householdId: string,
  userId: string,
  values: JoinRequestValues,
  db: DbOrTx = getDb(),
): Promise<JoinRequest> {
  const [row] = await db
    .insert(joinRequest)
    .values({ ...values, householdId, userId })
    .returning();
  return toJoinRequest(row);
}

export async function findPendingByUser(userId: string, db: DbOrTx = getDb()): Promise<JoinRequest | null> {
  const [row] = await db
    .select()
    .from(joinRequest)
    .where(and(eq(joinRequest.userId, userId), eq(joinRequest.status, "pending")));
  return row ? toJoinRequest(row) : null;
}

// The account's latest request that is pending or declined, with the household's name.
export async function findLatestOpenByUser(userId: string, db: DbOrTx = getDb()): Promise<MyJoinRequest | null> {
  const [row] = await db
    .select({ request: joinRequest, householdName: household.name })
    .from(joinRequest)
    .innerJoin(household, eq(household.id, joinRequest.householdId))
    .where(and(eq(joinRequest.userId, userId), inArray(joinRequest.status, ["pending", "declined"])))
    .orderBy(desc(joinRequest.createdAt))
    .limit(1);
  return row ? { ...toJoinRequest(row.request), householdName: row.householdName } : null;
}

// Returns false when the account has no pending request.
export async function cancelPending(userId: string, db: DbOrTx = getDb()): Promise<boolean> {
  const rows = await db
    .update(joinRequest)
    .set({ status: "cancelled" })
    .where(and(eq(joinRequest.userId, userId), eq(joinRequest.status, "pending")))
    .returning({ id: joinRequest.id });
  return rows.length > 0;
}

// Returns false when the account has no declined request.
export async function dismissDeclined(userId: string, db: DbOrTx = getDb()): Promise<boolean> {
  const rows = await db
    .update(joinRequest)
    .set({ status: "dismissed" })
    .where(and(eq(joinRequest.userId, userId), eq(joinRequest.status, "declined")))
    .returning({ id: joinRequest.id });
  return rows.length > 0;
}
