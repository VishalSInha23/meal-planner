import { describe, expect, it } from "vitest";
import { createLogger, redact, roundMs, shorten } from "./logger";

describe("roundMs", () => {
  it("rounds to 3 decimals", () => {
    expect(roundMs(1.23456)).toBe(1.235);
    expect(roundMs(2)).toBe(2);
    expect(roundMs(0.0004)).toBe(0);
  });
});

describe("shorten", () => {
  it("keeps 3 array items and counts the rest", () => {
    const items = Array.from({ length: 12 }, (_, i) => i);
    expect(shorten(items)).toEqual([0, 1, 2, "... 9 more"]);
  });

  it("leaves a 3 item array alone", () => {
    expect(shorten([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("cuts strings over 200 characters and ends them with ...", () => {
    expect(shorten("a".repeat(201))).toBe(`${"a".repeat(200)}...`);
    expect(shorten("a".repeat(200))).toBe("a".repeat(200));
  });

  it("applies at every depth", () => {
    const result = shorten({ list: [{ text: "b".repeat(300), tags: [1, 2, 3, 4] }, 2, 3, 4] });
    expect(result).toEqual({
      list: [{ text: `${"b".repeat(200)}...`, tags: [1, 2, 3, "... 1 more"] }, 2, 3, "... 1 more"],
    });
  });

  it("passes other values through", () => {
    expect(shorten(null)).toBeNull();
    expect(shorten(5)).toBe(5);
    expect(shorten(true)).toBe(true);
  });
});

describe("redact", () => {
  it("hides fields whose name contains password, secret, token or key", () => {
    expect(
      redact({ name: "a", Password: "x", clientSecret: "y", accessToken: "z", apiKey: "k", n: 1 }),
    ).toEqual({ name: "a", Password: "****", clientSecret: "****", accessToken: "****", apiKey: "****", n: 1 });
  });

  it("applies in nested objects and arrays", () => {
    expect(redact({ users: [{ id: 1, token: "t" }], meta: { secret: "s" } })).toEqual({
      users: [{ id: 1, token: "****" }],
      meta: { secret: "****" },
    });
  });
});

describe("createLogger", () => {
  it("includes pid in JSON mode", () => {
    let written = "";
    const stream = { write: (line: string) => { written += line; } };
    const logger = createLogger("info", "json", stream);
    logger.info({ test: true }, "test message");
    const parsed = JSON.parse(written);
    expect(typeof parsed.pid).toBe("number");
    expect(parsed.pid).toBe(process.pid);
    expect(parsed.hostname).toBeUndefined();
  });
});
