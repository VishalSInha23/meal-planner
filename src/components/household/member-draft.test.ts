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
        heightCm: null,
        weightKg: null,
        activityLevel: null,
        goal: null,
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

  it("takes height and weight as metric by default", () => {
    const draft = { ...valid(), height: "170.5", weight: "70", activityLevel: "light" as const, goal: "lose" as const };
    expect(validateMemberDraft(draft)).toMatchObject({
      ok: true,
      payload: { heightCm: 170.5, weightKg: 70, activityLevel: "light", goal: "lose" },
    });
  });

  it("converts lb and ft/in input to kg and cm", () => {
    const draft = { ...valid(), height: "5", heightInches: "7", weight: "154.3" };
    expect(validateMemberDraft(draft, undefined, { weightUnit: "lb", heightUnit: "ft_in" })).toMatchObject({
      ok: true,
      payload: { heightCm: 170.2, weightKg: 70 },
    });
  });

  it("reads feet alone, inches alone, or neither", () => {
    const units = { weightUnit: "kg", heightUnit: "ft_in" } as const;
    expect(validateMemberDraft({ ...valid(), height: "6" }, undefined, units)).toMatchObject({ payload: { heightCm: 182.9 } });
    expect(validateMemberDraft({ ...valid(), heightInches: "20" }, undefined, units)).toMatchObject({ payload: { heightCm: 50.8 } });
    expect(validateMemberDraft(valid(), undefined, units)).toMatchObject({ payload: { heightCm: null } });
  });

  it("rejects out-of-range and non-numeric values, wording the range in the user's units", () => {
    const metric = { ...valid(), height: "49", weight: "301" };
    expect(validateMemberDraft(metric)).toEqual({ ok: false, fields: { heightCm: "At least 50", weightKg: "At most 300" } });
    const imperial = { ...valid(), height: "8", heightInches: "3", weight: "10" };
    expect(validateMemberDraft(imperial, undefined, { weightUnit: "lb", heightUnit: "ft_in" })).toEqual({
      ok: false,
      fields: { heightCm: "Use 1 ft 8 in to 8 ft 2 in", weightKg: "Use 11 to 661.4 lb" },
    });
    expect(validateMemberDraft({ ...valid(), height: "abc", weight: "x" })).toEqual({
      ok: false,
      fields: { heightCm: "Use a number", weightKg: "Use a number" },
    });
    expect(validateMemberDraft({ ...valid(), height: "-1", heightInches: "2" }, undefined, { weightUnit: "kg", heightUnit: "ft_in" })).toEqual({
      ok: false,
      fields: { heightCm: "Use numbers for feet and inches" },
    });
  });

  it("keeps the stored values when the shown height and weight are untouched", () => {
    const units = { weightUnit: "lb", heightUnit: "ft_in" } as const;
    const stored = { heightCm: 170, weightKg: 70.3 };
    const member = { ...memberRow(), ...stored };
    const draft = { ...valid(), ...draftFromMember(member, units), name: "Asha", sex: "female" as const, ageBand: "36-40" };
    expect(draft).toMatchObject({ height: "5", heightInches: "7", weight: "155" });
    expect(validateMemberDraft(draft, undefined, units, stored)).toMatchObject({ payload: stored });
    expect(validateMemberDraft({ ...draft, heightInches: "8" }, undefined, units, stored)).toMatchObject({ payload: { heightCm: 172.7, weightKg: 70.3 } });
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

function memberRow(): MemberWithSlots {
  return {
    id: "m1",
    householdId: "h1",
    userId: null,
    name: "Kabir",
    sex: "male",
    ageBand: null,
    dateOfBirth: "2012-05-01",
    kcalTarget: 1800,
    proteinTargetG: null,
    heightCm: null,
    weightKg: null,
    activityLevel: null,
    goal: null,
    isAdmin: false,
    slotIds: [SLOT],
  };
}

describe("draftFromMember", () => {
  it("shows height and weight in the user's units", () => {
    const member = { ...memberRow(), heightCm: 170, weightKg: 70, activityLevel: "active" as const, goal: "gain" as const };
    expect(draftFromMember(member)).toMatchObject({ height: "170", heightInches: "", weight: "70", activityLevel: "active", goal: "gain" });
    expect(draftFromMember(member, { weightUnit: "lb", heightUnit: "ft_in" })).toMatchObject({
      height: "5",
      heightInches: "7",
      weight: "154.3",
    });
    expect(draftFromMember({ ...member, heightCm: 182 }, { weightUnit: "kg", heightUnit: "ft_in" })).toMatchObject({
      height: "6",
      heightInches: "0",
    });
  });

  it("turns nulls into empty texts and numbers into text", () => {
    const member = memberRow();
    expect(draftFromMember(member)).toEqual({
      name: "Kabir",
      sex: "male",
      ageBand: "",
      dateOfBirth: "2012-05-01",
      kcalTarget: "1800",
      proteinTargetG: "",
      height: "",
      heightInches: "",
      weight: "",
      activityLevel: "",
      goal: "",
      slotIds: [SLOT],
    });
  });
});
