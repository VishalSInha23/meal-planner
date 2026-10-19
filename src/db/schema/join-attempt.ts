import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./user.ts";

// One row per wrong join code.
export const joinAttempt = pgTable(
  "join_attempt",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
  },
  (table) => [index("join_attempt_user_id_attempted_at_idx").on(table.userId, table.attemptedAt)],
);
