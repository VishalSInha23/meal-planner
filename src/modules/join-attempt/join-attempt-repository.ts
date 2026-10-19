import { and, asc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { joinAttempt } from "@/db/schema";
import type { DbOrTx } from "@/db/transaction";

// Times are set here, not by the db, so they compare with the clock the service reads.
export async function insert(userId: string, attemptedAt: Date, db: DbOrTx = getDb()): Promise<void> {
  await db.insert(joinAttempt).values({ userId, attemptedAt });
}

// When the account's attempts after `since` were made, oldest first.
export async function listSince(userId: string, since: Date, db: DbOrTx = getDb()): Promise<Date[]> {
  const rows = await db
    .select({ attemptedAt: joinAttempt.attemptedAt })
    .from(joinAttempt)
    .where(and(eq(joinAttempt.userId, userId), gt(joinAttempt.attemptedAt, since)))
    .orderBy(asc(joinAttempt.attemptedAt));
  return rows.map((row) => row.attemptedAt);
}
