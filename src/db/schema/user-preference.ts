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
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("user_preference_theme_check", sql`${table.theme} in ('light', 'dark')`),
    check("user_preference_font_style_check", sql`${table.fontStyle} in ('serif', 'sans')`),
  ],
);
