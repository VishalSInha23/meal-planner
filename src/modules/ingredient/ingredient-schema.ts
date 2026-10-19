import { z } from "zod";

export const ingredientNameSchema = z.string().trim().min(1, "Give the ingredient a name").max(60, "Use at most 60 characters");

export const ingredientSearchSchema = z.object({ query: z.string().trim().default("") });

export type IngredientSearch = z.infer<typeof ingredientSearchSchema>;

export interface Ingredient {
  id: string;
  name: string;
}
