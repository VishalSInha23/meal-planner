import { z } from "zod";

// A time of day as "HH:MM" on a 24-hour clock.
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 08:00");

// The db returns times as "HH:MM:SS"; the API speaks "HH:MM".
export function toTimeOfDay(dbTime: string): string {
  return dbTime.slice(0, 5);
}
