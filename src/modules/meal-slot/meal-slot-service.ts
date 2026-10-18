import { uniqueViolation } from "@/db/errors";
import { conflict, notFound } from "@/lib/http/errors";
import * as repository from "./meal-slot-repository.ts";
import type { CreateMealSlot, MealSlot, UpdateMealSlot } from "./meal-slot-schema.ts";

// A unique-constraint violation becomes a 409 that names the field to fix.
function slotConflict(error: unknown): unknown {
  const constraint = uniqueViolation(error);
  if (constraint === "meal_slot_household_name_idx") {
    return conflict("A meal slot with this name already exists", { name: "Another slot has this name" });
  }
  if (constraint === "meal_slot_household_time_idx") {
    return conflict("A meal slot at this time already exists", { time: "Another slot has this time" });
  }
  return error;
}

export function listMealSlots(householdId: string): Promise<MealSlot[]> {
  return repository.listByHousehold(householdId);
}

export async function addMealSlot(householdId: string, input: CreateMealSlot): Promise<MealSlot> {
  try {
    const [slot] = await repository.insertMany(householdId, [input]);
    return slot;
  } catch (error) {
    throw slotConflict(error);
  }
}

export async function updateMealSlot(householdId: string, id: string, input: UpdateMealSlot): Promise<MealSlot> {
  try {
    const slot = await repository.update(householdId, id, input);
    if (!slot) throw notFound("Meal slot not found");
    return slot;
  } catch (error) {
    throw slotConflict(error);
  }
}

// Meals using the slot will block this once meals exist.
export async function removeMealSlot(householdId: string, id: string): Promise<void> {
  if (!(await repository.remove(householdId, id))) throw notFound("Meal slot not found");
}
