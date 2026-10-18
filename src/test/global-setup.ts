import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

// Migrates the test db once per run, before any test file starts.
export default async function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set (see README, Setup)");
  const pool = new pg.Pool({ connectionString: url });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder: "drizzle" });
  } finally {
    await pool.end();
  }
}
