import { badRequest, notFound } from "@/lib/http/errors";
import { addDaysTo, localToday, weekStartFor } from "@/lib/time/week";
import * as householdRepository from "../household/household-repository.ts";
import * as ingredientRepository from "../ingredient/ingredient-repository.ts";
import * as mealSlotRepository from "../meal-slot/meal-slot-repository.ts";
import * as mealRepository from "../meal/meal-repository.ts";
import * as shoppingTripRepository from "../shopping-trip/shopping-trip-repository.ts";
import * as weekPlanRepository from "../week-plan/week-plan-repository.ts";
import * as repository from "./grocery-check-repository.ts";
import { listKeySchema, type GroceryListView, type GroceryLists } from "./grocery-check-schema.ts";
import { buildGroceryLists, pickCurrentList } from "./grocery-list.ts";

const WEEKS_BEFORE = 2;
const DAY_MS = 86_400_000;

// The lists from two weeks before the current week through the last week that has meals, with their checks.
export async function getGroceryLists(householdId: string, now: Date): Promise<GroceryLists> {
  const household = await householdRepository.findById(householdId);
  if (!household) throw notFound("Household not found");
  const { weekStartDay } = household;
  const currentWeek = weekStartFor(localToday(now), weekStartDay);
  const firstWeek = addDaysTo(currentWeek, -7 * WEEKS_BEFORE);

  const [slots, trips, weekPlans, meals] = await Promise.all([
    mealSlotRepository.listByHousehold(householdId),
    shoppingTripRepository.listByHousehold(householdId),
    weekPlanRepository.listFrom(householdId, firstWeek),
    mealRepository.listGroceryMeals(householdId, firstWeek),
  ]);

  let lastWeek = currentWeek;
  for (const { date } of meals) {
    const week = weekStartFor(date, weekStartDay);
    if (week > lastWeek) lastWeek = week;
  }
  const weekStarts: string[] = [];
  for (let week = firstWeek; week <= lastWeek; week = addDaysTo(week, 7)) weekStarts.push(week);

  const lists = buildGroceryLists({ weekStartDay, slots, trips, weekPlans, weekStarts, meals });
  const current = pickCurrentList(lists, now) ?? lists[0];
  const currentIndex = lists.indexOf(current);
  const weekBefore = current.shoppingTime.getTime() - 7 * DAY_MS;

  const previous = lists.slice(0, currentIndex).filter((list) => list.shoppingTime.getTime() >= weekBefore).reverse();
  const upcoming = lists.slice(currentIndex + 1).filter((list) => list.mealCount > 0);

  const shown = [current, ...previous, ...upcoming];
  const checks = await repository.listByKeys(
    householdId,
    shown.map((list) => list.key),
  );
  const checked = new Set(checks.map((check) => `${check.listKey}|${check.ingredientId}`));
  const view = (list: (typeof lists)[number]): GroceryListView => ({
    ...list,
    shoppingTime: list.shoppingTime.toISOString(),
    items: list.items.map((item) => ({ ...item, checked: checked.has(`${list.key}|${item.ingredientId}`) })),
  });
  return { current: view(current), previous: previous.map(view), upcoming: upcoming.map(view) };
}

// Idempotent. The list key only has to be well formed: a list that does not exist (any more) can still hold a check.
export async function setCheck(
  householdId: string,
  memberId: string,
  listKey: string,
  ingredientId: string,
  checked: boolean,
): Promise<void> {
  if (!listKeySchema.safeParse(listKey).success) {
    throw badRequest("The list key is not valid", { key: "Use a list key like 2026-10-19:0" });
  }
  if (!(await ingredientRepository.existsInHousehold(householdId, ingredientId))) throw notFound("Ingredient not found");
  if (checked) await repository.insert(householdId, listKey, ingredientId, memberId);
  else await repository.remove(householdId, listKey, ingredientId);
}
