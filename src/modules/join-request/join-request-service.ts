import { uniqueViolation } from "@/db/errors";
import { AppError, badRequest, notFound } from "@/lib/http/errors";
import { assertCanAttempt, recordWrongCode } from "../join-attempt/join-attempt-service.ts";
import { checkCanLeave, findHouseholdByJoinCode } from "../household/household-service.ts";
import { isJoinCodeFormat, normalizeJoinCode } from "../household/join-code.ts";
import * as memberRepository from "../member/member-repository.ts";
import * as repository from "./join-request-repository.ts";
import type { CreateJoinRequest, MyJoinRequest } from "./join-request-schema.ts";

const PENDING_UNIQUE_INDEX = "join_request_user_pending_idx";

const requestPending = () => new AppError(409, "request_pending", "You already have a request waiting for approval");

// Asks to join the household with the code. See docs/spec/08-joining.md (Asking to join).
export async function createJoinRequest(userId: string, input: CreateJoinRequest): Promise<MyJoinRequest> {
  await assertCanAttempt(userId);

  const code = normalizeJoinCode(input.code);
  const target = isJoinCodeFormat(code) ? await findHouseholdByJoinCode(code) : null;
  if (!target) {
    await recordWrongCode(userId);
    throw new AppError(404, "unknown_code", "No household has this code");
  }

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
    const request = await repository.insert(target.id, userId, details);
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
