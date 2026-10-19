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

export const setMealDishMemberSchema = z.object({ eats: z.boolean() }).strict();

export type AddMealDish = z.infer<typeof addMealDishSchema>;

// A dish in a meal, with the members ticked for it.
export interface MealDish {
  // The meal_dish id.
  id: string;
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
