import { pgTable, text, time, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { household } from "./household.ts";

export const mealSlot = pgTable(
  "meal_slot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    time: time("time").notNull(),
  },
  (table) => [
    uniqueIndex("meal_slot_household_name_idx").on(table.householdId, sql`lower(${table.name})`),
    uniqueIndex("meal_slot_household_time_idx").on(table.householdId, table.time),
  ],
);
