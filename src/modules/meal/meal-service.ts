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
import type { AddMealDish, Meal, MealDishChange, MealDishRow, Week } from "./meal-schema.ts";

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
  const weekMembers = members.map(({ id, name, kcalTarget, proteinTargetG }) => ({ id, name, kcalTarget, proteinTargetG }));
  return { weekStart, dates, mealSlots, meals: ordered, planned, members: weekMembers, nutrition };
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

const dishChanged = () => new AppError(409, "meal_dish_changed", "Someone else changed this dish just now");

// Idempotent. The member can be any member of the household.
// Refused with 409 when the dish changed since the client saw `version`. The version goes up only when something changed.
export async function setMealDishMember(
  householdId: string,
  mealDishId: string,
  memberId: string,
  eats: boolean,
  version: number,
): Promise<MealDishChange> {
  return withTransaction(async (tx) => {
    const locked = await repository.lockMealDish(householdId, mealDishId, tx);
    if (!locked) throw notFound("Dish in meal not found");
    if (!(await memberRepository.findInHousehold(householdId, memberId, tx))) throw notFound("Member not found");
    if (locked.version !== version) throw dishChanged();
    const changed = eats ? await repository.tickMembers(mealDishId, [memberId], tx) : await repository.untickMember(mealDishId, memberId, tx);
    if (changed > 0) {
      await repository.bumpVersion(mealDishId, tx);
      await repository.touchMeal(locked.mealId, tx);
    }
    const found = await repository.findMealDish(householdId, mealDishId, tx);
    if (!found) throw notFound("Dish in meal not found");
    return { id: found.id, version: found.version, memberIds: found.memberIds };
  });
}

// The meal goes too when it was the last dish. Refused with 409 when the dish changed since the client saw `version`.
export async function removeMealDish(householdId: string, mealDishId: string, version: number): Promise<void> {
  await withTransaction(async (tx) => {
    const locked = await repository.lockMealDish(householdId, mealDishId, tx);
    if (!locked) throw notFound("Dish in meal not found");
    if (locked.version !== version) throw dishChanged();
    await repository.lockMeal(householdId, locked.mealId, tx);
    await repository.removeMealDish(mealDishId, tx);
    if ((await repository.countMealDishes(locked.mealId, tx)) === 0) await repository.removeMeal(householdId, locked.mealId, tx);
    else await repository.touchMeal(locked.mealId, tx);
  });
}
