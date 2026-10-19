import { describe, expect, it } from "vitest";
import {
  defaultPlannerWeek,
  isWeekStart,
  localDateTimeToInstant,
  localToday,
  planningDeadline,
  weekDates,
  weekOffset,
  weekStartFor,
} from "./week.ts";

// 2026-10-19 is a Monday.
describe("weekStartFor", () => {
  it("finds the Monday start", () => {
    expect(weekStartFor("2026-10-19", 1)).toBe("2026-10-19");
    expect(weekStartFor("2026-10-22", 1)).toBe("2026-10-19");
    expect(weekStartFor("2026-10-25", 1)).toBe("2026-10-19");
  });

  it("finds the Wednesday start", () => {
    expect(weekStartFor("2026-10-21", 3)).toBe("2026-10-21");
    expect(weekStartFor("2026-10-20", 3)).toBe("2026-10-14");
    expect(weekStartFor("2026-10-27", 3)).toBe("2026-10-21");
  });

  it("finds the Sunday start, across a month and a year", () => {
    expect(weekStartFor("2026-10-25", 0)).toBe("2026-10-25");
    expect(weekStartFor("2026-10-24", 0)).toBe("2026-10-18");
    expect(weekStartFor("2027-01-02", 0)).toBe("2026-12-27");
  });
});

describe("isWeekStart", () => {
  it("checks the weekday", () => {
    expect(isWeekStart("2026-10-19", 1)).toBe(true);
    expect(isWeekStart("2026-10-20", 1)).toBe(false);
    expect(isWeekStart("2026-10-21", 3)).toBe(true);
    expect(isWeekStart("2026-10-25", 0)).toBe(true);
  });
});

describe("weekDates and planningDeadline", () => {
  it("lists seven dates across a month end", () => {
    expect(weekDates("2026-10-26")).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("puts the deadline on the day before", () => {
    expect(planningDeadline("2026-10-19")).toBe("2026-10-18");
    expect(planningDeadline("2026-11-01")).toBe("2026-10-31");
    expect(planningDeadline("2027-01-01")).toBe("2026-12-31");
  });
});

describe("defaultPlannerWeek", () => {
  it("is the current week on a normal day", () => {
    expect(defaultPlannerWeek(new Date("2026-10-21T12:00:00Z"), "UTC", 1)).toBe("2026-10-19");
  });

  it("is the next week on the planning deadline", () => {
    // Sunday 25 October is the deadline for the week starting Monday 26 October.
    expect(defaultPlannerWeek(new Date("2026-10-25T12:00:00Z"), "UTC", 1)).toBe("2026-10-26");
    // Tuesday is the deadline when the week starts on Wednesday.
    expect(defaultPlannerWeek(new Date("2026-10-20T12:00:00Z"), "UTC", 3)).toBe("2026-10-21");
    expect(defaultPlannerWeek(new Date("2026-10-19T12:00:00Z"), "UTC", 3)).toBe("2026-10-14");
  });

  it("is the current week on the first day of a week", () => {
    expect(defaultPlannerWeek(new Date("2026-10-26T12:00:00Z"), "UTC", 1)).toBe("2026-10-26");
  });
});

describe("localToday", () => {
  it("uses the household timezone just after local midnight", () => {
    // 00:30 on Tuesday 20 October in Kolkata (UTC+5:30) is still Monday 19 October in UTC.
    const now = new Date("2026-10-19T19:00:00Z");
    expect(now.toISOString().slice(0, 10)).toBe("2026-10-19");
    expect(localToday(now, "Asia/Kolkata")).toBe("2026-10-20");
    expect(localToday(now, "UTC")).toBe("2026-10-19");
  });

  it("changes the default week with the timezone", () => {
    // Saturday 24 October 20:00 UTC is already Sunday 25 October in Kolkata, the deadline day.
    const now = new Date("2026-10-24T20:00:00Z");
    expect(defaultPlannerWeek(now, "UTC", 1)).toBe("2026-10-19");
    expect(defaultPlannerWeek(now, "Asia/Kolkata", 1)).toBe("2026-10-26");
  });
});

describe("weekOffset", () => {
  it("counts weeks from the current one", () => {
    expect(weekOffset("2026-10-19", "2026-10-19")).toBe(0);
    expect(weekOffset("2026-10-26", "2026-10-19")).toBe(1);
    expect(weekOffset("2026-10-12", "2026-10-19")).toBe(-1);
    expect(weekOffset("2026-12-07", "2026-10-19")).toBe(7);
    expect(weekOffset("2026-03-23", "2026-10-19")).toBe(-30);
  });
});

describe("localDateTimeToInstant", () => {
  it("converts across a daylight saving change in New York", () => {
    // Clocks went forward on Sunday 8 March 2026: EST (UTC-5) before, EDT (UTC-4) after.
    expect(localDateTimeToInstant("2026-03-07", "12:00", "America/New_York").toISOString()).toBe("2026-03-07T17:00:00.000Z");
    expect(localDateTimeToInstant("2026-03-08", "12:00", "America/New_York").toISOString()).toBe("2026-03-08T16:00:00.000Z");
    expect(localDateTimeToInstant("2026-03-09", "08:30", "America/New_York").toISOString()).toBe("2026-03-09T12:30:00.000Z");
  });

  it("converts in Kolkata and UTC", () => {
    expect(localDateTimeToInstant("2026-10-20", "00:30", "Asia/Kolkata").toISOString()).toBe("2026-10-19T19:00:00.000Z");
    expect(localDateTimeToInstant("2026-10-20", "00:30", "UTC").toISOString()).toBe("2026-10-20T00:30:00.000Z");
  });
});
