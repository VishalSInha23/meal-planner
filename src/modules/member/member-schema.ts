import { z } from "zod";
import { isCalendarDate, oneYearBefore } from "@/lib/dates";

function buildAgeBands(): string[] {
  const bands: string[] = [];
  for (let start = 1; start <= 71; start += 5) bands.push(`${start}-${start + 4}`);
  bands.push("76+");
  return bands;
}

// 1-5, 6-10, ... 71-75, 76+. Under 1 is not supported.
export const AGE_BANDS = buildAgeBands();

export const ageBandSchema = z.string().refine((value) => AGE_BANDS.includes(value), "Pick an age band");
export const sexSchema = z.enum(["male", "female"], "Pick male or female");
export const memberNameSchema = z.string().trim().min(1, "Give the member a name").max(40, "Use at most 40 characters");
export const kcalTargetSchema = z.number().int("Use a whole number").min(500, "At least 500").max(6000, "At most 6000");
const atMostOneDecimal = (value: number) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
export const proteinTargetSchema = z
  .number()
  .min(10, "At least 10")
  .max(300, "At most 300")
  .refine(atMostOneDecimal, "Use at most one decimal");
export const HEIGHT_CM_RANGE = { min: 50, max: 250 };
export const WEIGHT_KG_RANGE = { min: 5, max: 300 };
export const heightCmSchema = z
  .number()
  .min(HEIGHT_CM_RANGE.min, `At least ${HEIGHT_CM_RANGE.min}`)
  .max(HEIGHT_CM_RANGE.max, `At most ${HEIGHT_CM_RANGE.max}`)
  .refine(atMostOneDecimal, "Use at most one decimal");
export const weightKgSchema = z
  .number()
  .min(WEIGHT_KG_RANGE.min, `At least ${WEIGHT_KG_RANGE.min}`)
  .max(WEIGHT_KG_RANGE.max, `At most ${WEIGHT_KG_RANGE.max}`)
  .refine(atMostOneDecimal, "Use at most one decimal");
export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export const GOALS = ["lose", "maintain", "gain"] as const;
export const activityLevelSchema = z.enum(ACTIVITY_LEVELS, "Pick an activity level");
export const goalSchema = z.enum(GOALS, "Pick a goal");
export const dateOfBirthSchema = z.string().refine(isCalendarDate, "Use a date like 1990-04-23");
export const slotIdsSchema = z.array(z.uuid()).min(1, "Pick at least one meal slot");

const AGE_REQUIRED = "Give an age band or a date of birth";

const memberFields = {
  name: memberNameSchema,
  sex: sexSchema,
  ageBand: ageBandSchema.nullable(),
  dateOfBirth: dateOfBirthSchema.nullable(),
  kcalTarget: kcalTargetSchema.nullable(),
  proteinTargetG: proteinTargetSchema.nullable(),
  heightCm: heightCmSchema.nullable(),
  weightKg: weightKgSchema.nullable(),
  activityLevel: activityLevelSchema.nullable(),
  goal: goalSchema.nullable(),
  slotIds: slotIdsSchema,
};

// A member without an account, added by an admin.
export const createMemberSchema = z
  .object({
    name: memberFields.name,
    sex: memberFields.sex,
    ageBand: memberFields.ageBand.optional(),
    dateOfBirth: memberFields.dateOfBirth.optional(),
    kcalTarget: memberFields.kcalTarget.optional(),
    proteinTargetG: memberFields.proteinTargetG.optional(),
    heightCm: memberFields.heightCm.optional(),
    weightKg: memberFields.weightKg.optional(),
    activityLevel: memberFields.activityLevel.optional(),
    goal: memberFields.goal.optional(),
    slotIds: memberFields.slotIds,
  })
  .strict()
  .refine((value) => value.ageBand || value.dateOfBirth, { path: ["ageBand"], message: AGE_REQUIRED });

// Only the given fields change. A null clears an optional field.
export const updateMemberSchema = z
  .object({ ...memberFields, isAdmin: z.boolean() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Give at least one field to change");

export type ActivityLevel = z.infer<typeof activityLevelSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type CreateMember = z.infer<typeof createMemberSchema>;
export type UpdateMember = z.infer<typeof updateMemberSchema>;

export const AGE_REQUIRED_MESSAGE = AGE_REQUIRED;

// A date of birth can't be in the future or less than one year ago. Dates are "YYYY-MM-DD".
export function dateOfBirthProblem(dateOfBirth: string, today: string): string | null {
  if (dateOfBirth > today) return "The date of birth can't be in the future";
  if (dateOfBirth > oneYearBefore(today)) return "Members must be at least one year old";
  return null;
}

export interface Member {
  id: string;
  householdId: string;
  userId: string | null;
  name: string;
  sex: "male" | "female";
  ageBand: string | null;
  dateOfBirth: string | null;
  kcalTarget: number | null;
  proteinTargetG: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  isAdmin: boolean;
}

export interface MemberWithSlots extends Member {
  slotIds: string[];
}
