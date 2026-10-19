import { check, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./user.ts";

export const userPreference = pgTable(
  "user_preference",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    // Null means not chosen yet: the page follows the device setting.
    theme: text("theme", { enum: ["light", "dark"] }),
    // Null means the brand's default font style.
    fontStyle: text("font_style", { enum: ["serif", "sans"] }),
    weightUnit: text("weight_unit", { enum: ["kg", "lb"] }).notNull().default("kg"),
    heightUnit: text("height_unit", { enum: ["cm", "ft_in"] }).notNull().default("cm"),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("user_preference_theme_check", sql`${table.theme} in ('light', 'dark')`),
    check("user_preference_font_style_check", sql`${table.fontStyle} in ('serif', 'sans')`),
    check("user_preference_weight_unit_check", sql`${table.weightUnit} in ('kg', 'lb')`),
    check("user_preference_height_unit_check", sql`${table.heightUnit} in ('cm', 'ft_in')`),
  ],
);
