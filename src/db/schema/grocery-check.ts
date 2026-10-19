import { index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { household } from "./household.ts";
import { ingredient } from "./ingredient.ts";
import { member } from "./member.ts";

export const groceryCheck = pgTable(
  "grocery_check",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    // "<weekStart>:<index>", the key of a grocery list.
    listKey: text("list_key").notNull(),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredient.id, { onDelete: "cascade" }),
    checkedByMemberId: uuid("checked_by_member_id").references(() => member.id, { onDelete: "set null" }),
    checkedAt: timestamp("checked_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.householdId, table.listKey, table.ingredientId] }),
    index("grocery_check_ingredient_id_idx").on(table.ingredientId),
  ],
);
