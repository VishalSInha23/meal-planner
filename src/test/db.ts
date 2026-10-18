import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { getEnv } from "@/lib/env";

// Empties every table. Refuses to run unless the app db is the test db.
export async function truncateAll(): Promise<void> {
  const { DATABASE_URL, DATABASE_URL_TEST } = getEnv();
  if (!DATABASE_URL_TEST || DATABASE_URL !== DATABASE_URL_TEST) {
    throw new Error("truncateAll only runs against DATABASE_URL_TEST");
  }
  const db = getDb();
  const { rows } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  if (rows.length === 0) return;
  const names = rows.map((row) => `"${row.tablename}"`).join(", ");
  await db.execute(sql.raw(`truncate table ${names} restart identity cascade`));
}
