import { z } from "zod";
import { timeOfDaySchema } from "@/lib/time-of-day";

export const mealSlotNameSchema = z.string().trim().min(1, "Give the slot a name").max(30, "Use at most 30 characters");

export const createMealSlotSchema = z.object({ name: mealSlotNameSchema, time: timeOfDaySchema }).strict();

export const updateMealSlotSchema = createMealSlotSchema
  .partial()
  .strict()
  .refine((value) => value.name !== undefined || value.time !== undefined, "Give name or time");

// A list of slots, as in onboarding: no two share a name (ignoring case) or a time.
export const mealSlotListSchema = z
  .array(createMealSlotSchema)
  .min(1, "Add at least one meal slot")
  .superRefine((slots, context) => {
    const names = new Set<string>();
    const times = new Set<string>();
    slots.forEach((slot, index) => {
      const name = slot.name.toLowerCase();
      if (names.has(name)) context.addIssue({ code: "custom", path: [index, "name"], message: "Another slot has this name" });
      if (times.has(slot.time)) context.addIssue({ code: "custom", path: [index, "time"], message: "Another slot has this time" });
      names.add(name);
      times.add(slot.time);
    });
  });

export type CreateMealSlot = z.infer<typeof createMealSlotSchema>;
export type UpdateMealSlot = z.infer<typeof updateMealSlotSchema>;

export interface MealSlot {
  id: string;
  householdId: string;
  name: string;
  time: string;
}
