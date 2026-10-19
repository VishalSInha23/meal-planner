import { describe, expect, it } from "vitest";
import {
  buildGroceryLists,
  pickCurrentList,
  type GroceryListInput,
  type GroceryMeal,
  type GroceryMealDish,
} from "./grocery-list.ts";

// Local-time constructors, so the tests hold in any time zone. Months are 1-based here.
const at = (month: number, day: number, hour = 0, minute = 0) => new Date(2026, month - 1, day, hour, minute);

const slots = [
  { id: "b", name: "Breakfast", time: "08:00" },
  { id: "l", name: "Lunch", time: "13:00" },
  { id: "d", name: "Dinner", time: "20:00" },
];

const dish = (name: string, ingredients: string[], eaterCount = 1): GroceryMealDish => ({
  dishId: `dish-${name}`,
  dishName: name,
  eaterCount,
  ingredients: ingredients.map((ingredient) => ({ id: `ing-${ingredient}`, name: ingredient })),
});
const meal = (date: string, mealSlotId: string, ...dishes: GroceryMealDish[]): GroceryMeal => ({ date, mealSlotId, dishes });

// 2026-10-19 is a Monday. Trips: Tuesday 21:00 and Friday 10:00.
const monday = "2026-10-19";
const nextMonday = "2026-10-26";
const base: GroceryListInput = {
  weekStartDay: 1,
  slots,
  trips: [
    { dayOfWeek: 2, time: "21:00" },
    { dayOfWeek: 5, time: "10:00" },
  ],
  weekPlans: [],
  weekStarts: [monday],
  meals: [],
};

describe("buildGroceryLists: the spec's worked example", () => {
  const input: GroceryListInput = {
    ...base,
    weekStarts: [monday, nextMonday],
    weekPlans: [
      { weekStart: monday, plannedAt: at(10, 18, 14) },
      { weekStart: nextMonday, plannedAt: at(10, 25, 14) },
    ],
    meals: [
      meal("2026-10-19", "b", dish("Oats", ["oats", "milk"])),
      meal("2026-10-20", "d", dish("Dal", ["dal", "salt"])),
      meal("2026-10-21", "b", dish("Toast", ["bread"])),
      meal("2026-10-23", "b", dish("Eggs", ["egg"])),
      meal("2026-10-23", "l", dish("Rice", ["rice"])),
      meal("2026-10-25", "d", dish("Pasta", ["pasta"])),
      meal("2026-10-26", "b", dish("Poha", ["poha"])),
    ],
  };
  const lists = buildGroceryLists(input);

  it("cuts the week into three lists", () => {
    // Trips: Tue 20 21:00, Fri 23 10:00. Tue dinner 20:00 < 21:00 -> list 0. Wed breakfast -> 1 (one trip earlier).
    // Fri breakfast 08:00 < 10:00 -> still 1. Fri lunch 13:00 and everything after -> 2.
    expect(lists.slice(0, 3).map((list) => [list.key, list.from, list.to])).toEqual([
      ["2026-10-19:0", { date: "2026-10-19", slotName: "Breakfast" }, { date: "2026-10-20", slotName: "Dinner" }],
      ["2026-10-19:1", { date: "2026-10-21", slotName: "Breakfast" }, { date: "2026-10-23", slotName: "Breakfast" }],
      ["2026-10-19:2", { date: "2026-10-23", slotName: "Lunch" }, { date: "2026-10-25", slotName: "Dinner" }],
    ]);
  });

  it("puts the meals in their lists", () => {
    expect(lists.slice(0, 3).map((list) => list.items.map((item) => item.name))).toEqual([
      ["dal", "milk", "oats", "salt"],
      ["bread", "egg"],
      ["pasta", "rice"],
    ]);
    expect(lists[0].items[0]).toEqual({ ingredientId: "ing-dal", name: "dal", dishNames: ["Dal"] });
  });

  it("gives each list its shopping time", () => {
    // List 0: marked planned Sun 18 14:00. Lists 1 and 2: the trips. Next week: marked Sun 25 14:00.
    expect(lists.map((list) => [list.shoppingTime, list.shoppingReason])).toEqual([
      [at(10, 18, 14), "planned"],
      [at(10, 20, 21), "trip"],
      [at(10, 23, 10), "trip"],
      [at(10, 25, 14), "planned"],
      [at(10, 27, 21), "trip"],
      [at(10, 30, 10), "trip"],
    ]);
    expect(lists[3].items.map((item) => item.name)).toEqual(["poha"]);
  });

  it("picks the current list", () => {
    // Sat 24 12:00: after Fri 10:00 and before Sun 25 14:00 -> list 3 of the week (index 2).
    expect(pickCurrentList(lists, at(10, 24, 12))?.key).toBe("2026-10-19:2");
    // Sun 25 15:00: next week was marked at 14:00 -> its first list.
    expect(pickCurrentList(lists, at(10, 25, 15))?.key).toBe("2026-10-26:0");
    // Sun 25 15:00 without the mark: still the old list.
    const unmarked = buildGroceryLists({ ...input, weekPlans: [input.weekPlans[0]] });
    expect(pickCurrentList(unmarked, at(10, 25, 15))?.key).toBe("2026-10-19:2");
    // Mon 26 00:00 without the mark: the week start has come. Reason is week_start.
    expect(pickCurrentList(unmarked, at(10, 26, 0))?.key).toBe("2026-10-26:0");
    expect(unmarked[3].shoppingReason).toBe("week_start");
    expect(unmarked[3].shoppingTime).toEqual(at(10, 26, 0));
  });
});

