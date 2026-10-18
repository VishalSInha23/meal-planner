import { uniqueViolation } from "@/db/errors";
import { conflict, notFound } from "@/lib/http/errors";
import * as repository from "./shopping-trip-repository.ts";
import type { CreateShoppingTrip, ShoppingTrip } from "./shopping-trip-schema.ts";

export function listShoppingTrips(householdId: string): Promise<ShoppingTrip[]> {
  return repository.listByHousehold(householdId);
}

export async function addShoppingTrip(householdId: string, input: CreateShoppingTrip): Promise<ShoppingTrip> {
  try {
    const [trip] = await repository.insertMany(householdId, [input]);
    return trip;
  } catch (error) {
    if (uniqueViolation(error) === "shopping_trip_household_day_time_idx") {
      throw conflict("A shopping trip at this day and time already exists", { time: "Another trip is at this day and time" });
    }
    throw error;
  }
}

export async function removeShoppingTrip(householdId: string, id: string): Promise<void> {
  if (!(await repository.remove(householdId, id))) throw notFound("Shopping trip not found");
}
