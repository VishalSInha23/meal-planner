import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { notFound } from "./errors";
import { route } from "./route";
import type { Log } from "@/lib/log/logger";

interface Entry {
  level: string;
  msg?: string;
  [key: string]: unknown;
}

function stubLogger(level = "info") {
  const entries: Entry[] = [];
  const make = (bindings: object): Log => {
    const write = (name: string) => (obj: object, msg?: string) => {
      entries.push({ level: name, ...bindings, ...obj, msg });
    };
    return {
      debug: write("debug"),
      info: write("info"),
      warn: write("warn"),
      error: write("error"),
      child: (more) => make({ ...bindings, ...more }),
      isLevelEnabled: (name) => name !== "debug" || level === "debug",
    };
  };
  return { entries, logger: make({}) };
}

const request = (headers: Record<string, string> = {}, init: ConstructorParameters<typeof NextRequest>[1] = {}) =>
  new NextRequest("http://localhost/api/test?secret=1", { headers, ...init });
const context = { params: Promise.resolve({}) };

describe("route", () => {
  it("returns the handler's response with an x-request-id header", async () => {
    const { logger } = stubLogger();
    const response = await route(() => Response.json({ ok: true }), { logger })(request(), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9A-Z]{8}$/);
  });

  it("reuses a valid incoming request id", async () => {
    const { logger } = stubLogger();
    const response = await route(() => Response.json({}), { logger })(request({ "x-request-id": "client-id-1" }), context);
    expect(response.headers.get("x-request-id")).toBe("client-id-1");
  });

  it("replaces an invalid incoming request id", async () => {
    const { logger } = stubLogger();
    const response = await route(() => Response.json({}), { logger })(request({ "x-request-id": "bad id" }), context);
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9A-Z]{8}$/);
  });

  it("maps an AppError to the error shape", async () => {
    const { logger, entries } = stubLogger();
    const response = await route(
      () => {
        throw notFound("Dish not found");
      },
      { logger },
    )(request(), context);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "not_found", message: "Dish not found" } });
    const completed = entries.find((entry) => entry.msg === "request completed");
    expect(completed).toMatchObject({ status: 404, errorCode: "not_found" });
  });

  it("maps a zod error to a 400 with fields", async () => {
    const { logger, entries } = stubLogger();
    const response = await route(
      () => {
        z.object({ name: z.string().min(1), servings: z.number() }).parse({ name: "", servings: "x" });
        return Response.json({});
      },
      { logger },
    )(request(), context);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("validation_failed");
    expect(Object.keys(body.error.fields).sort()).toEqual(["name", "servings"]);
    expect(entries.at(-1)).toMatchObject({ status: 400, errorCode: "validation_failed" });
  });

  it("returns a generic 500 for an unexpected error and logs it with its stack", async () => {
    const { logger, entries } = stubLogger();
    const response = await route(
      () => {
        throw new Error("db password is hunter2");
      },
      { logger },
    )(request(), context);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: "internal_error", message: "Something went wrong" } });
    const logged = entries.find((entry) => entry.level === "error");
    expect((logged?.err as Error).stack).toContain("hunter2");
    expect(entries.at(-1)).toMatchObject({ msg: "request completed", status: 500 });
  });

  it("logs both request lines with the same requestId", async () => {
    const { logger, entries } = stubLogger();
    const response = await route(() => Response.json({ ok: true }), { logger, route: "/api/test" })(
      request({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }),
      context,
    );
    expect(entries).toHaveLength(2);
    const [incoming, completed] = entries;
    expect(incoming).toMatchObject({
      msg: "incoming request",
      method: "GET",
      path: "/api/test",
      route: "/api/test",
      ip: "1.2.3.4",
      bytes: 0,
    });
    expect(completed).toMatchObject({ msg: "request completed", status: 200, bytes: 11 });
    expect(typeof completed.durationMs).toBe("number");
    expect(incoming.requestId).toBe(response.headers.get("x-request-id"));
    expect(completed.requestId).toBe(incoming.requestId);
  });

  it("logs bodies at debug only, redacted and shortened", async () => {
    const quiet = stubLogger("info");
    const handler = () => Response.json({ items: [1, 2, 3, 4, 5], token: "t" });
    const post = () =>
      request({ "content-type": "application/json" }, { method: "POST", body: JSON.stringify({ password: "p", note: "n" }) });
    await route(handler, { logger: quiet.logger })(post(), context);
    expect(quiet.entries.map((entry) => entry.msg)).toEqual(["incoming request", "request completed"]);

    const loud = stubLogger("debug");
    await route(handler, { logger: loud.logger })(post(), context);
    expect(loud.entries.map((entry) => entry.msg)).toEqual([
      "incoming request",
      "request body",
      "response body",
      "request completed",
    ]);
    expect(loud.entries[1].body).toEqual({ password: "****", note: "n" });
    expect(loud.entries[2].body).toEqual({ items: [1, 2, 3, "... 2 more"], token: "****" });
  });

  it("handles immutable response headers by copying the response", async () => {
    const { logger } = stubLogger();
    const response = await route(() => Response.redirect("http://localhost/x", 302), { logger })(request(), context);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost/x");
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9A-Z]{8}$/);
  });
});
