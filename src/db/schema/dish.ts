import { check, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { household } from "./household.ts";

export const dish = pgTable(
  "dish",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kcalPerServing: integer("kcal_per_serving"),
    proteinGPerServing: numeric("protein_g_per_serving", { precision: 4, scale: 1 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("dish_household_name_idx").on(table.householdId, sql`lower(trim(${table.name}))`),
    check("dish_kcal_check", sql`${table.kcalPerServing} is null or ${table.kcalPerServing} between 0 and 5000`),
    check("dish_protein_check", sql`${table.proteinGPerServing} is null or ${table.proteinGPerServing} between 0 and 300`),
  ],
);
