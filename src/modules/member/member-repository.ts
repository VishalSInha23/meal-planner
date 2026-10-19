import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { member, memberMealSlot } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";
import type { ActivityLevel, Goal, Member, MemberWithSlots } from "./member-schema.ts";

type Row = typeof member.$inferSelect;

export interface MemberValues {
  name: string;
  sex: "male" | "female";
  ageBand: string | null;
  dateOfBirth: string | null;
  kcalTarget: number | null;
  proteinTargetG: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  isAdmin: boolean;
  userId: string | null;
}

function toMember(row: Row): Member {
  return {
    id: row.id,
    householdId: row.householdId,
    userId: row.userId,
    name: row.name,
    sex: row.sex,
    ageBand: row.ageBand,
    dateOfBirth: row.dateOfBirth,
    kcalTarget: row.kcalTarget,
    proteinTargetG: row.proteinTargetG === null ? null : Number(row.proteinTargetG),
    heightCm: row.heightCm === null ? null : Number(row.heightCm),
    weightKg: row.weightKg === null ? null : Number(row.weightKg),
    activityLevel: row.activityLevel,
    goal: row.goal,
    isAdmin: row.isAdmin,
  };
}

// A numeric column takes its value as text. An absent value stays absent.
function numericText(value: number | null | undefined): string | null | undefined {
  return value === undefined || value === null ? value : value.toFixed(1);
}

function toRowValues<V extends Partial<MemberValues>>(values: V) {
  const { proteinTargetG, heightCm, weightKg, ...rest } = values;
  return {
    ...rest,
    proteinTargetG: numericText(proteinTargetG),
    heightCm: numericText(heightCm),
    weightKg: numericText(weightKg),
  };
}

// Looks a member up by account, so it is the one query that does not start from a household.
export async function findByUserId(userId: string, db: DbOrTx = getDb()): Promise<Member | null> {
  const [row] = await db.select().from(member).where(eq(member.userId, userId));
  return row ? toMember(row) : null;
}

export async function findInHousehold(householdId: string, id: string, db: DbOrTx = getDb()): Promise<Member | null> {
  const [row] = await db
    .select()
    .from(member)
    .where(and(eq(member.householdId, householdId), eq(member.id, id)));
  return row ? toMember(row) : null;
}

export async function slotIdsOf(householdId: string, memberIds: string[], db: DbOrTx = getDb()): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>(memberIds.map((id) => [id, []]));
  if (memberIds.length === 0) return result;
  const rows = await db
    .select({ memberId: memberMealSlot.memberId, mealSlotId: memberMealSlot.mealSlotId })
    .from(memberMealSlot)
    .innerJoin(member, eq(member.id, memberMealSlot.memberId))
    .where(and(eq(member.householdId, householdId), inArray(memberMealSlot.memberId, memberIds)));
  for (const row of rows) result.get(row.memberId)?.push(row.mealSlotId);
  return result;
}

// Oldest first.
export async function listByHousehold(householdId: string, db: DbOrTx = getDb()): Promise<MemberWithSlots[]> {
  const rows = await db
    .select()
    .from(member)
    .where(eq(member.householdId, householdId))
    .orderBy(asc(member.createdAt), asc(member.name));
  const members = rows.map(toMember);
  const slots = await slotIdsOf(householdId, members.map((item) => item.id), db);
  return members.map((item) => ({ ...item, slotIds: slots.get(item.id) ?? [] }));
}

export async function insert(householdId: string, values: MemberValues, db: DbOrTx = getDb()): Promise<Member> {
  const [row] = await db
    .insert(member)
    .values({ ...toRowValues(values), householdId })
    .returning();
  return toMember(row);
}

export async function update(
  householdId: string,
  id: string,
  values: Partial<Omit<MemberValues, "userId">>,
  db: DbOrTx = getDb(),
): Promise<Member | null> {
  // An update with no member columns still has to touch the row.
  const set = Object.keys(values).length > 0 ? toRowValues(values) : { updatedAt: new Date() };
  const [row] = await db
    .update(member)
    .set(set)
    .where(and(eq(member.householdId, householdId), eq(member.id, id)))
    .returning();
  return row ? toMember(row) : null;
}

// Returns false when the household has no such member.
export async function remove(householdId: string, id: string, db: DbOrTx = getDb()): Promise<boolean> {
  const rows = await db
    .delete(member)
    .where(and(eq(member.householdId, householdId), eq(member.id, id)))
    .returning({ id: member.id });
  return rows.length > 0;
}

// Replaces the slots a member eats in. The slots must already be checked to belong to the household.
export async function setSlots(householdId: string, memberId: string, slotIds: string[], db: DbOrTx = getDb()): Promise<void> {
  await db
    .delete(memberMealSlot)
    .where(
      and(
        eq(memberMealSlot.memberId, memberId),
        sql`${memberMealSlot.memberId} in (select ${member.id} from ${member} where ${member.householdId} = ${householdId})`,
      ),
    );
  if (slotIds.length === 0) return;
  await db.insert(memberMealSlot).values(slotIds.map((mealSlotId) => ({ memberId, mealSlotId })));
}

// The members of the household who eat in the slot.
export async function idsInSlot(householdId: string, mealSlotId: string, db: DbOrTx = getDb()): Promise<string[]> {
  const rows = await db
    .select({ memberId: memberMealSlot.memberId })
    .from(memberMealSlot)
    .innerJoin(member, eq(member.id, memberMealSlot.memberId))
    .where(and(eq(member.householdId, householdId), eq(memberMealSlot.mealSlotId, mealSlotId)));
  return rows.map((row) => row.memberId);
}
