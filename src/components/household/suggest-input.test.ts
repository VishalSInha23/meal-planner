import { describe, expect, it } from "vitest";
import { emptyMemberDraft, type MemberDraft } from "./member-draft";
import { suggestInputFromDraft } from "./suggest-input";

const TODAY = "2026-10-19";
const METRIC = { heightUnit: "cm", weightUnit: "kg" } as const;
const IMPERIAL = { heightUnit: "ft_in", weightUnit: "lb" } as const;

function full(overrides: Partial<MemberDraft> = {}): MemberDraft {
  return {
    ...emptyMemberDraft([], "Asha"),
    sex: "female",
    ageBand: "36-40",
    height: "170",
    weight: "65",
    activityLevel: "moderate",
    goal: "maintain",
    ...overrides,
  };
}

describe("suggestInputFromDraft", () => {
  it("reads a metric draft with the age from the band", () => {
    expect(suggestInputFromDraft(full(), TODAY, METRIC)).toEqual({
      ok: true,
      ageFromBand: true,
      input: { sex: "female", ageYears: 38, heightCm: 170, weightKg: 65, activityLevel: "moderate", goal: "maintain" },
    });
  });

  it("prefers the date of birth over the band and counts whole years", () => {
    const result = suggestInputFromDraft(full({ dateOfBirth: "1990-10-20" }), TODAY, METRIC);
    expect(result).toMatchObject({ ok: true, ageFromBand: false, input: { ageYears: 35 } });
    expect(suggestInputFromDraft(full({ dateOfBirth: "1990-10-19" }), TODAY, METRIC)).toMatchObject({ input: { ageYears: 36 } });
  });

  it("converts feet, inches and pounds", () => {
    // 5 ft 10 in = 177.8 cm; 150 lb = 68 kg (rounded to one decimal)
    const result = suggestInputFromDraft(full({ height: "5", heightInches: "10", weight: "150" }), TODAY, IMPERIAL);
    expect(result).toMatchObject({ ok: true, input: { heightCm: 177.8, weightKg: 68 } });
  });

  it("reports every missing field", () => {
    const draft = { ...emptyMemberDraft([]), ageBand: "" };
    expect(suggestInputFromDraft(draft, TODAY, METRIC)).toEqual({
      ok: false,
      missing: ["sex", "age", "height", "weight", "activityLevel", "goal"],
    });
  });

  it("treats unusable numbers and a future date of birth as missing", () => {
    const result = suggestInputFromDraft(full({ height: "abc", weight: "0", ageBand: "", dateOfBirth: "2030-01-01" }), TODAY, METRIC);
    expect(result).toEqual({ ok: false, missing: ["age", "height", "weight"] });
  });
});
