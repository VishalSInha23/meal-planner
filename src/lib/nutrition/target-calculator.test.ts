import { describe, expect, it } from "vitest";
import { ageForTargets, suggestTargets, type TargetInput } from "./target-calculator";

const man: TargetInput = {
  sex: "male",
  ageYears: 35,
  heightCm: 175,
  weightKg: 75,
  activityLevel: "moderate",
  goal: "maintain",
};

function ok(input: TargetInput) {
  const result = suggestTargets(input);
  if (!result.ok) throw new Error("expected ok");
  return result;
}

describe("suggestTargets adults", () => {
  // BMR = 750 + 1093.75 - 175 + 5 = 1673.75; energy = 1673.75 * 1.55 = 2594.31; protein 1.2 * 75 = 90
  it("maintains a moderately active man", () => {
    const result = ok(man);
    expect(result).toMatchObject({ kcal: 2590, proteinG: 90, method: "mifflin_st_jeor" });
    expect(result.steps[0].value).toBeCloseTo(1673.75, 2);
  });

  // 2594.31 * 0.8 = 2075.45 -> 2080; protein (1.2 + 0.2) * 75 = 105
  it("lowers energy to lose", () => {
    expect(ok({ ...man, goal: "lose" })).toMatchObject({ kcal: 2080, proteinG: 105 });
  });

  // BMR = 600 + 1000 - 160 - 161 = 1279; 1279 * 1.2 = 1534.8; * 0.8 = 1227.84 < BMR -> 1279 -> 1280; protein 1.0 * 60
  it("never goes below BMR when losing", () => {
    const woman: TargetInput = {
      sex: "female",
      ageYears: 32,
      heightCm: 160,
      weightKg: 60,
      activityLevel: "sedentary",
      goal: "lose",
    };
    expect(ok(woman)).toMatchObject({ kcal: 1280, proteinG: 60 });
  });

  // 2594.31 * 1.1 = 2853.74 -> 2850; protein 1.4 * 75 = 105
  it("raises energy to gain", () => {
    expect(ok({ ...man, goal: "gain" })).toMatchObject({ kcal: 2850, proteinG: 105 });
  });

  // Very active gain: 1.6 + 0.2 = 1.8 g/kg * 100 kg = 180, the highest protein rate
  it("gives very active people who gain 1.8 g of protein per kg", () => {
    const result = ok({ ...man, weightKg: 100, activityLevel: "very_active", goal: "gain" });
    expect(result.proteinG).toBe(180);
  });
});

describe("suggestTargets under 18", () => {
  // 88.5 - 495.2 + 1.26 * (694.2 + 1156.84) + 20 = 1944.35 -> 1940; protein 0.95 * 26 = 24.7 -> 25
  it("uses the boy equation for ages 3 to 8", () => {
    const boy: TargetInput = {
      sex: "male",
      ageYears: 8,
      heightCm: 128,
      weightKg: 26,
      activityLevel: "moderate",
      goal: "lose",
    };
    const result = ok(boy);
    expect(result).toMatchObject({ kcal: 1940, proteinG: 25, method: "dri_eer" });
    expect(result.steps.some((step) => step.label.includes("Goal not applied"))).toBe(true);
    expect(ok({ ...boy, goal: "gain" }).kcal).toBe(1940);
  });

  // 135.3 - 369.6 + 1.16 * (400 + 1401) + 25 = 1879.86 -> 1880; protein 0.95 * 40 = 38
  it("uses the girl equation for ages 9 to 17", () => {
    const girl: TargetInput = {
      sex: "female",
      ageYears: 12,
      heightCm: 150,
      weightKg: 40,
      activityLevel: "light",
      goal: "maintain",
    };
    expect(ok(girl)).toMatchObject({ kcal: 1880, proteinG: 38 });
  });

  // Boy 3, 95 cm, 14 kg, sedentary: 88.5 - 185.7 + 1 * (373.8 + 857.85) + 20 = 1154.45 -> 1150; protein 1.05 * 14 = 14.7 -> 15
  it("uses 1.05 g per kg at age 3", () => {
    const toddler: TargetInput = { ...man, ageYears: 3, heightCm: 95, weightKg: 14, activityLevel: "sedentary" };
    expect(ok(toddler)).toMatchObject({ kcal: 1150, proteinG: 15 });
  });

  // Boy 16, 175 cm, 60 kg, active: 88.5 - 990.4 + 1.42 * (1602 + 1580.25) + 25 = 3641.9 -> 3640; protein 0.85 * 60 = 51
  it("uses 0.85 g per kg from age 14", () => {
    const teen: TargetInput = { ...man, ageYears: 16, heightCm: 175, weightKg: 60, activityLevel: "active" };
    expect(ok(teen)).toMatchObject({ kcal: 3640, proteinG: 51 });
  });

  it("uses different methods at 17 and 18", () => {
    expect(ok({ ...man, ageYears: 17 }).method).toBe("dri_eer");
    expect(ok({ ...man, ageYears: 18 }).method).toBe("mifflin_st_jeor");
  });

  it("gives no suggestion under 3", () => {
    expect(suggestTargets({ ...man, ageYears: 2 })).toEqual({ ok: false, reason: "under_3" });
  });
});

describe("ageForTargets", () => {
  it("counts whole years from the date of birth", () => {
    const member = { dateOfBirth: "1990-04-23", ageBand: null };
    expect(ageForTargets(member, "2026-04-22")).toEqual({ ageYears: 35, fromBand: false });
    expect(ageForTargets(member, "2026-04-23")).toEqual({ ageYears: 36, fromBand: false });
    expect(ageForTargets(member, "2026-05-01")).toEqual({ ageYears: 36, fromBand: false });
    expect(ageForTargets(member, "2026-03-30")).toEqual({ ageYears: 35, fromBand: false });
  });

  it("prefers the date of birth over the band", () => {
    expect(ageForTargets({ dateOfBirth: "2000-01-01", ageBand: "76+" }, "2026-01-01").ageYears).toBe(26);
  });

  it("needs a date of birth or a band", () => {
    expect(() => ageForTargets({ dateOfBirth: null, ageBand: null }, "2026-10-19")).toThrow();
  });

  it("uses the band lower bound plus 2", () => {
    const today = "2026-10-19";
    expect(ageForTargets({ dateOfBirth: null, ageBand: "1-5" }, today)).toEqual({ ageYears: 3, fromBand: true });
    expect(ageForTargets({ dateOfBirth: null, ageBand: "36-40" }, today).ageYears).toBe(38);
    expect(ageForTargets({ dateOfBirth: null, ageBand: "76+" }, today).ageYears).toBe(78);
  });
});
