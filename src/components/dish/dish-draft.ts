import { fromZodError } from "@/lib/http/errors";
import { createDishSchema, type CreateDish, type Dish } from "@/modules/dish/dish-schema";

export type FieldErrors = Record<string, string>;

// What the form holds: the numbers are text until they are checked.
export interface DishDraft {
  name: string;
  kcal: string;
  protein: string;
  ingredients: string[];
}

export const emptyDishDraft = (): DishDraft => ({ name: "", kcal: "", protein: "", ingredients: [] });

export const draftFromDish = (dish: Dish): DishDraft => ({
  name: dish.name,
  kcal: dish.kcalPerServing === null ? "" : String(dish.kcalPerServing),
  protein: dish.proteinGPerServing === null ? "" : String(dish.proteinGPerServing),
  ingredients: dish.ingredients,
});

// Adds a name to the tags unless it is empty or already there (ignoring case).
export function addIngredient(tags: string[], name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed || tags.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())) return tags;
  return [...tags, trimmed];
}

export type DishValidation = { ok: true; payload: CreateDish } | { ok: false; fields: FieldErrors };

// Blank means "not set". Text that is not a number is reported on its field; the range and decimal rules come from the API schema.
export function validateDishDraft(draft: DishDraft): DishValidation {
  const fields: FieldErrors = {};
  const number = (text: string, field: string): number | null | undefined => {
    if (text.trim() === "") return null;
    const value = Number(text);
    if (Number.isFinite(value)) return value;
    fields[field] = "Enter a number";
    return undefined;
  };
  const kcalPerServing = number(draft.kcal, "kcalPerServing");
  const proteinGPerServing = number(draft.protein, "proteinGPerServing");
  const parsed = createDishSchema.safeParse({
    name: draft.name,
    kcalPerServing: kcalPerServing ?? null,
    proteinGPerServing: proteinGPerServing ?? null,
    ingredients: draft.ingredients,
  });
  if (!parsed.success) {
    const found = fromZodError(parsed.error).fields ?? {};
    for (const [name, message] of Object.entries(found)) fields[name.split(".")[0]] ??= message;
  }
  if (Object.keys(fields).length > 0 || !parsed.success) return { ok: false, fields };
  return { ok: true, payload: parsed.data };
}

// The line under a dish name in the list.
export function dishSummary(dish: Pick<Dish, "kcalPerServing" | "proteinGPerServing">): string {
  const kcal = dish.kcalPerServing === null ? "no kcal" : `${dish.kcalPerServing} kcal`;
  return dish.proteinGPerServing === null ? kcal : `${kcal} · ${dish.proteinGPerServing} g protein`;
}
