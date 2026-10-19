import { addDays, format } from "date-fns";

const DATE_FORMAT = "yyyy-MM-dd";

// A "YYYY-MM-DD" string as a date at UTC midnight, so day arithmetic never meets a daylight saving change.
function parse(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function show(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysTo(date: string, days: number): string {
  return show(addDays(parse(date), days));
}

// 0 = Sunday ... 6 = Saturday.
function dayOfWeek(date: string): number {
  return parse(date).getUTCDay();
}

// The local calendar date of the instant.
export function localToday(now: Date): string {
  return format(now, DATE_FORMAT);
}

// The first day of the week that holds the date.
export function weekStartFor(date: string, weekStartDay: number): string {
  return addDaysTo(date, -((dayOfWeek(date) - weekStartDay + 7) % 7));
}

export function isWeekStart(date: string, weekStartDay: number): boolean {
  return dayOfWeek(date) === weekStartDay;
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysTo(weekStart, index));
}

// The day before the week starts.
export function planningDeadline(weekStart: string): string {
  return addDaysTo(weekStart, -1);
}

// The current week, or the next one when today is the next week's planning deadline.
export function defaultPlannerWeek(now: Date, weekStartDay: number): string {
  const today = localToday(now);
  const current = weekStartFor(today, weekStartDay);
  const next = addDaysTo(current, 7);
  return today === planningDeadline(next) ? next : current;
}

// 0 for the current week, 1 for the next, -1 for the last.
export function weekOffset(weekStart: string, currentWeekStart: string): number {
  return Math.round((parse(weekStart).getTime() - parse(currentWeekStart).getTime()) / (7 * 86_400_000));
}

// The local Date at which the wall clock reads the date and the "HH:MM" time.
export function localDateTimeToInstant(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}
