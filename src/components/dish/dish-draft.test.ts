import { describe, expect, it } from "vitest";
import { addIngredient, dishSummary, draftFromDish, emptyDishDraft, validateDishDraft } from "./dish-draft.ts";

describe("addIngredient", () => {
  it("trims, skips blanks and skips a name already there ignoring case", () => {
    expect(addIngredient(["Onion"], "  Garlic ")).toEqual(["Onion", "Garlic"]);
    expect(addIngredient(["Onion"], "   ")).toEqual(["Onion"]);
    expect(addIngredient(["Onion"], "ONION")).toEqual(["Onion"]);
  });
});

describe("validateDishDraft", () => {
  const draft = (changes: object) => ({ ...emptyDishDraft(), name: "Dal", ...changes });

  it("turns blank numbers into null and text into numbers", () => {
    expect(validateDishDraft(draft({}))).toEqual({
      ok: true,
      payload: { name: "Dal", kcalPerServing: null, proteinGPerServing: null, ingredients: [] },
    });
    expect(validateDishDraft(draft({ name: " Dal ", kcal: "250", protein: "12.5", ingredients: ["Onion"] }))).toEqual({
      ok: true,
      payload: { name: "Dal", kcalPerServing: 250, proteinGPerServing: 12.5, ingredients: ["Onion"] },
    });
  });

  it("reports each bad field once", () => {
    expect(validateDishDraft(draft({ name: " ", kcal: "abc", protein: "12.25" }))).toEqual({
      ok: false,
      fields: { kcalPerServing: "Enter a number", name: "Give the dish a name", proteinGPerServing: "Use at most one decimal" },
    });
    expect(validateDishDraft(draft({ kcal: "5001.5" }))).toMatchObject({ ok: false, fields: { kcalPerServing: "Use a whole number" } });
    expect(validateDishDraft(draft({ protein: "301" }))).toMatchObject({ ok: false, fields: { proteinGPerServing: "At most 300" } });
  });
});

describe("dish text", () => {
  it("summarises kcal and protein", () => {
    expect(dishSummary({ kcalPerServing: 250, proteinGPerServing: 12.5 })).toBe("250 kcal · 12.5 g protein");
    expect(dishSummary({ kcalPerServing: 0, proteinGPerServing: null })).toBe("0 kcal");
    expect(dishSummary({ kcalPerServing: null, proteinGPerServing: null })).toBe("no kcal");
    expect(dishSummary({ kcalPerServing: null, proteinGPerServing: 8 })).toBe("no kcal · 8 g protein");
  });

  it("fills the form from a dish", () => {
    const dish = { id: "1", householdId: "h", name: "Dal", kcalPerServing: null, proteinGPerServing: 9, archivedAt: null, ingredients: ["Onion"] };
    expect(draftFromDish(dish)).toEqual({ name: "Dal", kcal: "", protein: "9", ingredients: ["Onion"] });
  });
});
