import { describe, expect, it } from "vitest";
import type { MemberDayNutrition } from "@/modules/meal/meal-nutrition";
import { changeFailure, copiedLabel, longDay, missingNote, nutritionSentence, plannedLabel, shortDay, weekRange, weekTag } from "./plan-format.ts";

const day: MemberDayNutrition = {
  memberId: "m",
  date: "2026-10-29",
  kcal: 1850,
  proteinG: 120,
  dishesWithoutKcal: 0,
  dishesWithoutProtein: 0,
  kcalStatus: { status: "under", difference: 150 },
  proteinStatus: { status: "under", difference: 30 },
};

describe("dates", () => {
  it("formats days and the week range", () => {
    expect(shortDay("2026-10-29")).toBe("Thu 29 Oct");
    expect(longDay("2026-10-29")).toBe("Thursday 29 Oct");
    expect(weekRange("2026-10-26")).toBe("Mon 26 Oct – Sun 1 Nov");
  });
});

describe("weekTag", () => {
  it("names the week relative to this one", () => {
    expect(weekTag(0)).toBe("This week");
    expect(weekTag(1)).toBe("Next week");
    expect(weekTag(3)).toBe("In 3 weeks");
    expect(weekTag(-1)).toBe("1 week ago");
    expect(weekTag(-2)).toBe("2 weeks ago");
  });
});

describe("plannedLabel", () => {
  it("shows the local time", () => {
    const planned = { at: new Date(2026, 9, 25, 14, 5).toISOString(), byMemberId: "m", byName: "Vishal" };
    expect(plannedLabel(planned)).toBe("Planned · Sun 14:05 by Vishal");
    expect(plannedLabel({ ...planned, byName: null })).toBe("Planned · Sun 14:05");
  });
});

describe("nutritionSentence", () => {
  it("reads under, over and on target", () => {
    expect(nutritionSentence(day, { kcalTarget: 2000, proteinTargetG: 150 })).toBe(
      "1,850 / 2,000 kcal · 150 under ▼ · 120 / 150 g protein · 30 under ▼",
    );
    expect(
      nutritionSentence({ ...day, kcal: 2150, kcalStatus: { status: "over", difference: 150 } }, { kcalTarget: 2000, proteinTargetG: 150 }),
    ).toContain("2,150 / 2,000 kcal · 150 over ▲");
    expect(
      nutritionSentence({ ...day, kcalStatus: { status: "on_target", difference: 20 } }, { kcalTarget: 1870, proteinTargetG: 150 }),
    ).toContain("1,850 / 1,870 kcal · on target");
  });

  it("shows just the total without a target", () => {
    expect(nutritionSentence({ ...day, proteinG: 62.5, kcalStatus: null, proteinStatus: null }, { kcalTarget: null, proteinTargetG: null })).toBe(
      "1,850 kcal · 62.5 g protein",
    );
  });
});

describe("missingNote", () => {
  it("counts dishes without values", () => {
    expect(missingNote(day)).toBeNull();
    expect(missingNote({ ...day, dishesWithoutKcal: 2 })).toBe("2 dishes have no kcal");
    expect(missingNote({ ...day, dishesWithoutKcal: 1, dishesWithoutProtein: 3 })).toBe("1 dish has no kcal · 3 dishes have no protein");
  });
});

describe("changeFailure", () => {
  it("explains a dish added twice and a dish changed by someone else, and refreshes", () => {
    expect(changeFailure({ status: 409, code: "dish_already_in_meal", message: "x" }, "add")).toEqual({
      message: "Already in this meal",
      refresh: true,
      conflict: false,
    });
    expect(changeFailure({ status: 404, code: "not_found", message: "x" }, "dish")).toEqual({
      message: "This was just changed by someone else",
      refresh: true,
      conflict: false,
    });
  });

  it("maps meal_dish_changed to a conflict the person chooses about, and refreshes", () => {
    expect(changeFailure({ status: 409, code: "meal_dish_changed", message: "x" }, "dish")).toEqual({
      message: "Someone else changed this just now",
      refresh: true,
      conflict: true,
    });
  });

  it("shows the API message for anything else", () => {
    expect(changeFailure({ status: 500, code: "internal", message: "Boom" }, "dish")).toEqual({ message: "Boom", refresh: false, conflict: false });
    expect(changeFailure({ status: 404, code: "not_found", message: "Dish not found" }, "add")).toEqual({
      message: "Dish not found",
      refresh: false,
      conflict: false,
    });
    expect(changeFailure({ status: 409, code: "meal_dish_changed", message: "Nope" }, "add")).toEqual({
      message: "Nope",
      refresh: false,
      conflict: false,
    });
  });
});

describe("copiedLabel", () => {
  it("says what a copy added", () => {
    expect(copiedLabel(0)).toBe("Nothing new to copy");
    expect(copiedLabel(1)).toBe("Added 1 dish");
    expect(copiedLabel(5)).toBe("Added 5 dishes");
  });
});
