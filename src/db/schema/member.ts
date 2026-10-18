import { boolean, check, date, index, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { household } from "./household.ts";
import { user } from "./user.ts";

export const member = pgTable(
  "member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    // Null for a member without an account.
    userId: text("user_id")
      .unique()
      .references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    sex: text("sex", { enum: ["male", "female"] }).notNull(),
    ageBand: text("age_band"),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    kcalTarget: integer("kcal_target"),
    proteinTargetG: numeric("protein_target_g", { precision: 4, scale: 1 }),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("member_household_id_idx").on(table.householdId),
    check("member_sex_check", sql`${table.sex} in ('male', 'female')`),
    check("member_age_check", sql`${table.ageBand} is not null or ${table.dateOfBirth} is not null`),
  ],
);
