import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { household, joinRequest } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";
import type { DecidedJoinRequest, JoinRequest, MyJoinRequest } from "./join-request-schema.ts";

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
  confirmedDeleteHousehold?: boolean;
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

// Pending requests to the household, oldest first.
export async function listPendingByHousehold(householdId: string, db: DbOrTx = getDb()): Promise<JoinRequest[]> {
  const rows = await db
    .select()
    .from(joinRequest)
    .where(and(eq(joinRequest.householdId, householdId), eq(joinRequest.status, "pending")))
    .orderBy(asc(joinRequest.createdAt), asc(joinRequest.id));
  return rows.map(toJoinRequest);
}

// Moves a pending request of the household to the new status. The condition is the claim: of two decisions at once
// only one updates the row. Returns null when the household has no pending request with this id.
export async function decidePending(
  householdId: string,
  id: string,
  status: "approved" | "declined",
  decidedByMemberId: string,
  db: DbOrTx,
): Promise<DecidedJoinRequest | null> {
  const [row] = await db
    .update(joinRequest)
    .set({ status, decidedAt: new Date(), decidedByMemberId })
    .where(and(eq(joinRequest.householdId, householdId), eq(joinRequest.id, id), eq(joinRequest.status, "pending")))
    .returning();
  return row
    ? { ...toJoinRequest(row), userId: row.userId, confirmedDeleteHousehold: row.confirmedDeleteHousehold }
    : null;
}

export async function existsInHousehold(householdId: string, id: string, db: DbOrTx): Promise<boolean> {
  const rows = await db
    .select({ id: joinRequest.id })
    .from(joinRequest)
    .where(and(eq(joinRequest.householdId, householdId), eq(joinRequest.id, id)));
  return rows.length > 0;
}
