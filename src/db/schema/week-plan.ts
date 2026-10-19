import { date, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { household } from "./household.ts";
import { member } from "./member.ts";

export const weekPlan = pgTable(
  "week_plan",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    weekStart: date("week_start", { mode: "string" }).notNull(),
    plannedAt: timestamp("planned_at").notNull().defaultNow(),
    plannedByMemberId: uuid("planned_by_member_id").references(() => member.id, { onDelete: "set null" }),
  },
  (table) => [primaryKey({ columns: [table.householdId, table.weekStart] })],
);
