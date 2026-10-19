import { z } from "zod";
import { ingredientNameSchema } from "../ingredient/ingredient-schema.ts";

export const dishNameSchema = z.string().trim().min(1, "Give the dish a name").max(80, "Use at most 80 characters");
export const kcalPerServingSchema = z.number().int("Use a whole number").min(0, "At least 0").max(5000, "At most 5000");
export const proteinPerServingSchema = z
  .number()
  .min(0, "At least 0")
  .max(300, "At most 300")
  .refine((value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9, "Use at most one decimal");

const MAX_INGREDIENTS = 50;
export const dishIngredientNamesSchema = z.array(ingredientNameSchema).max(MAX_INGREDIENTS, `Use at most ${MAX_INGREDIENTS} ingredients`);

export const createDishSchema = z
  .object({
    name: dishNameSchema,
    kcalPerServing: kcalPerServingSchema.nullable().default(null),
    proteinGPerServing: proteinPerServingSchema.nullable().default(null),
    ingredients: dishIngredientNamesSchema.default([]),
  })
  .strict();

export const updateDishSchema = z
  .object({
    name: dishNameSchema,
    kcalPerServing: kcalPerServingSchema.nullable(),
    proteinGPerServing: proteinPerServingSchema.nullable(),
    ingredients: dishIngredientNamesSchema,
  })
  .partial()
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), "Give at least one field to change");

export const listDishesSchema = z.object({
  query: z.string().trim().default(""),
  archived: z
    .enum(["true", "false"], "Use true or false")
    .default("false")
    .transform((value) => value === "true"),
});

export type CreateDish = z.infer<typeof createDishSchema>;
export type UpdateDish = z.infer<typeof updateDishSchema>;
export type ListDishes = z.infer<typeof listDishesSchema>;

// The columns of a dish; its ingredient names are kept apart.
export type DishValues = Omit<CreateDish, "ingredients">;

export interface Dish {
  id: string;
  householdId: string;
  name: string;
  kcalPerServing: number | null;
  proteinGPerServing: number | null;
  // Null for an active dish, otherwise when it was archived (ISO time).
  archivedAt: string | null;
  // Sorted by name.
  ingredients: string[];
}
