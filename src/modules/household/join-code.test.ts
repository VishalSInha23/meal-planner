import { describe, expect, it } from "vitest";
import { isJoinCodeFormat, newJoinCode, normalizeJoinCode } from "./join-code.ts";

describe("newJoinCode", () => {
  it("makes 8 uppercase letters and digits", () => {
    for (let i = 0; i < 200; i++) expect(newJoinCode()).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("makes different codes", () => {
    expect(new Set(Array.from({ length: 50 }, newJoinCode)).size).toBe(50);
  });
});

describe("normalizeJoinCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeJoinCode("  k7q2m9xa \n")).toBe("K7Q2M9XA");
  });
});

describe("isJoinCodeFormat", () => {
  it("accepts exactly 8 uppercase letters and digits", () => {
    expect(isJoinCodeFormat("K7Q2M9XA")).toBe(true);
    expect(isJoinCodeFormat("K7Q2M9X")).toBe(false);
    expect(isJoinCodeFormat("K7Q2M9XAB")).toBe(false);
    expect(isJoinCodeFormat("k7q2m9xa")).toBe(false);
    expect(isJoinCodeFormat("K7Q2 9XA")).toBe(false);
  });
});
