import { uniqueViolation } from "@/db/errors";
import { withTransaction, type Tx } from "@/db/transaction";
import { ageForTargets } from "@/lib/nutrition/target-calculator";
import { localToday } from "@/lib/time/week";
import { AppError, badRequest, notFound } from "@/lib/http/errors";
import { assertCanAttempt, lockAccount, recordWrongCode } from "../join-attempt/join-attempt-service.ts";
import { checkCanLeave, findHouseholdByJoinCode, leaveHousehold } from "../household/household-service.ts";
import { isJoinCodeFormat, normalizeJoinCode } from "../household/join-code.ts";
import * as mealSlotRepository from "../meal-slot/meal-slot-repository.ts";
import * as memberRepository from "../member/member-repository.ts";
import type { Member, MemberWithSlots } from "../member/member-schema.ts";
import * as repository from "./join-request-repository.ts";
import type { ApproveJoinRequest, CreateJoinRequest, DecidedJoinRequest, MyJoinRequest, PendingJoinRequest } from "./join-request-schema.ts";

const PENDING_UNIQUE_INDEX = "join_request_user_pending_idx";

const memberHasAccount = () => new AppError(409, "member_has_account", "This member already has an account");

const requestPending = () => new AppError(409, "request_pending", "You already have a request waiting for approval");

// Asks to join the household with the code. See docs/spec/08-joining.md (Asking to join).
export async function createJoinRequest(userId: string, input: CreateJoinRequest): Promise<MyJoinRequest> {
  const code = normalizeJoinCode(input.code);
  // The wrong code is recorded in the same transaction as the check, which locks the account first. The transaction
  // returns instead of throwing for a wrong code, so the record is committed.
  const target = await withTransaction(async (tx) => {
    await lockAccount(userId, tx);
    await assertCanAttempt(userId, new Date(), tx);
    const found = isJoinCodeFormat(code) ? await findHouseholdByJoinCode(code, tx) : null;
    if (!found) await recordWrongCode(userId, new Date(), tx);
    return found;
  });
  if (!target) throw new AppError(404, "unknown_code", "No household has this code");

  const current = await memberRepository.findByUserId(userId);
  if (current?.householdId === target.id) throw new AppError(409, "already_in_household", "You're already in this household");
  if (await repository.findPendingByUser(userId)) throw requestPending();

  let details: repository.JoinRequestValues;
  if (current) {
    if (!current.dateOfBirth) {
      throw new AppError(409, "date_of_birth_needed", "Add your date of birth in household settings first");
    }
    details = { name: current.name, sex: current.sex, dateOfBirth: current.dateOfBirth };
  } else {
    if (!input.you) throw badRequest("Some fields are invalid", { you: "Tell us about yourself" });
    details = input.you;
  }

  await checkCanLeave(userId, { confirmDeleteHousehold: input.confirmDeleteHousehold });

  try {
    const request = await repository.insert(target.id, userId, {
      ...details,
      confirmedDeleteHousehold: input.confirmDeleteHousehold === true,
    });
    return { ...request, householdName: target.name };
  } catch (error) {
    // Two asks at once: the unique pending request per account lets only one win.
    if (uniqueViolation(error) === PENDING_UNIQUE_INDEX) throw requestPending();
    throw error;
  }
}

// The latest request that is pending or declined, or null.
export function getMyJoinRequest(userId: string): Promise<MyJoinRequest | null> {
  return repository.findLatestOpenByUser(userId);
}

export async function cancelMyJoinRequest(userId: string): Promise<void> {
  if (!(await repository.cancelPending(userId))) throw notFound("You have no pending request");
}

export async function dismissMyJoinRequest(userId: string): Promise<void> {
  if (!(await repository.dismissDeclined(userId))) throw notFound("You have no declined request");
}

export async function listPendingRequests(householdId: string): Promise<PendingJoinRequest[]> {
  const today = localToday(new Date());
  const requests = await repository.listPendingByHousehold(householdId);
  return requests.map((request) => ({
    id: request.id,
    name: request.name,
    sex: request.sex,
    ageYears: ageForTargets({ dateOfBirth: request.dateOfBirth, ageBand: null }, today).ageYears,
    createdAt: request.createdAt,
  }));
}

// Claims the pending request of the admin's household. A request of another household is not found, and one that is
// no longer pending is a conflict.
async function claimPending(admin: Member, id: string, status: "approved" | "declined", tx: Tx): Promise<DecidedJoinRequest> {
  const claimed = await repository.decidePending(admin.householdId, id, status, admin.id, tx);
  if (claimed) return claimed;
  if (!(await repository.existsInHousehold(admin.householdId, id, tx))) throw notFound("Request not found");
  throw new AppError(409, "request_not_pending", "This request has already been decided or cancelled");
}

// Approves the request, by linking the asker to a member without an account or by adding them as a new member, and
// moves them out of their current household, all in one transaction. See docs/spec/08-joining.md (Approving).
export async function approveJoinRequest(admin: Member, id: string, input: ApproveJoinRequest): Promise<MemberWithSlots> {
  const { householdId } = admin;
  return withTransaction(async (tx) => {
    const request = await claimPending(admin, id, "approved", tx);

    if (input.linkMemberId) {
      const target = await memberRepository.findInHousehold(householdId, input.linkMemberId, tx);
      if (!target) throw notFound("Member not found");
      if (target.userId) throw memberHasAccount();
    }

    const current = await memberRepository.findByUserId(request.userId, tx);
    if (current) {
      if (current.householdId === householdId) {
        throw new AppError(409, "already_in_household", "They are already in this household");
      }
      // Only what the asker confirmed when asking counts. A failing check aborts the whole approval, so the request
      // stays pending.
      await leaveHousehold(tx, request.userId, {
        confirmDeleteHousehold: request.confirmedDeleteHousehold,
        wouldDeleteMessage: (name) => `Approving would delete ${name}. Ask them to send a new request`,
      });
    }

    const details = { name: request.name, sex: request.sex, dateOfBirth: request.dateOfBirth };
    if (input.linkMemberId) {
      const linked = await memberRepository.giveToAccount(householdId, input.linkMemberId, request.userId, details, tx);
      if (!linked) throw memberHasAccount();
      const slots = await memberRepository.slotIdsOf(householdId, [linked.id], tx);
      return { ...linked, slotIds: slots.get(linked.id) ?? [] };
    }

    const added = await memberRepository.insert(
      householdId,
      {
        ...details,
        ageBand: null,
        kcalTarget: null,
        proteinTargetG: null,
        heightCm: null,
        weightKg: null,
        activityLevel: null,
        goal: null,
        isAdmin: false,
        userId: request.userId,
      },
      tx,
    );
    const slotIds = (await mealSlotRepository.listByHousehold(householdId, tx)).map((slot) => slot.id);
    await memberRepository.setSlots(householdId, added.id, slotIds, tx);
    return { ...added, slotIds };
  });
}

export async function declineJoinRequest(admin: Member, id: string): Promise<void> {
  await withTransaction((tx) => claimPending(admin, id, "declined", tx));
}
