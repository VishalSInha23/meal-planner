import { getDb, type Db } from "./client.ts";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Repository functions accept either the db or a transaction.
export type DbOrTx = Db | Tx;

// Runs fn in a transaction: it commits when fn returns and rolls back when fn throws.
export function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(fn);
}
