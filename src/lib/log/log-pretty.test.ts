import { describe, expect, it } from "vitest";
import { formatPrettyLine } from "./log-pretty";

describe("formatPrettyLine", () => {
  it("prints time, level, requestId, message and key=value fields", () => {
    const time = new Date(2026, 0, 2, 3, 4, 5, 6).getTime();
    const line = JSON.stringify({ level: "info", time, requestId: "ABCD1234", msg: "request completed", status: 200, path: "/api/health" });
    expect(formatPrettyLine(line)).toBe("03:04:05.006 INFO  ABCD1234 request completed status=200 path=/api/health");
  });

  it("hides pid and puts an error stack on the following lines", () => {
    const line = JSON.stringify({ level: "error", time: 0, pid: 1, msg: "boom", err: { stack: "Error: x\n  at y" } });
    const lines = formatPrettyLine(line).split("\n");
    expect(lines[0]).toMatch(/ERROR boom$/);
    expect(lines.slice(1)).toEqual(["Error: x", "  at y"]);
  });
});
