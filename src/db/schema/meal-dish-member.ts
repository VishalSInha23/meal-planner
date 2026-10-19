import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { mealDish } from "./meal-dish.ts";
import { member } from "./member.ts";

export const mealDishMember = pgTable(
  "meal_dish_member",
  {
    mealDishId: uuid("meal_dish_id")
      .notNull()
      .references(() => mealDish.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.mealDishId, table.memberId] }), index("meal_dish_member_member_id_idx").on(table.memberId)],
);
