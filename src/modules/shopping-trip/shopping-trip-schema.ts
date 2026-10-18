import { z } from "zod";
import { timeOfDaySchema } from "@/lib/time-of-day";

// 0 = Sunday ... 6 = Saturday.
export const dayOfWeekSchema = z.number().int("Pick a day").min(0, "Pick a day").max(6, "Pick a day");

export const createShoppingTripSchema = z.object({ dayOfWeek: dayOfWeekSchema, time: timeOfDaySchema }).strict();

// A list of trips, as in onboarding: no two at the same day and time.
export const shoppingTripListSchema = z.array(createShoppingTripSchema).superRefine((trips, context) => {
  const seen = new Set<string>();
  trips.forEach((trip, index) => {
    const key = `${trip.dayOfWeek} ${trip.time}`;
    if (seen.has(key)) context.addIssue({ code: "custom", path: [index, "time"], message: "Another trip is at this day and time" });
    seen.add(key);
  });
});

export type CreateShoppingTrip = z.infer<typeof createShoppingTripSchema>;

export interface ShoppingTrip {
  id: string;
  householdId: string;
  dayOfWeek: number;
  time: string;
}
