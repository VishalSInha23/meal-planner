import { date, index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { household } from "./household.ts";
import { mealSlot } from "./meal-slot.ts";

export const meal = pgTable(
  "meal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    // The local date in local time.
    date: date("date", { mode: "string" }).notNull(),
    // A slot that meals use can't be deleted.
    mealSlotId: uuid("meal_slot_id")
      .notNull()
      .references(() => mealSlot.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("meal_household_date_slot_idx").on(table.householdId, table.date, table.mealSlotId),
    index("meal_meal_slot_id_idx").on(table.mealSlotId),
  ],
);
