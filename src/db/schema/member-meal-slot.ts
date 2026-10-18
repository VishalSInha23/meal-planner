import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { mealSlot } from "./meal-slot.ts";
import { member } from "./member.ts";

export const memberMealSlot = pgTable(
  "member_meal_slot",
  {
    memberId: uuid("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    mealSlotId: uuid("meal_slot_id")
      .notNull()
      .references(() => mealSlot.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.memberId, table.mealSlotId] }),
    index("member_meal_slot_meal_slot_id_idx").on(table.mealSlotId),
  ],
);
