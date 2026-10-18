import { describe, expect, it } from "vitest";
import { isValidRequestId, newRequestId, resolveRequestId } from "./request-id";

describe("newRequestId", () => {
  it("makes 8 uppercase base36 characters by default", () => {
    for (let i = 0; i < 50; i++) expect(newRequestId("base36")).toMatch(/^[0-9A-Z]{8}$/);
  });

  it("makes a UUID with the uuid format", () => {
    expect(newRequestId("uuid")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe("isValidRequestId", () => {
  it("accepts 8 to 64 characters of A-Z a-z 0-9 -", () => {
    expect(isValidRequestId("abcdEFG1")).toBe(true);
    expect(isValidRequestId("a-b-c-d-e")).toBe(true);
    expect(isValidRequestId("a".repeat(64))).toBe(true);
  });

  it("rejects the rest", () => {
    expect(isValidRequestId("short")).toBe(false);
    expect(isValidRequestId("a".repeat(65))).toBe(false);
    expect(isValidRequestId("has space1")).toBe(false);
    expect(isValidRequestId("under_score1")).toBe(false);
    expect(isValidRequestId("")).toBe(false);
    expect(isValidRequestId(null)).toBe(false);
  });
});

describe("resolveRequestId", () => {
  it("reuses a valid incoming id and replaces an invalid one", () => {
    expect(resolveRequestId("incoming-123")).toBe("incoming-123");
    expect(resolveRequestId("bad id!")).toMatch(/^[0-9A-Z]{8}$/);
    expect(resolveRequestId(null)).toMatch(/^[0-9A-Z]{8}$/);
  });
});
