import { z } from "zod";
import { isCalendarDate } from "@/lib/dates";
import { dishNameSchema } from "../dish/dish-schema.ts";
import type { MemberDayNutrition } from "./meal-nutrition.ts";
import type { MealSlot } from "../meal-slot/meal-slot-schema.ts";

const dateSchema = z.string().refine(isCalendarDate, "Use a date like 2026-10-19");

// A dish already in the household, or a new name that creates one.
export const addMealDishSchema = z.union([
  z.object({ date: dateSchema, mealSlotId: z.uuid(), dishId: z.uuid() }).strict(),
  z.object({ date: dateSchema, mealSlotId: z.uuid(), dishName: dishNameSchema }).strict(),
]);

const versionSchema = z.number().int().min(1);

export const setMealDishMemberSchema = z.object({ eats: z.boolean(), version: versionSchema }).strict();

// The version arrives as text in the query string.
export const removeMealDishQuerySchema = z.object({
  version: z
    .string()
    .regex(/^[1-9]\d{0,8}$/, "Use a version number")
    .transform(Number),
});

// What a tick answers: the dish with the version the client now holds.
export interface MealDishChange {
  id: string;
  version: number;
  memberIds: string[];
}

export type AddMealDish = z.infer<typeof addMealDishSchema>;

// A dish in a meal, with the members ticked for it.
export interface MealDish {
  // The meal_dish id.
  id: string;
  // Goes up by 1 each time who eats the dish changes.
  version: number;
  dishId: string;
  name: string;
  kcalPerServing: number | null;
  proteinGPerServing: number | null;
  memberIds: string[];
}

export interface MealDishRow extends MealDish {
  mealId: string;
  date: string;
  mealSlotId: string;
}

export interface Meal {
  id: string;
  date: string;
  mealSlotId: string;
  dishes: MealDish[];
}

export interface WeekPlanned {
  at: string;
  byMemberId: string | null;
  byName: string | null;
}

export interface WeekMember {
  id: string;
  name: string;
  kcalTarget: number | null;
  proteinTargetG: number | null;
}

export interface Week {
  weekStart: string;
  dates: string[];
  // In time order.
  mealSlots: MealSlot[];
  meals: Meal[];
  planned: WeekPlanned | null;
  // In the order of the household's member list.
  members: WeekMember[];
  nutrition: MemberDayNutrition[];
}
