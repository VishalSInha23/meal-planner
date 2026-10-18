import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError, conflict, forbidden, toErrorResponse, unauthorized } from "./errors";

describe("toErrorResponse", () => {
  it("uses the status of the helpers", () => {
    expect(toErrorResponse(unauthorized()).status).toBe(401);
    expect(toErrorResponse(forbidden()).status).toBe(403);
    expect(toErrorResponse(conflict()).status).toBe(409);
  });

  it("includes fields only when present", () => {
    expect(toErrorResponse(new AppError(409, "taken", "Taken", { name: "In use" })).body).toEqual({
      error: { code: "taken", message: "Taken", fields: { name: "In use" } },
    });
  });

  it("names nested paths with dots and keeps the first message per field", () => {
    const result = z.object({ a: z.object({ b: z.string() }) }).safeParse({ a: { b: 1 } });
    if (result.success) throw new Error("expected failure");
    expect(Object.keys(toErrorResponse(result.error).body.error.fields ?? {})).toEqual(["a.b"]);
  });
});
