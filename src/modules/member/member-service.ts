import { withTransaction, type Tx } from "@/db/transaction";
import { todayInTimezone } from "@/lib/dates";
import { AppError, adminOnly, badRequest, forbidden, notFound } from "@/lib/http/errors";
import * as householdRepository from "../household/household-repository.ts";
import type { Household } from "../household/household-schema.ts";
import * as mealSlotRepository from "../meal-slot/meal-slot-repository.ts";
import * as repository from "./member-repository.ts";
import {
  AGE_REQUIRED_MESSAGE,
  dateOfBirthProblem,
  type CreateMember,
  type Member,
  type MemberWithSlots,
  type UpdateMember,
} from "./member-schema.ts";

export type CurrentMember = Member & { household: Household };

// The member behind a signed-in account, with its household. Null when onboarding is not done.
export async function findCurrentMember(userId: string): Promise<CurrentMember | null> {
  const member = await repository.findByUserId(userId);
  if (!member) return null;
  const household = await householdRepository.findById(member.householdId);
  return household ? { ...member, household } : null;
}

export function listMembers(householdId: string): Promise<MemberWithSlots[]> {
  return repository.listByHousehold(householdId);
}

// A slot id from another household is reported as not found.
async function checkSlots(householdId: string, slotIds: string[]): Promise<string[]> {
  const unique = [...new Set(slotIds)];
  if ((await mealSlotRepository.countInHousehold(householdId, unique)) !== unique.length) {
    throw notFound("Meal slot not found");
  }
  return unique;
}

async function checkDateOfBirth(householdId: string, dateOfBirth: string): Promise<void> {
  const household = await householdRepository.findById(householdId);
  if (!household) throw notFound("Household not found");
  const problem = dateOfBirthProblem(dateOfBirth, todayInTimezone(household.timezone));
  if (problem) throw badRequest("Some fields are invalid", { dateOfBirth: problem });
}

async function withSlots(householdId: string, member: Member, tx: Tx): Promise<MemberWithSlots> {
  const slots = await repository.slotIdsOf(householdId, [member.id], tx);
  return { ...member, slotIds: slots.get(member.id) ?? [] };
}

export async function addMember(householdId: string, input: CreateMember): Promise<MemberWithSlots> {
  const slotIds = await checkSlots(householdId, input.slotIds);
  if (input.dateOfBirth) await checkDateOfBirth(householdId, input.dateOfBirth);
  return withTransaction(async (tx) => {
    const member = await repository.insert(
      householdId,
      {
        name: input.name,
        sex: input.sex,
        ageBand: input.ageBand ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
        kcalTarget: input.kcalTarget ?? null,
        proteinTargetG: input.proteinTargetG ?? null,
        isAdmin: false,
        userId: null,
      },
      tx,
    );
    await repository.setSlots(householdId, member.id, slotIds, tx);
    return { ...member, slotIds };
  });
}

// Admins change any member. Everyone changes their own details, but not their admin right.
export async function updateMember(actor: Member, id: string, input: UpdateMember): Promise<MemberWithSlots> {
  const { householdId } = actor;
  const target = await repository.findInHousehold(householdId, id);
  if (!target) throw notFound("Member not found");
  if (!actor.isAdmin) {
    if (actor.id !== target.id) throw forbidden("Only admins can change other members");
    if (input.isAdmin !== undefined && input.isAdmin !== target.isAdmin) throw adminOnly();
  }

  const { slotIds: requestedSlotIds, ...fields } = input;
  const ageBand = fields.ageBand === undefined ? target.ageBand : fields.ageBand;
  const dateOfBirth = fields.dateOfBirth === undefined ? target.dateOfBirth : fields.dateOfBirth;
  if (!ageBand && !dateOfBirth) throw badRequest("Some fields are invalid", { ageBand: AGE_REQUIRED_MESSAGE });
  if (fields.isAdmin && !target.userId) {
    throw badRequest("Some fields are invalid", { isAdmin: "Only members with an account can be admins" });
  }
  if (fields.dateOfBirth) await checkDateOfBirth(householdId, fields.dateOfBirth);
  const slotIds = requestedSlotIds && (await checkSlots(householdId, requestedSlotIds));

  return withTransaction(async (tx) => {
    if (target.isAdmin && fields.isAdmin === false) {
      const members = await repository.listByHousehold(householdId, tx);
      if (!members.some((item) => item.isAdmin && item.id !== id)) {
        throw new AppError(409, "last_admin", "Make someone else an admin first");
      }
    }
    const member = await repository.update(householdId, id, fields, tx);
    if (!member) throw notFound("Member not found");
    if (slotIds) await repository.setSlots(householdId, id, slotIds, tx);
    return withSlots(householdId, member, tx);
  });
}

// Only members without an account can be removed.
export async function removeMember(householdId: string, id: string): Promise<void> {
  const target = await repository.findInHousehold(householdId, id);
  if (!target) throw notFound("Member not found");
  if (target.userId) throw new AppError(409, "member_has_account", "A member with an account can't be removed");
  await repository.remove(householdId, id);
}
