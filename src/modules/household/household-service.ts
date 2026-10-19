import { randomUUID } from "node:crypto";
import { uniqueViolation } from "@/db/errors";
import { withTransaction, type DbOrTx, type Tx } from "@/db/transaction";
import { AppError, badRequest, notFound } from "@/lib/http/errors";
import * as memberRepository from "../member/member-repository.ts";
import * as mealSlotRepository from "../meal-slot/meal-slot-repository.ts";
import * as shoppingTripRepository from "../shopping-trip/shopping-trip-repository.ts";
import * as repository from "./household-repository.ts";
import { JOIN_CODE_MAX_TRIES, JOIN_CODE_UNIQUE_CONSTRAINT, newJoinCode } from "./join-code.ts";
import type { Household, HouseholdOverview, LeaveHousehold, Onboarding, UpdateHousehold } from "./household-schema.ts";

const alreadyInHousehold = () => new AppError(409, "already_in_household", "You already belong to a household");

// Runs the write with a fresh join code, again with another when the code is already taken.
async function withFreshJoinCode<T>(write: (joinCode: string) => Promise<T>): Promise<T> {
  for (let tries = 1; ; tries++) {
    try {
      return await write(newJoinCode());
    } catch (error) {
      if (uniqueViolation(error) !== JOIN_CODE_UNIQUE_CONSTRAINT || tries >= JOIN_CODE_MAX_TRIES) throw error;
    }
  }
}

export async function getJoinCode(householdId: string): Promise<string> {
  const code = await repository.findJoinCode(householdId);
  if (!code) throw notFound("Household not found");
  return code;
}

// The old code stops working at once.
export async function regenerateJoinCode(householdId: string): Promise<string> {
  return withFreshJoinCode(async (joinCode) => {
    if (!(await repository.setJoinCode(householdId, joinCode))) throw notFound("Household not found");
    return joinCode;
  });
}

export function findHouseholdByJoinCode(joinCode: string, db?: DbOrTx): Promise<Household | null> {
  return repository.findByJoinCode(joinCode, db);
}

// Whether the account can leave its household, by the rules in docs/spec/08-joining.md (Leaving and removing).
// An account without a household can always leave. Throws 409 last_admin for the only admin of a household
// with other account members, and 409 would_delete_household for the last account member unless confirmed.
// Returns whether leaving deletes the household.
export async function checkCanLeave(
  userId: string,
  options: { confirmDeleteHousehold?: boolean } = {},
  db?: DbOrTx,
): Promise<{ deletesHousehold: boolean }> {
  const current = await memberRepository.findByUserId(userId, db);
  if (!current) return { deletesHousehold: false };
  const { accounts, admins } = await memberRepository.countAccountMembers(current.householdId, db);
  if (accounts > 1) {
    if (current.isAdmin && admins === 1) throw new AppError(409, "last_admin", "Make someone else an admin first");
    return { deletesHousehold: false };
  }
  const household = await repository.findById(current.householdId, db);
  if (!options.confirmDeleteHousehold) {
    const name = household?.name ?? "your household";
    throw new AppError(409, "would_delete_household", `This will delete ${name}, with its plan, dishes and members`);
  }
  return { deletesHousehold: true };
}

// The account leaves its household: the household is deleted with everything in it when the account is its last
// account member (only with the confirmation), otherwise just the member is deleted. Runs in the caller's transaction
// so that joining another household can be one step. The household's account members are locked first, so two people
// leaving at once can't both pass the last-admin check. Returns whether the household was deleted.
export async function leaveHousehold(
  tx: Tx,
  userId: string,
  options: { confirmDeleteHousehold?: boolean } = {},
): Promise<{ deletedHousehold: boolean }> {
  const first = await memberRepository.findByUserId(userId, tx);
  if (!first) return { deletedHousehold: false };
  await memberRepository.lockAccountMembers(first.householdId, tx);
  // The member may be gone by the time the lock is ours, so the checks read it again.
  const current = await memberRepository.findByUserId(userId, tx);
  if (!current) return { deletedHousehold: false };

  const { deletesHousehold } = await checkCanLeave(userId, options, tx);
  if (deletesHousehold) {
    await repository.remove(current.householdId, tx);
  } else {
    await memberRepository.remove(current.householdId, current.id, tx);
  }
  return { deletedHousehold: deletesHousehold };
}

export function leave(userId: string, input: LeaveHousehold): Promise<{ deletedHousehold: boolean }> {
  return withTransaction((tx) => leaveHousehold(tx, userId, input));
}

export async function getHouseholdOverview(householdId: string): Promise<HouseholdOverview> {
  const household = await repository.findById(householdId);
  if (!household) throw notFound("Household not found");
  const [mealSlots, shoppingTrips, members] = await Promise.all([
    mealSlotRepository.listByHousehold(householdId),
    shoppingTripRepository.listByHousehold(householdId),
    memberRepository.listByHousehold(householdId),
  ]);
  return { household, mealSlots, shoppingTrips, members };
}

export async function updateHousehold(householdId: string, input: UpdateHousehold): Promise<Household> {
  const household = await repository.update(householdId, input);
  if (!household) throw notFound("Household not found");
  return household;
}

// Inserts everything in one transaction.
function insertHousehold(userId: string, input: Onboarding, joinCode: string): Promise<string> {
  return withTransaction(async (tx) => {
    if (await memberRepository.findByUserId(userId, tx)) throw alreadyInHousehold();

    const household = await repository.insert({ ...input.household, joinCode }, tx);
    // Ids are made here so that a member's slot positions map to ids without relying on row order.
    const slots = input.mealSlots.map((slot) => ({ ...slot, id: randomUUID() }));
    await mealSlotRepository.insertMany(household.id, slots, tx);
    await shoppingTripRepository.insertMany(household.id, input.shoppingTrips, tx);

    const people = [
      { ...input.you, isAdmin: true, userId },
      ...input.members.map((person) => ({ ...person, isAdmin: false, userId: null })),
    ];
    for (const { slotPositions, isAdmin, userId: accountId, ...person } of people) {
      const slotIds = slotPositions.map((position) => {
        const slot = slots[position];
        if (!slot) throw badRequest("Some fields are invalid", { slotPositions: "No meal slot at this position" });
        return slot.id;
      });
      const member = await memberRepository.insert(
        household.id,
        {
          ageBand: null,
          dateOfBirth: null,
          kcalTarget: null,
          proteinTargetG: null,
          heightCm: null,
          weightKg: null,
          activityLevel: null,
          goal: null,
          ...person,
          isAdmin,
          userId: accountId,
        },
        tx,
      );
      await memberRepository.setSlots(household.id, member.id, slotIds, tx);
    }
    return household.id;
  });
}

// Creates the household, its slots and trips, the account's member (an admin) and the other members
// with their slots in one transaction: all of it, or nothing.
export async function createHousehold(userId: string, input: Onboarding): Promise<HouseholdOverview> {
  try {
    const householdId = await withFreshJoinCode((joinCode) => insertHousehold(userId, input, joinCode));
    return await getHouseholdOverview(householdId);
  } catch (error) {
    // Two onboarding requests at once: the unique account on member lets only one win.
    if (uniqueViolation(error) === "member_user_id_unique") throw alreadyInHousehold();
    throw error;
  }
}
