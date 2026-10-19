import { describe, expect, it } from "vitest";
import { onboardingSchema, timezoneSchema } from "./household-schema.ts";
import { validOnboarding } from "@/test/fixtures";

describe("timezoneSchema", () => {
  it("accepts IANA names", () => {
    expect(timezoneSchema.parse("Europe/London")).toBe("Europe/London");
    expect(timezoneSchema.parse("Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(timezoneSchema.parse("UTC")).toBe("UTC");
  });

  it("rejects anything else", () => {
    for (const value of ["", "Mars/Base", "Mars/Olympus", "London", "+01:00", "EST5EDT", "Europe/"]) {
      expect(timezoneSchema.safeParse(value).success, value).toBe(false);
    }
  });
});

describe("onboardingSchema", () => {
  it("accepts a valid submission", () => {
    expect(onboardingSchema.safeParse(validOnboarding()).success).toBe(true);
  });

  it("names the field of a slot position that doesn't exist", () => {
    const input = validOnboarding();
    input.members[0].slotPositions = [2];
    const result = onboardingSchema.safeParse(input);
    expect(result.error?.issues[0].path).toEqual(["members", 0, "slotPositions", 0]);
  });

  it("rejects duplicate slot names (ignoring case) and times, and duplicate trips", () => {
    const names = validOnboarding({ mealSlots: [{ name: "Lunch", time: "12:00" }, { name: "lunch", time: "13:00" }] });
    expect(onboardingSchema.safeParse(names).error?.issues[0].path).toEqual(["mealSlots", 1, "name"]);
    const times = validOnboarding({ mealSlots: [{ name: "A", time: "12:00" }, { name: "B", time: "12:00" }] });
    expect(onboardingSchema.safeParse(times).error?.issues[0].path).toEqual(["mealSlots", 1, "time"]);
    const trips = validOnboarding({ shoppingTrips: [{ dayOfWeek: 1, time: "09:00" }, { dayOfWeek: 1, time: "09:00" }] });
    expect(onboardingSchema.safeParse(trips).error?.issues[0].path).toEqual(["shoppingTrips", 1, "time"]);
  });

  it("needs at least one slot and one slot per member", () => {
    expect(onboardingSchema.safeParse(validOnboarding({ mealSlots: [] })).success).toBe(false);
    const input = validOnboarding();
    input.you.slotPositions = [];
    expect(onboardingSchema.safeParse(input).success).toBe(false);
  });

  it("requires your date of birth, and keeps it within range", () => {
    const missing = validOnboarding();
    delete (missing.you as { dateOfBirth?: string }).dateOfBirth;
    expect(onboardingSchema.safeParse(missing).error?.issues[0].path).toEqual(["you", "dateOfBirth"]);
    const future = validOnboarding();
    future.you.dateOfBirth = "2999-01-01";
    expect(onboardingSchema.safeParse(future).error?.issues[0]).toMatchObject({
      path: ["you", "dateOfBirth"],
      message: "The date of birth can't be in the future",
    });
  });

  it("limits the household name to 60 characters", () => {
    const input = validOnboarding();
    input.household.name = "x".repeat(61);
    expect(onboardingSchema.safeParse(input).error?.issues[0].path).toEqual(["household", "name"]);
  });
});
