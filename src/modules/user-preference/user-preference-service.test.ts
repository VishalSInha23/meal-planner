import { describe, expect, it } from "vitest";
import { resolveAppearance } from "./user-preference-service.ts";

describe("resolveAppearance", () => {
  it("uses the saved preferences first", () => {
    expect(resolveAppearance({ theme: "dark", fontStyle: "sans" }, { theme: "light", font: "serif" })).toEqual({
      theme: "dark",
      font: "sans",
    });
  });

  it("gives a saved null font style the brand default", () => {
    expect(resolveAppearance({ theme: "light", fontStyle: null }, { font: "sans" })).toEqual({
      theme: "light",
      font: "serif",
    });
  });

  it("uses the cookies when nothing is saved", () => {
    expect(resolveAppearance(null, { theme: "dark", font: "sans" })).toEqual({ theme: "dark", font: "sans" });
  });

  it("ignores invalid or missing cookies", () => {
    expect(resolveAppearance(null, { theme: "blue", font: "mono" })).toEqual({ theme: null, font: "serif" });
    expect(resolveAppearance(null, { theme: "system" })).toEqual({ theme: null, font: "serif" });
  });

  it("returns no theme when none is saved or set in the cookie", () => {
    expect(resolveAppearance(null, {})).toEqual({ theme: null, font: "serif" });
    expect(resolveAppearance({ theme: null, fontStyle: "sans" }, { theme: "dark" })).toEqual({
      theme: null,
      font: "sans",
    });
  });
});
