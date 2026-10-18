import { z } from "zod";
import { timeOfDaySchema } from "@/lib/time-of-day";
import { mealSlotListSchema } from "../meal-slot/meal-slot-schema.ts";
import { shoppingTripListSchema } from "../shopping-trip/shopping-trip-schema.ts";
import { ageBandSchema, memberNameSchema, sexSchema, type MemberWithSlots } from "../member/member-schema.ts";
import type { MealSlot } from "../meal-slot/meal-slot-schema.ts";
import type { ShoppingTrip } from "../shopping-trip/shopping-trip-schema.ts";

export const householdNameSchema = z.string().trim().min(1, "Give the household a name").max(60, "Use at most 60 characters");

function isIanaTimezone(value: string): boolean {
  // Region/City names and UTC only: no offsets such as "+01:00" and no POSIX rules such as "EST5EDT".
  if (value !== "UTC" && !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// An IANA name such as "Europe/London" or "UTC". Aliases a browser may send, like "Asia/Kolkata", are fine.
export const timezoneSchema = z.string().refine(isIanaTimezone, "Use a timezone name like Europe/London");

// 0 = Sunday ... 6 = Saturday.
export const weekStartDaySchema = z.number().int("Pick a day").min(0, "Pick a day").max(6, "Pick a day");

export const updateHouseholdSchema = z
  .object({
    name: householdNameSchema,
    timezone: timezoneSchema,
    weekStartDay: weekStartDaySchema,
    planningReminderTime: timeOfDaySchema,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Give at least one field to change");

// Members in onboarding name their slots by position in the submitted slot list.
const slotPositionsSchema = z.array(z.number().int().min(0)).min(1, "Pick at least one meal slot");

const onboardingMemberSchema = z
  .object({ name: memberNameSchema, sex: sexSchema, ageBand: ageBandSchema, slotPositions: slotPositionsSchema })
  .strict();

export const onboardingSchema = z
  .object({
    you: onboardingMemberSchema,
    household: z
      .object({
        name: householdNameSchema,
        timezone: timezoneSchema,
        weekStartDay: weekStartDaySchema,
        planningReminderTime: timeOfDaySchema,
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
    input.members.forEach((member, index) => check(member.slotPositions, ["members", index]));
  });

export type UpdateHousehold = z.infer<typeof updateHouseholdSchema>;
export type Onboarding = z.infer<typeof onboardingSchema>;

export interface Household {
  id: string;
  name: string;
  timezone: string;
  weekStartDay: number;
  planningReminderTime: string;
}

export interface HouseholdOverview {
  household: Household;
  mealSlots: MealSlot[];
  shoppingTrips: ShoppingTrip[];
  members: MemberWithSlots[];
}
