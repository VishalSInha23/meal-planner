import { check, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const household = pgTable(
  "household",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // 0 = Sunday ... 6 = Saturday.
    weekStartDay: integer("week_start_day").notNull(),
    joinCode: text("join_code").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [check("household_week_start_day_check", sql`${table.weekStartDay} between 0 and 6`)],
);
