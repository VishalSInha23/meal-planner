import { withTransaction } from "@/db/transaction";
import { uniqueViolation } from "@/db/errors";
import { conflict, notFound } from "@/lib/http/errors";
import { resolveIngredientIds } from "../ingredient/ingredient-service.ts";
import * as repository from "./dish-repository.ts";
import type { CreateDish, Dish, ListDishes, UpdateDish } from "./dish-schema.ts";

// A name clash becomes a 409 on the name field. The check runs after the failed transaction ended.
async function dishConflict(householdId: string, name: string | undefined, error: unknown): Promise<unknown> {
  if (uniqueViolation(error) !== "dish_household_name_idx" || name === undefined) return error;
  const archived = (await repository.findByName(householdId, name))?.archivedAt != null;
  const message = archived ? "An archived dish with this name already exists" : "A dish with this name already exists";
  return conflict(message, { name: message });
}

export function listDishes(householdId: string, filter: ListDishes): Promise<Dish[]> {
  return repository.list(householdId, filter);
}

export async function getDish(householdId: string, id: string): Promise<Dish> {
  const found = await repository.findById(householdId, id);
  if (!found) throw notFound("Dish not found");
  return found;
}

export async function createDish(householdId: string, input: CreateDish): Promise<Dish> {
  const { ingredients, ...values } = input;
  try {
    const id = await withTransaction(async (tx) => {
      const dishId = await repository.insert(householdId, values, tx);
      await repository.replaceIngredients(dishId, await resolveIngredientIds(householdId, ingredients, tx), tx);
      return dishId;
    });
    return await getDish(householdId, id);
  } catch (error) {
    throw await dishConflict(householdId, input.name, error);
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
    throw await dishConflict(householdId, input.name, error);
  }
}

export async function setDishArchived(householdId: string, id: string, archived: boolean): Promise<Dish> {
  if (!(await repository.setArchived(householdId, id, archived))) throw notFound("Dish not found");
  return getDish(householdId, id);
}
