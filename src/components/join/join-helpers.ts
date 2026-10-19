import type { ApiFailure } from "@/lib/http/api-client";

// Matches JOIN_CODE_LENGTH in modules/household/join-code.ts, which imports node:crypto and so can't reach the browser.
const JOIN_CODE_LENGTH = 8;

// The code as the field shows it: uppercase, without spaces or other characters a code never has, at most 8 long.
export function formatJoinCodeInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, JOIN_CODE_LENGTH);
}

// What is wrong with the code before it is sent, or undefined. A wrong code counts against the attempts allowed, so an incomplete one is not sent.
export function joinCodeProblem(code: string): string | undefined {
  return code.length === JOIN_CODE_LENGTH ? undefined : `Enter the ${JOIN_CODE_LENGTH}-character code`;
}

// The message to show for a failed request to join: a field problem (for example the date of birth) when the API names one, otherwise its message.
export function joinFailureMessage(failure: ApiFailure): string {
  const first = Object.values(failure.fields)[0];
  return first ?? failure.message;
}

// "Ana · Female · 34 years"
export function requestSummary(request: { sex: "male" | "female"; ageYears: number }): string {
  const sex = request.sex === "male" ? "Male" : "Female";
  return `${sex} · ${request.ageYears} ${request.ageYears === 1 ? "year" : "years"}`;
}

export type ApprovalChoice = "link" | "new";

// The body of the approve call: linking names the member, a new member sends nothing.
export function approvalBody(choice: ApprovalChoice, linkMemberId: string | undefined): { linkMemberId?: string } {
  return choice === "link" && linkMemberId ? { linkMemberId } : {};
}

export interface LeaveStep {
  // The text on the confirming button.
  confirmLabel: string;
  // The message to show above it, if any.
  message?: string;
  confirmDeleteHousehold: boolean;
}

// The leave dialog starts with a plain "Leave"; once the API says leaving would delete the household, it asks again naming what goes.
export function leaveStep(householdName: string, failure: ApiFailure | null): LeaveStep {
  if (failure?.code === "would_delete_household") {
    return { confirmLabel: `Leave and delete ${householdName}`, message: failure.message, confirmDeleteHousehold: true };
  }
  return { confirmLabel: `Leave ${householdName}`, message: failure?.message, confirmDeleteHousehold: false };
}

export interface JoinRequestView {
  id: string;
  status: "pending" | "declined";
  householdName: string;
}

export function requestStatusText(request: Pick<JoinRequestView, "status" | "householdName">): string {
  return request.status === "pending"
    ? `Waiting for ${request.householdName} to approve your request`
    : `Your request to join ${request.householdName} was declined`;
}

// The request as the pages show it, or null when it is neither pending nor declined.
export function toRequestView(request: { id: string; status: string; householdName: string } | null): JoinRequestView | null {
  if (!request || (request.status !== "pending" && request.status !== "declined")) return null;
  return { id: request.id, status: request.status, householdName: request.householdName };
}
