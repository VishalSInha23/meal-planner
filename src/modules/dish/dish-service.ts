import { withTransaction, type Tx } from "@/db/transaction";
import { uniqueViolation } from "@/db/errors";
import { conflict, notFound } from "@/lib/http/errors";
import * as mealRepository from "../meal/meal-repository.ts";
import { resolveIngredientIds } from "../ingredient/ingredient-service.ts";
import * as repository from "./dish-repository.ts";
import type { CreateDish, Dish, ListDishes, UpdateDish } from "./dish-schema.ts";

// A name clash becomes a 409 on the name field.
function dishConflict(name: string | undefined, error: unknown): unknown {
  if (uniqueViolation(error) !== "dish_household_name_idx" || name === undefined) return error;
  const message = "A dish with this name already exists";
  return conflict(message, { name: message });
}

export function listDishes(householdId: string, filter: ListDishes): Promise<Dish[]> {
  return repository.list(householdId, filter);
}

export async function getDish(householdId: string, id: string, tx?: Tx): Promise<Dish> {
  const found = await repository.findById(householdId, id, tx);
  if (!found) throw notFound("Dish not found");
  return found;
}

// Pass tx to create the dish as part of a larger transaction.
export async function createDish(householdId: string, input: CreateDish, tx?: Tx): Promise<Dish> {
  const { ingredients, ...values } = input;
  const insert = async (db: Tx) => {
    const dishId = await repository.insert(householdId, values, db);
    await repository.replaceIngredients(dishId, await resolveIngredientIds(householdId, ingredients, db), db);
    return dishId;
  };
  try {
    const id = tx ? await insert(tx) : await withTransaction(insert);
    return await getDish(householdId, id, tx);
  } catch (error) {
    throw dishConflict(input.name, error);
  }
}

export async function updateDish(householdId: string, id: string, input: UpdateDish): Promise<Dish> {
  const { ingredients, ...values } = input;
  try {
    await withTransaction(async (tx) => {
      if (!(await repository.update(householdId, id, values, tx))) throw notFound("Dish not found");
      if (ingredients) await repository.replaceIngredients(id, await resolveIngredientIds(householdId, ingredients, tx), tx);
    });
    return await getDish(householdId, id);
  } catch (error) {
    throw dishConflict(input.name, error);
  }
}

export async function deleteDish(householdId: string, id: string): Promise<void> {
  await withTransaction(async (tx) => {
    if (!(await repository.remove(householdId, id, tx))) throw notFound("Dish not found");
    // The dish left every meal it was in; meals that held only it go too.
    await mealRepository.removeEmptyMeals(householdId, tx);
  });
}
