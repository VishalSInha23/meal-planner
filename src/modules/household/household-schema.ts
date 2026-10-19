import { z } from "zod";
import { mealSlotListSchema } from "../meal-slot/meal-slot-schema.ts";
import { shoppingTripListSchema } from "../shopping-trip/shopping-trip-schema.ts";
import { localToday } from "@/lib/time/week";
import {
  ageBandSchema,
  dateOfBirthProblem,
  dateOfBirthSchema,
  memberNameSchema,
  sexSchema,
  type MemberWithSlots,
} from "../member/member-schema.ts";
import type { MealSlot } from "../meal-slot/meal-slot-schema.ts";
import type { ShoppingTrip } from "../shopping-trip/shopping-trip-schema.ts";

export const householdNameSchema = z.string().trim().min(1, "Give the household a name").max(60, "Use at most 60 characters");

// 0 = Sunday ... 6 = Saturday.
export const weekStartDaySchema = z.number().int("Pick a day").min(0, "Pick a day").max(6, "Pick a day");

export const updateHouseholdSchema = z
  .object({
    name: householdNameSchema,
    weekStartDay: weekStartDaySchema,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Give at least one field to change");

// Members in onboarding name their slots by position in the submitted slot list.
const slotPositionsSchema = z.array(z.number().int().min(0)).min(1, "Pick at least one meal slot");

// The signed-in person gives a date of birth; members added by them give an age band.
const onboardingYouSchema = z
  .object({ name: memberNameSchema, sex: sexSchema, dateOfBirth: dateOfBirthSchema, slotPositions: slotPositionsSchema })
  .strict();

const onboardingMemberSchema = z
  .object({ name: memberNameSchema, sex: sexSchema, ageBand: ageBandSchema, slotPositions: slotPositionsSchema })
  .strict();

export const onboardingSchema = z
  .object({
    you: onboardingYouSchema,
    household: z
      .object({
        name: householdNameSchema,
        weekStartDay: weekStartDaySchema,
      })
      .strict(),
    mealSlots: mealSlotListSchema,
    shoppingTrips: shoppingTripListSchema,
    members: z.array(onboardingMemberSchema),
  })
  .strict()
  .superRefine((input, context) => {
    const check = (positions: number[], path: (string | number)[]) => {
      positions.forEach((position, index) => {
        if (position >= input.mealSlots.length) {
          context.addIssue({ code: "custom", path: [...path, "slotPositions", index], message: "No meal slot at this position" });
        }
      });
      if (new Set(positions).size !== positions.length) {
        context.addIssue({ code: "custom", path: [...path, "slotPositions"], message: "A meal slot is listed twice" });
      }
    };
    check(input.you.slotPositions, ["you"]);
    if (dateOfBirthSchema.safeParse(input.you.dateOfBirth).success) {
      const problem = dateOfBirthProblem(input.you.dateOfBirth, localToday(new Date()));
      if (problem) context.addIssue({ code: "custom", path: ["you", "dateOfBirth"], message: problem });
    }
    input.members.forEach((member, index) => check(member.slotPositions, ["members", index]));
  });

export type UpdateHousehold = z.infer<typeof updateHouseholdSchema>;
export type Onboarding = z.infer<typeof onboardingSchema>;

export interface Household {
  id: string;
  name: string;
  weekStartDay: number;
}

export interface HouseholdOverview {
  household: Household;
  mealSlots: MealSlot[];
  shoppingTrips: ShoppingTrip[];
  members: MemberWithSlots[];
}
