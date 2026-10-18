// Today's date as "YYYY-MM-DD" in an IANA timezone.
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// A "YYYY-MM-DD" string that is a real calendar date.
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// The same day one year earlier. 29 February becomes 28 February.
export function oneYearBefore(date: string): string {
  const [year, month, day] = date.split("-");
  const earlier = `${Number(year) - 1}-${month}-${day}`;
  return isCalendarDate(earlier) ? earlier : `${Number(year) - 1}-${month}-28`;
}
