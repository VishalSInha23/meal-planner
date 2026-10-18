import { check, integer, pgTable, time, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { household } from "./household.ts";

export const shoppingTrip = pgTable(
  "shopping_trip",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    // 0 = Sunday ... 6 = Saturday.
    dayOfWeek: integer("day_of_week").notNull(),
    time: time("time").notNull(),
  },
  (table) => [
    uniqueIndex("shopping_trip_household_day_time_idx").on(table.householdId, table.dayOfWeek, table.time),
    check("shopping_trip_day_of_week_check", sql`${table.dayOfWeek} between 0 and 6`),
  ],
);
