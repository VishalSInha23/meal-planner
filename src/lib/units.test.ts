import { describe, expect, it } from "vitest";
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg } from "./units";

describe("kg and lb", () => {
  it("converts kg to lb with one decimal", () => {
    expect(kgToLb(1)).toBe(2.2);
    expect(kgToLb(70)).toBe(154.3);
    expect(kgToLb(100)).toBe(220.5);
    expect(kgToLb(5)).toBe(11);
  });

  it("converts lb to kg with one decimal", () => {
    expect(lbToKg(220.5)).toBe(100);
    expect(lbToKg(154.3)).toBe(70);
    expect(lbToKg(11)).toBe(5);
    expect(lbToKg(150)).toBe(68);
  });
});

describe("cm and feet and inches", () => {
  it("shows whole inches", () => {
    expect(cmToFeetInches(170)).toEqual({ feet: 5, inches: 7 });
    expect(cmToFeetInches(152.4)).toEqual({ feet: 5, inches: 0 });
    expect(cmToFeetInches(50)).toEqual({ feet: 1, inches: 8 });
  });

  it("rolls 12 inches over to the next foot", () => {
    expect(cmToFeetInches(182)).toEqual({ feet: 6, inches: 0 });
    expect(cmToFeetInches(181.7)).toEqual({ feet: 6, inches: 0 });
    expect(cmToFeetInches(181.6)).toEqual({ feet: 5, inches: 11 });
  });

  it("converts feet and inches to cm with one decimal", () => {
    expect(feetInchesToCm(5, 7)).toBe(170.2);
    expect(feetInchesToCm(6, 0)).toBe(182.9);
    expect(feetInchesToCm(0, 20)).toBe(50.8);
    expect(feetInchesToCm(5, 7.5)).toBe(171.5);
  });
});
