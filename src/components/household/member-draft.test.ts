import { describe, expect, it } from "vitest";
import type { MemberWithSlots } from "@/modules/member/member-schema";
import { draftFromMember, emptyMemberDraft, validateMemberDraft } from "./member-draft";

const SLOT = "6f1c3a52-0f2e-4d6c-9a52-2b0a1a7f0001";

function valid() {
  return { ...emptyMemberDraft([SLOT], "Asha"), sex: "female" as const, ageBand: "36-40" };
}

describe("validateMemberDraft", () => {
  it("builds a payload with nulls for empty optional fields", () => {
    expect(validateMemberDraft(valid())).toEqual({
      ok: true,
      payload: {
        name: "Asha",
        sex: "female",
        ageBand: "36-40",
        dateOfBirth: null,
        kcalTarget: null,
        proteinTargetG: null,
        slotIds: [SLOT],
      },
    });
  });

  it("parses the targets and trims the name", () => {
    const result = validateMemberDraft({ ...valid(), name: "  Asha ", kcalTarget: "2000", proteinTargetG: "55.5" });
    expect(result).toMatchObject({ ok: true, payload: { name: "Asha", kcalTarget: 2000, proteinTargetG: 55.5 } });
  });

  it("reports each invalid field by name", () => {
    const result = validateMemberDraft({ ...emptyMemberDraft([]), kcalTarget: "100", proteinTargetG: "abc" });
    expect(result).toEqual({
      ok: false,
      fields: {
        kcalTarget: "At least 500",
        proteinTargetG: "Use a number",
        name: "Give the member a name",
        sex: "Pick male or female",
        slotIds: "Pick at least one meal slot",
        ageBand: "Give an age band or a date of birth",
      },
    });
  });

  it("accepts a date of birth instead of a band", () => {
    const draft = { ...valid(), ageBand: "", dateOfBirth: "1990-04-23" };
    expect(validateMemberDraft(draft, "2026-10-19")).toMatchObject({ ok: true, payload: { ageBand: null, dateOfBirth: "1990-04-23" } });
  });

  it("rejects a date of birth in the future or less than a year ago", () => {
    const draft = { ...valid(), dateOfBirth: "2027-01-01" };
    expect(validateMemberDraft(draft, "2026-10-19")).toEqual({
      ok: false,
      fields: { dateOfBirth: "The date of birth can't be in the future" },
    });
    expect(validateMemberDraft({ ...draft, dateOfBirth: "2026-01-01" }, "2026-10-19")).toEqual({
      ok: false,
      fields: { dateOfBirth: "Members must be at least one year old" },
    });
  });

  it("rejects a date that does not exist", () => {
    expect(validateMemberDraft({ ...valid(), dateOfBirth: "1990-02-31" })).toEqual({
      ok: false,
      fields: { dateOfBirth: "Use a date like 1990-04-23" },
    });
  });
});

describe("draftFromMember", () => {
  it("turns nulls into empty texts and numbers into text", () => {
    const member: MemberWithSlots = {
      id: "m1",
      householdId: "h1",
      userId: null,
      name: "Kabir",
      sex: "male",
      ageBand: null,
      dateOfBirth: "2012-05-01",
      kcalTarget: 1800,
      proteinTargetG: null,
      isAdmin: false,
      slotIds: [SLOT],
    };
    expect(draftFromMember(member)).toEqual({
      name: "Kabir",
      sex: "male",
      ageBand: "",
      dateOfBirth: "2012-05-01",
      kcalTarget: "1800",
      proteinTargetG: "",
      slotIds: [SLOT],
    });
  });
});
