import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { household, mealSlot, member, memberMealSlot, user } from "@/db/schema";
import type { Onboarding } from "@/modules/household/household-schema";

export async function createUser(id: string) {
  const row = { id, name: `Name ${id}`, email: `${id}@example.com` };
  await getDb().insert(user).values(row);
  return row;
}

export interface Fixture {
  householdId: string;
  slotIds: string[];
  adminMemberId: string;
  adminUserId: string;
}

// A household with two slots (08:00 and 13:00) and an admin who has an account and eats in both.
export async function createHouseholdFixture(tag: string): Promise<Fixture> {
  const db = getDb();
  const adminUserId = `admin-${tag}`;
  await createUser(adminUserId);
  const [{ id: householdId }] = await db
    .insert(household)
    .values({ name: `House ${tag}`, timezone: "UTC", weekStartDay: 1, planningReminderTime: "16:00" })
    .returning({ id: household.id });
  const slots = await db
    .insert(mealSlot)
    .values([
      { householdId, name: "Breakfast", time: "08:00" },
      { householdId, name: "Lunch", time: "13:00" },
    ])
    .returning({ id: mealSlot.id });
  const slotIds = slots.map((slot) => slot.id);
  const [{ id: adminMemberId }] = await db
    .insert(member)
    .values({ householdId, userId: adminUserId, name: "Admin", sex: "female", ageBand: "36-40", isAdmin: true })
    .returning({ id: member.id });
  await db.insert(memberMealSlot).values(slotIds.map((mealSlotId) => ({ memberId: adminMemberId, mealSlotId })));
  return { householdId, slotIds, adminMemberId, adminUserId };
}

// A second member with an account in the household, without admin rights.
export async function addAccountMember(householdId: string, slotIds: string[], userId = "plain-user") {
  await createUser(userId);
  const [{ id }] = await getDb()
    .insert(member)
    .values({ householdId, userId, name: "Plain", sex: "male", ageBand: "36-40" })
    .returning({ id: member.id });
  await getDb().insert(memberMealSlot).values(slotIds.map((mealSlotId) => ({ memberId: id, mealSlotId })));
  return { memberId: id, userId };
}

export function validOnboarding(overrides: Partial<Onboarding> = {}): Onboarding {
  return {
    you: { name: "Asha", sex: "female", ageBand: "36-40", slotPositions: [0, 1] },
    household: { name: "Home", timezone: "Europe/London", weekStartDay: 1, planningReminderTime: "16:00" },
    mealSlots: [
      { name: "Breakfast", time: "08:00" },
      { name: "Dinner", time: "20:00" },
    ],
    shoppingTrips: [{ dayOfWeek: 6, time: "10:00" }],
    members: [{ name: "Ravi", sex: "male", ageBand: "41-45", slotPositions: [1] }],
    ...overrides,
  };
}

export function jsonRequest(method: string, path: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const paramsOf = (id?: string) => ({ params: Promise.resolve(id === undefined ? {} : { id }) }) as never;

export const unknownId = () => randomUUID();
