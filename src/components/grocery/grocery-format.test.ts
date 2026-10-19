import { describe, expect, it } from "vitest";
import { dishesLabel, periodLabel, shopLabel } from "./grocery-format.ts";

// Local-time constructor, so the tests hold in any time zone. Months are 1-based here.
const at = (month: number, day: number, hour = 0, minute = 0) => new Date(2026, month - 1, day, hour, minute);

describe("periodLabel", () => {
  it("names the first and last meal time", () => {
    const from = { date: "2026-10-21", slotName: "Breakfast" };
    const to = { date: "2026-10-23", slotName: "Breakfast" };
    expect(periodLabel({ from, to })).toBe("Wed 21 Oct breakfast – Fri 23 Oct breakfast");
  });

  it("is null when no meal time falls in the list", () => {
    expect(periodLabel({ from: null, to: null })).toBeNull();
  });
});

describe("shopLabel", () => {
  const now = at(10, 19, 12);

  it("gives the day and time of a trip", () => {
    const list = { index: 1, shoppingReason: "trip" as const, shoppingTime: at(10, 20, 21).toISOString() };
    expect(shopLabel(list, now)).toBe("Shop Tue 20 Oct, 21:00");
  });

  it("gives the marked time of a planned week", () => {
    const list = { index: 0, shoppingReason: "planned" as const, shoppingTime: at(10, 25, 15).toISOString() };
    expect(shopLabel(list, now)).toBe("Shop Sun 25 Oct, 15:00");
  });

  it("asks to plan the week when a first list is not planned and not started", () => {
    const list = { index: 0, shoppingReason: "week_start" as const, shoppingTime: at(10, 26).toISOString() };
    expect(shopLabel(list, now)).toBe("Shop when the week is planned, by Mon 26 Oct");
  });

  it("gives the week start for an unplanned first list that has already started", () => {
    const list = { index: 0, shoppingReason: "week_start" as const, shoppingTime: at(10, 19).toISOString() };
    expect(shopLabel(list, now)).toBe("Shop Mon 19 Oct, 00:00");
  });
});

describe("dishesLabel", () => {
  it("lists the dishes in lower case", () => {
    expect(dishesLabel(["Cauliflower curry", "Dal"])).toBe("for cauliflower curry, dal");
  });
});
