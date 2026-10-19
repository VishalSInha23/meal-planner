import type { ActivityLevel, Goal } from "@/modules/member/member-schema";

type Sex = "male" | "female";

export interface TargetInput {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface TargetStep {
  label: string;
  // Null for a note without a number.
  value: number | null;
  unit: string;
}

export type TargetMethod = "dri_eer" | "mifflin_st_jeor";

export type TargetSuggestion =
  | { ok: true; kcal: number; proteinG: number; method: TargetMethod; steps: TargetStep[] }
  | { ok: false; reason: "under_3" };

const MIN_AGE = 3;
const ADULT_AGE = 18;
const BOY_GIRL_SPLIT_AGE = 9;

// Physical activity coefficients of the energy requirement equations, by sex.
const CHILD_PA: Record<Sex, Record<ActivityLevel, number>> = {
  male: { sedentary: 1.0, light: 1.13, moderate: 1.26, active: 1.42, very_active: 1.42 },
  female: { sedentary: 1.0, light: 1.16, moderate: 1.31, active: 1.56, very_active: 1.56 },
};

const ADULT_ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const ADULT_PROTEIN_PER_KG: Record<ActivityLevel, number> = {
  sedentary: 0.8,
  light: 1.0,
  moderate: 1.2,
  active: 1.4,
  very_active: 1.6,
};

function roundKcal(value: number): number {
  return Math.round(value / 10) * 10;
}

function childProteinPerKg(ageYears: number): number {
  if (ageYears === 3) return 1.05;
  return ageYears <= 13 ? 0.95 : 0.85;
}

function childEnergy(input: TargetInput): { energy: number; pa: number } {
  const { sex, ageYears, weightKg, activityLevel } = input;
  const heightM = input.heightCm / 100;
  const pa = CHILD_PA[sex][activityLevel];
  const young = ageYears < BOY_GIRL_SPLIT_AGE;
  const growth = young ? 20 : 25;
  const energy =
    sex === "male"
      ? 88.5 - 61.9 * ageYears + pa * (26.7 * weightKg + 903 * heightM) + growth
      : 135.3 - 30.8 * ageYears + pa * (10.0 * weightKg + 934 * heightM) + growth;
  return { energy, pa };
}

function suggestForChild(input: TargetInput): TargetSuggestion {
  const { energy, pa } = childEnergy(input);
  const perKg = childProteinPerKg(input.ageYears);
  return {
    ok: true,
    kcal: roundKcal(energy),
    proteinG: Math.round(perKg * input.weightKg),
    method: "dri_eer",
    steps: [
      { label: "Energy requirement", value: energy, unit: "kcal" },
      { label: "Activity coefficient", value: pa, unit: "" },
      { label: "Goal not applied under 18", value: null, unit: "" },
      { label: "Protein per kg", value: perKg, unit: "g" },
    ],
  };
}

function suggestForAdult(input: TargetInput): TargetSuggestion {
  const { sex, ageYears, heightCm, weightKg, activityLevel, goal } = input;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === "male" ? 5 : -161);
  const factor = ADULT_ACTIVITY_FACTOR[activityLevel];
  const maintenance = bmr * factor;
  const goalFactor = goal === "lose" ? 0.8 : goal === "gain" ? 1.1 : 1;
  const energy = goal === "lose" ? Math.max(maintenance * goalFactor, bmr) : maintenance * goalFactor;
  const perKg = ADULT_PROTEIN_PER_KG[activityLevel] + (goal === "maintain" ? 0 : 0.2);
  return {
    ok: true,
    kcal: roundKcal(energy),
    proteinG: Math.round(perKg * weightKg),
    method: "mifflin_st_jeor",
    steps: [
      { label: "BMR", value: bmr, unit: "kcal" },
      { label: "Activity factor", value: factor, unit: "" },
      { label: "Goal adjustment", value: goalFactor, unit: "" },
      { label: "Protein per kg", value: perKg, unit: "g" },
    ],
  };
}

export function suggestTargets(input: TargetInput): TargetSuggestion {
  if (input.ageYears < MIN_AGE) return { ok: false, reason: "under_3" };
  return input.ageYears < ADULT_AGE ? suggestForChild(input) : suggestForAdult(input);
}

// Age for targets: whole years from the date of birth ("YYYY-MM-DD"), otherwise the age band's lower bound plus 2.
export function ageForTargets(
  member: { dateOfBirth: string | null; ageBand: string | null },
  today: string,
): { ageYears: number; fromBand: boolean } {
  if (member.dateOfBirth) {
    const [birthYear, birthMonth, birthDay] = member.dateOfBirth.split("-").map(Number);
    const [year, month, day] = today.split("-").map(Number);
    const hadBirthday = month > birthMonth || (month === birthMonth && day >= birthDay);
    return { ageYears: year - birthYear - (hadBirthday ? 0 : 1), fromBand: false };
  }
  if (!member.ageBand) throw new Error("A member needs a date of birth or an age band");
  return { ageYears: Number.parseInt(member.ageBand, 10) + 2, fromBand: true };
}
