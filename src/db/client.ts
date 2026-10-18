import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { getEnv } from "@/lib/env";
import { getLogger, roundMs } from "@/lib/log/logger";
import { currentLog } from "@/lib/log/request-context";
import * as schema from "./schema/index.ts";

type QueryArgs = unknown[];

function sqlText(first: unknown): string {
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "text" in first && typeof first.text === "string") return first.text;
  return "";
}

// A client that logs every query (sql and duration, never the parameters) at debug level.
// It wraps both the promise and the callback form, so BEGIN and COMMIT show up too.
export class TimingClient extends pg.Client {
  constructor(config?: string | pg.ClientConfig) {
    super(config);
    const query = this.query.bind(this) as (...args: QueryArgs) => unknown;
    this.query = ((...args: QueryArgs) => {
      const sql = sqlText(args[0]);
      const started = performance.now();
      const log = () => currentLog().debug({ sql, durationMs: roundMs(performance.now() - started) }, "db query");

      const last = args.length - 1;
      if (typeof args[last] === "function") {
        const callback = args[last] as (...callbackArgs: unknown[]) => void;
        args[last] = (...callbackArgs: unknown[]) => {
          log();
          callback(...callbackArgs);
        };
        return query(...args);
      }

      const result = query(...args);
      // A query given as a submittable (a cursor, say) has no promise: there is nothing to time.
      return result instanceof Promise ? result.finally(log) : result;
    }) as pg.Client["query"];
  }
}

function createPool(): pg.Pool {
  const connectionString = getEnv().DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const timed = getLogger().isLevelEnabled("debug");
  return new pg.Pool(timed ? { connectionString, Client: TimingClient } : { connectionString });
}

function createDb(pool: pg.Pool) {
  return drizzle({ client: pool, schema });
}

export type Db = ReturnType<typeof createDb>;

let pool: pg.Pool | undefined;
let db: Db | undefined;

// Created on first use, so a build does not need a db.
export function getPool(): pg.Pool {
  return (pool ??= createPool());
}

export function getDb(): Db {
  return (db ??= createDb(getPool()));
}
