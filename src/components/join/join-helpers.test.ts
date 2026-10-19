import { describe, expect, it } from "vitest";
import type { ApiFailure } from "@/lib/http/api-client";
import { approvalBody, formatJoinCodeInput, joinCodeProblem, joinFailureMessage, leaveStep, requestStatusText, requestSummary, toRequestView } from "./join-helpers";

function failure(code: string, message: string, fields: Record<string, string> = {}): ApiFailure {
  return { ok: false, status: 409, code, message, fields };
}

describe("formatJoinCodeInput", () => {
  it("uppercases what is typed", () => {
    expect(formatJoinCodeInput("k7q2")).toBe("K7Q2");
  });

  it("drops spaces and other characters", () => {
    expect(formatJoinCodeInput(" k7q2-m9 xa ")).toBe("K7Q2M9XA");
  });

  it("keeps at most 8 characters", () => {
    expect(formatJoinCodeInput("k7q2m9xabc")).toBe("K7Q2M9XA");
  });
});

describe("joinCodeProblem", () => {
  it("accepts 8 characters", () => {
    expect(joinCodeProblem("K7Q2M9XA")).toBeUndefined();
  });

  it("asks for the full code otherwise", () => {
    expect(joinCodeProblem("K7Q2")).toBe("Enter the 8-character code");
    expect(joinCodeProblem("")).toBe("Enter the 8-character code");
  });
});

describe("joinFailureMessage", () => {
  it("shows the API message", () => {
    expect(joinFailureMessage(failure("unknown_code", "No household has this code"))).toBe("No household has this code");
    expect(joinFailureMessage(failure("rate_limited", "Too many attempts, try again in 7 minutes"))).toBe(
      "Too many attempts, try again in 7 minutes",
    );
  });

  it("prefers the message of the field the API names", () => {
    expect(
      joinFailureMessage(failure("validation_failed", "Some fields are invalid", { "you.dateOfBirth": "Use a date in the past" })),
    ).toBe("Use a date in the past");
  });
});

describe("requestSummary", () => {
  it("names sex and age", () => {
    expect(requestSummary({ sex: "female", ageYears: 34 })).toBe("Female · 34 years");
    expect(requestSummary({ sex: "male", ageYears: 1 })).toBe("Male · 1 year");
  });
});

describe("approvalBody", () => {
  it("names the member to link", () => {
    expect(approvalBody("link", "abc")).toEqual({ linkMemberId: "abc" });
  });

  it("sends nothing for a new member, or for a link without a member", () => {
    expect(approvalBody("new", "abc")).toEqual({});
    expect(approvalBody("link", undefined)).toEqual({});
  });
});

describe("leaveStep", () => {
  it("starts with a plain leave", () => {
    expect(leaveStep("Home", null)).toEqual({ confirmLabel: "Leave Home", message: undefined, confirmDeleteHousehold: false });
  });

  it("asks again naming what goes when leaving would delete the household", () => {
    const step = leaveStep("Home", failure("would_delete_household", "This will delete Home, with its plan, dishes and members"));
    expect(step).toEqual({
      confirmLabel: "Leave and delete Home",
      message: "This will delete Home, with its plan, dishes and members",
      confirmDeleteHousehold: true,
    });
  });

  it("shows the last-admin refusal and still offers a plain leave", () => {
    const step = leaveStep("Home", failure("last_admin", "Make someone else an admin first"));
    expect(step).toEqual({ confirmLabel: "Leave Home", message: "Make someone else an admin first", confirmDeleteHousehold: false });
  });
});

describe("requestStatusText", () => {
  it("says who is being waited for", () => {
    expect(requestStatusText({ status: "pending", householdName: "Home" })).toBe("Waiting for Home to approve your request");
  });

  it("says the request was declined", () => {
    expect(requestStatusText({ status: "declined", householdName: "Home" })).toBe("Your request to join Home was declined");
  });
});

describe("toRequestView", () => {
  it("keeps what the pages show of a pending or declined request", () => {
    expect(toRequestView({ id: "1", status: "pending", householdName: "Home" })).toEqual({ id: "1", status: "pending", householdName: "Home" });
    expect(toRequestView({ id: "1", status: "declined", householdName: "Home" })?.status).toBe("declined");
  });

  it("has nothing for no request or a closed one", () => {
    expect(toRequestView(null)).toBeNull();
    expect(toRequestView({ id: "1", status: "approved", householdName: "Home" })).toBeNull();
  });
});
