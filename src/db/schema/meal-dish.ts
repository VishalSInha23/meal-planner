import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { dish } from "./dish.ts";
import { meal } from "./meal.ts";

export const mealDish = pgTable(
  "meal_dish",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mealId: uuid("meal_id")
      .notNull()
      .references(() => meal.id, { onDelete: "cascade" }),
    // Deleting a dish removes it from every meal.
    dishId: uuid("dish_id")
      .notNull()
      .references(() => dish.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("meal_dish_meal_dish_idx").on(table.mealId, table.dishId), index("meal_dish_dish_id_idx").on(table.dishId)],
);
