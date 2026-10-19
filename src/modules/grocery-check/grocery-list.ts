import { addDaysTo, localDateTimeToInstant, weekDates } from "@/lib/time/week.ts";

export type ShoppingReason = "trip" | "planned" | "week_start";

export interface GrocerySlot {
  id: string;
  name: string;
  // "HH:MM", local time.
  time: string;
}

export interface GroceryTrip {
  // 0 = Sunday ... 6 = Saturday.
  dayOfWeek: number;
  time: string;
}

export interface GroceryWeekPlan {
  weekStart: string;
  plannedAt: Date;
}

export interface GroceryMealDish {
  dishId: string;
  dishName: string;
  // How many members are ticked for the dish.
  eaterCount: number;
  ingredients: { id: string; name: string }[];
}

export interface GroceryMeal {
  date: string;
  mealSlotId: string;
  dishes: GroceryMealDish[];
}

export interface GroceryListInput {
  weekStartDay: number;
  slots: GrocerySlot[];
  trips: GroceryTrip[];
  weekPlans: GroceryWeekPlan[];
  // Consecutive weeks, in order.
  weekStarts: string[];
  meals: GroceryMeal[];
}

export interface GroceryOccurrence {
  date: string;
  slotName: string;
}

export interface GroceryItem {
  ingredientId: string;
  name: string;
  dishNames: string[];
}

export interface GroceryList {
  // "<weekStart>:<index>".
  key: string;
  weekStart: string;
  index: number;
  shoppingTime: Date;
  shoppingReason: ShoppingReason;
  // The first and last slot occurrence in the list; null when no slot falls in it.
  from: GroceryOccurrence | null;
  to: GroceryOccurrence | null;
  // How many planned meals fall in the list, whether or not they need anything.
  mealCount: number;
  items: GroceryItem[];
}

const byText = (a: string, b: string) => a.localeCompare(b);

// The shopping trips of a week as instants, earliest first.
function tripTimes(weekStart: string, weekStartDay: number, trips: GroceryTrip[]): Date[] {
  return trips
    .map((trip) => {
      const date = addDaysTo(weekStart, (trip.dayOfWeek - weekStartDay + 7) % 7);
      return localDateTimeToInstant(date, trip.time);
    })
    .sort((a, b) => a.getTime() - b.getTime());
}

// The number of trips strictly earlier than the instant: the number of the list it belongs to.
function listIndexAt(instant: Date, trips: Date[]): number {
  return trips.filter((trip) => trip.getTime() < instant.getTime()).length;
}

export function buildGroceryLists(input: GroceryListInput): GroceryList[] {
  const { weekStartDay, slots, trips, weekPlans, weekStarts, meals } = input;
  const slotById = new Map(slots.map((slot) => [slot.id, slot]));
  const plannedAtByWeek = new Map(weekPlans.map((plan) => [plan.weekStart, plan.plannedAt]));
  const lists: GroceryList[] = [];

  for (const weekStart of weekStarts) {
    const dates = weekDates(weekStart);
    const times = tripTimes(weekStart, weekStartDay, trips);
    const weekLists: GroceryList[] = [];

    // A week's first list starts at the mark, or at the week start when the mark came later or is missing.
    const weekStartInstant = localDateTimeToInstant(weekStart, "00:00");
    const plannedAt = plannedAtByWeek.get(weekStart);
    const planned = plannedAt !== undefined && plannedAt.getTime() < weekStartInstant.getTime();
    // Never earlier than the last list of the previous built week.
    const previousLast = lists.at(-1)?.shoppingTime;
    const rawFirst = planned ? plannedAt : weekStartInstant;
    const first = previousLast && previousLast.getTime() > rawFirst.getTime() ? previousLast : rawFirst;

    for (let index = 0; index <= times.length; index++) {
      weekLists.push({
        key: `${weekStart}:${index}`,
        weekStart,
        index,
        shoppingTime: index === 0 ? first : times[index - 1],
        shoppingReason: index > 0 ? "trip" : planned ? "planned" : "week_start",
        from: null,
        to: null,
        mealCount: 0,
        items: [],
      });
    }

    // Slot occurrences in time order; the sort is stable, so equal times keep the slot order.
    const occurrences = dates
      .flatMap((date) => slots.map((slot) => ({ date, slot, instant: localDateTimeToInstant(date, slot.time) })))
      .sort((a, b) => a.instant.getTime() - b.instant.getTime());
    for (const occurrence of occurrences) {
      const list = weekLists[listIndexAt(occurrence.instant, times)];
      const entry = { date: occurrence.date, slotName: occurrence.slot.name };
      list.from ??= entry;
      list.to = entry;
    }

    const itemsByList = weekLists.map(() => new Map<string, { name: string; dishNames: Set<string> }>());
    for (const meal of meals) {
      if (!dates.includes(meal.date)) continue;
      const slot = slotById.get(meal.mealSlotId);
      if (!slot) throw new Error(`Unknown meal slot ${meal.mealSlotId}`);
      const index = listIndexAt(localDateTimeToInstant(meal.date, slot.time), times);
      weekLists[index].mealCount++;
      for (const dish of meal.dishes) {
        if (dish.eaterCount <= 0) continue;
        for (const ingredient of dish.ingredients) {
          const item = itemsByList[index].get(ingredient.id) ?? { name: ingredient.name, dishNames: new Set<string>() };
          item.dishNames.add(dish.dishName);
          itemsByList[index].set(ingredient.id, item);
        }
      }
    }
    weekLists.forEach((list, index) => {
      list.items = [...itemsByList[index]]
        .map(([ingredientId, item]) => ({ ingredientId, name: item.name, dishNames: [...item.dishNames].sort(byText) }))
        .sort((a, b) => byText(a.name, b.name));
    });

    lists.push(...weekLists);
  }

  return lists;
}

// The last list, in order, whose shopping time has come; null when none has.
export function pickCurrentList(lists: GroceryList[], now: Date): GroceryList | null {
  let current: GroceryList | null = null;
  for (const list of lists) {
    if (list.shoppingTime.getTime() <= now.getTime()) current = list;
  }
  return current;
}
