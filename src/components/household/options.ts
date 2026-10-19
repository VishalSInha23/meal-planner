import { AGE_BANDS } from "@/modules/member/member-schema";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const DAY_OPTIONS = DAY_NAMES.map((label, index) => ({ value: String(index), label }));

export const AGE_BAND_OPTIONS = AGE_BANDS.map((band) => ({ value: band, label: band }));

export const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Sedentary", description: "Little or no exercise" },
  { value: "light", label: "Light", description: "Exercise 1–3 days a week" },
  { value: "moderate", label: "Moderate", description: "3–5 days a week" },
  { value: "active", label: "Active", description: "6–7 days a week" },
  { value: "very_active", label: "Very active", description: "Hard daily exercise or a physical job" },
];

export const GOAL_OPTIONS = [
  { value: "lose", label: "Lose weight" },
  { value: "maintain", label: "Maintain" },
  { value: "gain", label: "Gain weight" },
];

// Stands for "no value" in a select or radio group, which can't hold an empty string.
export const NOT_SET = { value: "not-set", label: "Not set" };
