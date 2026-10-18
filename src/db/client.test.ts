import pg from "pg";
import { describe, expect, it } from "vitest";
import { createLogger } from "@/lib/log/logger";
import { createRequestContext, runWithRequestContext } from "@/lib/log/request-context";
import { TimingClient } from "./client.ts";

function capture(level: string) {
  const lines: Record<string, unknown>[] = [];
  const log = createLogger(level, "json", { write: (line) => lines.push(JSON.parse(line)) });
  return { lines, context: createRequestContext("TESTREQ1", log) };
}

async function withClient<T>(fn: (client: TimingClient) => Promise<T>): Promise<T> {
  const client = new TimingClient({ connectionString: process.env.DATABASE_URL_TEST });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

describe("TimingClient", () => {
  it("logs one db query with sql and durationMs at debug, carrying the request id", async () => {
    const { lines, context } = capture("debug");
    await runWithRequestContext(context, () => withClient((client) => client.query("select 1 as one")));
    const queries = lines.filter((line) => line.msg === "db query");
    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatchObject({ level: "debug", sql: "select 1 as one", requestId: "TESTREQ1" });
    expect(typeof queries[0].durationMs).toBe("number");
  });

  it("logs nothing at info", async () => {
    const { lines, context } = capture("info");
    await runWithRequestContext(context, () => withClient((client) => client.query("select 1")));
    expect(lines).toEqual([]);
  });

  it("never logs parameters", async () => {
    const { lines, context } = capture("debug");
    await runWithRequestContext(context, () =>
      withClient((client) => client.query({ text: "select $1::text as v", values: ["hunter2-parameter"] })),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].sql).toBe("select $1::text as v");
    expect(JSON.stringify(lines)).not.toContain("hunter2-parameter");
  });

  it("times the callback form too", async () => {
    const { lines, context } = capture("debug");
    await runWithRequestContext(context, () =>
      withClient(
        (client) =>
          new Promise<void>((resolve, reject) => {
            client.query("select 2", (error: Error | null) => (error ? reject(error) : resolve()));
          }),
      ),
    );
    expect(lines.map((line) => line.sql)).toEqual(["select 2"]);
  });

  it("returns the query result unchanged", async () => {
    const result = await withClient((client) => client.query<{ n: number }>("select 41 + 1 as n"));
    expect(result).toBeInstanceOf(Object);
    expect((result as pg.QueryResult<{ n: number }>).rows).toEqual([{ n: 42 }]);
  });
});
