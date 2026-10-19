import { uniqueViolation } from "@/db/errors";
import { withTransaction } from "@/db/transaction";
import { AppError, notFound } from "@/lib/http/errors";
import { weekDates } from "@/lib/time/week";
import { createDish } from "../dish/dish-service.ts";
import * as dishRepository from "../dish/dish-repository.ts";
import * as householdRepository from "../household/household-repository.ts";
import * as mealSlotRepository from "../meal-slot/meal-slot-repository.ts";
import * as memberRepository from "../member/member-repository.ts";
import * as weekPlanRepository from "../week-plan/week-plan-repository.ts";
import { assertWeekStart } from "../week-plan/week-plan-service.ts";
import * as repository from "./meal-repository.ts";
import { computeNutrition } from "./meal-nutrition.ts";
import type { AddMealDish, Meal, MealDishRow, Week } from "./meal-schema.ts";

export async function getWeek(householdId: string, weekStart: string): Promise<Week> {
  const household = await householdRepository.findById(householdId);
  if (!household) throw notFound("Household not found");
  assertWeekStart(weekStart, household.weekStartDay);
  const dates = weekDates(weekStart);

  const [mealSlots, members, rows, planned] = await Promise.all([
    mealSlotRepository.listByHousehold(householdId),
    memberRepository.listByHousehold(householdId),
    repository.listMealDishes(householdId, dates[0], dates[6]),
    weekPlanRepository.find(householdId, weekStart),
  ]);

  const slotPosition = new Map(mealSlots.map((slot, index) => [slot.id, index]));
  const meals = new Map<string, Meal>();
  for (const { mealId, date, mealSlotId, ...dish } of rows) {
    const found = meals.get(mealId) ?? { id: mealId, date, mealSlotId, dishes: [] };
    found.dishes.push(dish);
    meals.set(mealId, found);
  }
  const ordered = [...meals.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || (slotPosition.get(a.mealSlotId) ?? 0) - (slotPosition.get(b.mealSlotId) ?? 0),
  );

  const nutrition = computeNutrition(
    dates,
    members,
    rows.map((row) => ({ date: row.date, kcal: row.kcalPerServing, proteinG: row.proteinGPerServing, memberIds: row.memberIds })),
  );
  return { weekStart, dates, mealSlots, meals: ordered, planned, nutrition };
}

// The dish is ticked for every member who eats in the slot. A dish name that is new creates the dish.
export async function addDishToMeal(householdId: string, input: AddMealDish): Promise<MealDishRow> {
  try {
    return await withTransaction(async (tx) => {
      if ((await mealSlotRepository.countInHousehold(householdId, [input.mealSlotId], tx)) === 0) {
        throw notFound("Meal slot not found");
      }
      let dishId: string;
      if ("dishId" in input) {
        if (!(await dishRepository.findById(householdId, input.dishId, tx))) throw notFound("Dish not found");
        dishId = input.dishId;
      } else {
        dishId = (await createDish(householdId, { name: input.dishName, kcalPerServing: null, proteinGPerServing: null, ingredients: [] }, tx)).id;
      }
      const mealId = await repository.ensureMeal(householdId, input.date, input.mealSlotId, tx);
      const mealDishId = await repository.insertMealDish(mealId, dishId, tx);
      await repository.tickMembers(mealDishId, await memberRepository.idsInSlot(householdId, input.mealSlotId, tx), tx);
      const added = await repository.findMealDish(householdId, mealDishId, tx);
      if (!added) throw notFound("Meal not found");
      return added;
    });
  } catch (error) {
    if (uniqueViolation(error) === "meal_dish_meal_dish_idx") {
      throw new AppError(409, "dish_already_in_meal", "This dish is already in the meal");
    }
    throw error;
  }
}

// Idempotent. The member can be any member of the household.
export async function setMealDishMember(householdId: string, mealDishId: string, memberId: string, eats: boolean): Promise<void> {
  await withTransaction(async (tx) => {
    const found = await repository.findMealDish(householdId, mealDishId, tx);
    if (!found) throw notFound("Dish in meal not found");
    if (!(await memberRepository.findInHousehold(householdId, memberId, tx))) throw notFound("Member not found");
    if (eats) await repository.tickMembers(mealDishId, [memberId], tx);
    else await repository.untickMember(mealDishId, memberId, tx);
    await repository.touchMeal(found.mealId, tx);
  });
}

// The meal goes too when it was the last dish.
export async function removeMealDish(householdId: string, mealDishId: string): Promise<void> {
  await withTransaction(async (tx) => {
    const found = await repository.findMealDish(householdId, mealDishId, tx);
    if (!found) throw notFound("Dish in meal not found");
    await repository.lockMeal(householdId, found.mealId, tx);
    await repository.removeMealDish(mealDishId, tx);
    if ((await repository.countMealDishes(found.mealId, tx)) === 0) await repository.removeMeal(householdId, found.mealId, tx);
    else await repository.touchMeal(found.mealId, tx);
  });
}
