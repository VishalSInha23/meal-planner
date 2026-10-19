import { randomUUID } from "node:crypto";
import { uniqueViolation } from "@/db/errors";
import { withTransaction } from "@/db/transaction";
import { AppError, badRequest, notFound } from "@/lib/http/errors";
import * as memberRepository from "../member/member-repository.ts";
import * as mealSlotRepository from "../meal-slot/meal-slot-repository.ts";
import * as shoppingTripRepository from "../shopping-trip/shopping-trip-repository.ts";
import * as repository from "./household-repository.ts";
import type { Household, HouseholdOverview, Onboarding, UpdateHousehold } from "./household-schema.ts";

const alreadyInHousehold = () => new AppError(409, "already_in_household", "You already belong to a household");

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

// Creates the household, its slots and trips, the account's member (an admin) and the other members
// with their slots in one transaction: all of it, or nothing.
export async function createHousehold(userId: string, input: Onboarding): Promise<HouseholdOverview> {
  try {
    const householdId = await withTransaction(async (tx) => {
      if (await memberRepository.findByUserId(userId, tx)) throw alreadyInHousehold();

      const household = await repository.insert(input.household, tx);
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
          { ageBand: null, dateOfBirth: null, kcalTarget: null, proteinTargetG: null, ...person, isAdmin, userId: accountId },
          tx,
        );
        await memberRepository.setSlots(household.id, member.id, slotIds, tx);
      }
      return household.id;
    });
    return await getHouseholdOverview(householdId);
  } catch (error) {
    // Two onboarding requests at once: the unique account on member lets only one win.
    if (uniqueViolation(error) === "member_user_id_unique") throw alreadyInHousehold();
    throw error;
  }
}