describe("buildGroceryLists: edge cases", () => {
  it("sends a meal at exactly a trip's time to the earlier list", () => {
    // Trip Tue 20:00 equals Tue dinner 20:00: zero trips strictly earlier -> list 0. Wed breakfast -> list 1.
    const lists = buildGroceryLists({
      ...base,
      trips: [{ dayOfWeek: 2, time: "20:00" }],
      meals: [meal("2026-10-20", "d", dish("Dal", ["dal"])), meal("2026-10-21", "b", dish("Toast", ["bread"]))],
    });
    expect(lists).toHaveLength(2);
    expect(lists[0].items.map((item) => item.name)).toEqual(["dal"]);
    expect(lists[0].to).toEqual({ date: "2026-10-20", slotName: "Dinner" });
    expect(lists[1].items.map((item) => item.name)).toEqual(["bread"]);
    expect(lists[1].from).toEqual({ date: "2026-10-21", slotName: "Breakfast" });
  });

  it("makes one list per week without trips", () => {
    const lists = buildGroceryLists({ ...base, trips: [], weekStarts: [monday, nextMonday] });
    // Each week: 1 list from the week's first slot to its last. Shopping at the week start (00:00).
    expect(lists.map((list) => [list.key, list.from?.date, list.to?.date, list.shoppingTime])).toEqual([
      ["2026-10-19:0", "2026-10-19", "2026-10-25", at(10, 19)],
      ["2026-10-26:0", "2026-10-26", "2026-11-01", at(10, 26)],
    ]);
    expect(lists[0].from?.slotName).toBe("Breakfast");
    expect(lists[0].to?.slotName).toBe("Dinner");
    expect(lists[0].items).toEqual([]);
  });

  it("gives an empty first list when a trip comes before the week's first slot", () => {
    // Trip Mon 06:00 is before Mon breakfast 08:00: list 0 has no slot, list 1 has them all.
    const lists = buildGroceryLists({ ...base, trips: [{ dayOfWeek: 1, time: "06:00" }] });
    expect(lists[0]).toMatchObject({ from: null, to: null, items: [], shoppingTime: at(10, 19) });
    expect(lists[1].shoppingTime).toEqual(at(10, 19, 6));
    expect(lists[1].from).toEqual({ date: "2026-10-19", slotName: "Breakfast" });
  });

  it("handles a week that starts on Wednesday", () => {
    // 2026-10-21 is a Wednesday. A Monday (1) trip at 09:00 falls on 26 Oct: (1 - 3 + 7) % 7 = 5 days in.
    // Mon 26 breakfast 08:00 is before it; lunch 13:00 after it. A meal on Tue 20 is in no built week.
    const lists = buildGroceryLists({
      ...base,
      weekStartDay: 3,
      weekStarts: ["2026-10-21"],
      trips: [{ dayOfWeek: 1, time: "09:00" }],
      meals: [
        meal("2026-10-20", "b", dish("Old", ["old"])),
        meal("2026-10-26", "b", dish("Poha", ["poha"])),
        meal("2026-10-26", "l", dish("Rice", ["rice"])),
      ],
    });
    expect(lists.map((list) => [list.from, list.to, list.shoppingTime])).toEqual([
      [{ date: "2026-10-21", slotName: "Breakfast" }, { date: "2026-10-26", slotName: "Breakfast" }, at(10, 21)],
      [{ date: "2026-10-26", slotName: "Lunch" }, { date: "2026-10-27", slotName: "Dinner" }, at(10, 26, 9)],
    ]);
    expect(lists.map((list) => list.items.map((item) => item.name))).toEqual([["poha"], ["rice"]]);
  });

  it("does not let a week planned early become current before the week in between", () => {
    // One trip, Friday 10:00 each week. Week 1 marked Sun 18 14:00; week 2 marked Mon 12 and week 3 Tue 13 (very early).
    // Week 1 last list: Fri 23 10:00. Week 2 first: max(Oct 12, Oct 23 10:00) = Fri 23 10:00.
    // Week 2 last: Fri 30 10:00. Week 3 first: max(Oct 13, Oct 30 10:00) = Fri 30 10:00.
    const lists = buildGroceryLists({
      ...base,
      trips: [{ dayOfWeek: 5, time: "10:00" }],
      weekStarts: [monday, nextMonday, "2026-11-02"],
      weekPlans: [
        { weekStart: monday, plannedAt: at(10, 18, 14) },
        { weekStart: nextMonday, plannedAt: at(10, 12) },
        { weekStart: "2026-11-02", plannedAt: at(10, 13) },
      ],
    });
    expect(lists.map((list) => list.shoppingTime)).toEqual([
      at(10, 18, 14),
      at(10, 23, 10),
      at(10, 23, 10),
      at(10, 30, 10),
      at(10, 30, 10),
      at(11, 6, 10),
    ]);
    // Before Fri 30 10:00 week 2's first list is current and week 3 is not; at that instant week 3 is (the last of equal times).
    expect(pickCurrentList(lists, at(10, 29, 12))?.key).toBe("2026-10-26:0");
    expect(pickCurrentList(lists, at(10, 30, 10))?.key).toBe("2026-11-02:0");
  });

  it("uses the week start when the mark came after it", () => {
    // Marked Tue 20 09:00, after the week start Mon 19 00:00: counts as not marked.
    const lists = buildGroceryLists({
      ...base,
      trips: [],
      weekPlans: [{ weekStart: monday, plannedAt: at(10, 20, 9) }],
    });
    expect(lists[0]).toMatchObject({ shoppingTime: at(10, 19), shoppingReason: "week_start" });
  });

  it("ignores dishes nobody eats and merges shared ingredients", () => {
    // Saffron: eaterCount 0 -> not listed. Onion is in Curry and Soup -> one item, dishes sorted. Curry twice -> once.
    // Names sort by locale, not by code point: apple before Banana.
    const lists = buildGroceryLists({
      ...base,
      trips: [],
      meals: [
        meal("2026-10-19", "b", dish("Soup", ["onion", "Banana"]), dish("Fancy", ["saffron"], 0)),
        meal("2026-10-19", "d", dish("Curry", ["onion", "apple"], 2)),
        meal("2026-10-20", "d", dish("Curry", ["onion"], 3)),
      ],
    });
    expect(lists[0].items).toEqual([
      { ingredientId: "ing-apple", name: "apple", dishNames: ["Curry"] },
      { ingredientId: "ing-Banana", name: "Banana", dishNames: ["Soup"] },
      { ingredientId: "ing-onion", name: "onion", dishNames: ["Curry", "Soup"] },
    ]);
  });

  it("rejects a meal in an unknown slot", () => {
    expect(() => buildGroceryLists({ ...base, meals: [meal("2026-10-19", "x", dish("Soup", ["onion"]))] })).toThrow(
      "Unknown meal slot x",
    );
  });
});

describe("pickCurrentList", () => {
  it("returns null before the first shopping time", () => {
    const lists = buildGroceryLists({ ...base, weekPlans: [{ weekStart: monday, plannedAt: at(10, 18, 14) }] });
    expect(pickCurrentList(lists, at(10, 18, 13, 59))).toBeNull();
    expect(pickCurrentList(lists, at(10, 18, 14))?.key).toBe("2026-10-19:0");
    expect(pickCurrentList([], at(10, 18))).toBeNull();
  });
});
