import { describe, expect, it } from "vitest";
import { computeNutrition, targetStatus } from "./meal-nutrition.ts";

describe("targetStatus", () => {
  it("is null without a target", () => {
    expect(targetStatus(100, null)).toBeNull();
  });

  it("reads under and over with the difference", () => {
    expect(targetStatus(1850, 2000)).toEqual({ status: "under", difference: 150 });
    expect(targetStatus(2150, 2000)).toEqual({ status: "over", difference: 150 });
  });

  it("counts exactly 5% either side as on target (target 2000: 1900 to 2100)", () => {
    expect(targetStatus(1900, 2000)).toEqual({ status: "on_target", difference: 100 });
    expect(targetStatus(2100, 2000)).toEqual({ status: "on_target", difference: 100 });
    expect(targetStatus(1899, 2000)).toEqual({ status: "under", difference: 101 });
    expect(targetStatus(2101, 2000)).toEqual({ status: "over", difference: 101 });
  });

  it("handles decimal protein (target 60: 57 to 63)", () => {
    expect(targetStatus(57, 60)?.status).toBe("on_target");
    expect(targetStatus(63, 60)?.status).toBe("on_target");
    expect(targetStatus(56.9, 60)).toEqual({ status: "under", difference: 3.1 });
    expect(targetStatus(63.1, 60)).toEqual({ status: "over", difference: 3.1 });
  });
});

describe("computeNutrition", () => {
  const dates = ["2026-10-19", "2026-10-20"];
  const priya = { id: "priya", kcalTarget: 2000, proteinTargetG: 60 };
  const son = { id: "son", kcalTarget: null, proteinTargetG: null };

  it("sums the dishes each member is ticked for, per date", () => {
    const result = computeNutrition(dates, [priya, son], [
      { date: "2026-10-19", kcal: 300, proteinG: 10.5, memberIds: ["priya", "son"] },
      { date: "2026-10-19", kcal: 250, proteinG: 12.3, memberIds: ["priya"] },
      { date: "2026-10-19", kcal: 100, proteinG: 4, memberIds: ["son"] },
      { date: "2026-10-20", kcal: 500, proteinG: 20, memberIds: ["son"] },
    ]);
    expect(result).toHaveLength(4);
    expect(result[0]).toMatchObject({ memberId: "priya", date: "2026-10-19", kcal: 550, proteinG: 22.8 });
    expect(result[1]).toMatchObject({ memberId: "son", date: "2026-10-19", kcal: 400, proteinG: 14.5 });
    expect(result[2]).toMatchObject({ memberId: "priya", date: "2026-10-20", kcal: 0, proteinG: 0 });
    expect(result[3]).toMatchObject({ memberId: "son", date: "2026-10-20", kcal: 500, proteinG: 20 });
  });

  it("adds decimals exactly", () => {
    const [result] = computeNutrition(["2026-10-19"], [priya], [
      { date: "2026-10-19", kcal: 1, proteinG: 0.1, memberIds: ["priya"] },
      { date: "2026-10-19", kcal: 1, proteinG: 0.2, memberIds: ["priya"] },
    ]);
    expect(result.proteinG).toBe(0.3);
  });

  it("counts dishes without values as 0 and says how many", () => {
    const [result] = computeNutrition(["2026-10-19"], [priya], [
      { date: "2026-10-19", kcal: null, proteinG: 5, memberIds: ["priya"] },
      { date: "2026-10-19", kcal: null, proteinG: null, memberIds: ["priya"] },
      { date: "2026-10-19", kcal: 200, proteinG: null, memberIds: ["priya"] },
      { date: "2026-10-19", kcal: null, proteinG: null, memberIds: ["son"] },
    ]);
    expect(result).toMatchObject({ kcal: 200, proteinG: 5, dishesWithoutKcal: 2, dishesWithoutProtein: 2 });
  });

  it("gives statuses against targets, and none for a member without targets", () => {
    const [withTargets, without] = computeNutrition(["2026-10-19"], [priya, son], [
      { date: "2026-10-19", kcal: 1850, proteinG: 63, memberIds: ["priya", "son"] },
    ]);
    expect(withTargets.kcalStatus).toEqual({ status: "under", difference: 150 });
    expect(withTargets.proteinStatus).toEqual({ status: "on_target", difference: 3 });
    expect(without).toMatchObject({ kcal: 1850, kcalStatus: null, proteinStatus: null });
  });
});
