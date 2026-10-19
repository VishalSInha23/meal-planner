import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { dish } from "./dish.ts";
import { ingredient } from "./ingredient.ts";

export const dishIngredient = pgTable(
  "dish_ingredient",
  {
    dishId: uuid("dish_id")
      .notNull()
      .references(() => dish.id, { onDelete: "cascade" }),
    // An ingredient in use can't be deleted.
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredient.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.dishId, table.ingredientId] }), index("dish_ingredient_ingredient_id_idx").on(table.ingredientId)],
);
