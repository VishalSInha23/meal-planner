import { describe, expect, it } from "vitest";
import { isCalendarDate, oneYearBefore } from "./dates.ts";

describe("isCalendarDate", () => {
  it("accepts real dates and rejects the rest", () => {
    expect(isCalendarDate("2024-02-29")).toBe(true);
    expect(isCalendarDate("2025-02-29")).toBe(false);
    expect(isCalendarDate("2025-13-01")).toBe(false);
    expect(isCalendarDate("2025-1-1")).toBe(false);
    expect(isCalendarDate("not a date")).toBe(false);
  });
});

describe("oneYearBefore", () => {
  it("goes back one year", () => {
    expect(oneYearBefore("2026-10-19")).toBe("2025-10-19");
  });

  it("moves 29 February to 28 February", () => {
    expect(oneYearBefore("2028-02-29")).toBe("2027-02-28");
  });
});
