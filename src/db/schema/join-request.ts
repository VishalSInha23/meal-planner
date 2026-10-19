import { check, date, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { household } from "./household.ts";
import { member } from "./member.ts";
import { user } from "./user.ts";

export const joinRequest = pgTable(
  "join_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sex: text("sex", { enum: ["male", "female"] }).notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
    status: text("status", { enum: ["pending", "approved", "declined", "cancelled", "dismissed"] })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    decidedAt: timestamp("decided_at"),
    decidedByMemberId: uuid("decided_by_member_id").references(() => member.id, { onDelete: "set null" }),
  },
  (table) => [
    index("join_request_household_id_idx").on(table.householdId),
    index("join_request_user_id_idx").on(table.userId),
    // An account has at most one pending request.
    uniqueIndex("join_request_user_pending_idx")
      .on(table.userId)
      .where(sql`${table.status} = 'pending'`),
    check("join_request_sex_check", sql`${table.sex} in ('male', 'female')`),
    check("join_request_status_check", sql`${table.status} in ('pending', 'approved', 'declined', 'cancelled', 'dismissed')`),
  ],
);
