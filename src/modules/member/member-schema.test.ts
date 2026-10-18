import { describe, expect, it } from "vitest";
import {
  AGE_BANDS,
  createMemberSchema,
  dateOfBirthProblem,
  proteinTargetSchema,
  updateMemberSchema,
} from "./member-schema.ts";

const slotId = "7d0a6a52-5e63-4c3e-8a64-0f1a5a3f0d11";
const base = { name: "Ravi", sex: "male", ageBand: "6-10", slotIds: [slotId] };

describe("AGE_BANDS", () => {
  it("runs from 1-5 in fives up to 71-75, then 76+", () => {
    expect(AGE_BANDS).toHaveLength(16);
    expect(AGE_BANDS.slice(0, 3)).toEqual(["1-5", "6-10", "11-15"]);
    expect(AGE_BANDS.slice(-2)).toEqual(["71-75", "76+"]);
  });
});

describe("dateOfBirthProblem", () => {
  const today = "2026-10-19";

  it("rejects the future and less than a year ago", () => {
    expect(dateOfBirthProblem("2026-10-20", today)).toMatch(/future/);
    expect(dateOfBirthProblem("2025-10-20", today)).toMatch(/one year/);
  });

  it("accepts exactly one year ago and earlier", () => {
    expect(dateOfBirthProblem("2025-10-19", today)).toBeNull();
    expect(dateOfBirthProblem("1990-04-23", today)).toBeNull();
  });
});

describe("proteinTargetSchema", () => {
  it("takes 10 to 300 with at most one decimal", () => {
    expect(proteinTargetSchema.safeParse(10).success).toBe(true);
    expect(proteinTargetSchema.safeParse(55.3).success).toBe(true);
    expect(proteinTargetSchema.safeParse(300).success).toBe(true);
    expect(proteinTargetSchema.safeParse(9.9).success).toBe(false);
    expect(proteinTargetSchema.safeParse(300.1).success).toBe(false);
    expect(proteinTargetSchema.safeParse(55.25).success).toBe(false);
  });
});

describe("createMemberSchema", () => {
  it("accepts a valid member", () => {
    expect(createMemberSchema.safeParse(base).success).toBe(true);
    expect(createMemberSchema.safeParse({ ...base, ageBand: undefined, dateOfBirth: "1990-04-23" }).success).toBe(true);
  });

  it("checks name length, band, targets and slots", () => {
    const bad = (patch: object) => createMemberSchema.safeParse({ ...base, ...patch }).success;
    expect(bad({ name: "" })).toBe(false);
    expect(bad({ name: "a".repeat(41) })).toBe(false);
    expect(bad({ name: "a".repeat(40) })).toBe(true);
    expect(bad({ ageBand: "0-5" })).toBe(false);
    expect(bad({ sex: "other" })).toBe(false);
    expect(bad({ kcalTarget: 499 })).toBe(false);
    expect(bad({ kcalTarget: 6001 })).toBe(false);
    expect(bad({ kcalTarget: 500 })).toBe(true);
    expect(bad({ slotIds: [] })).toBe(false);
    expect(bad({ dateOfBirth: "2025-02-30" })).toBe(false);
  });

  it("needs an age band or a date of birth", () => {
    const result = createMemberSchema.safeParse({ ...base, ageBand: undefined });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["ageBand"]);
  });
});

describe("updateMemberSchema", () => {
  it("needs at least one field and rejects unknown ones", () => {
    expect(updateMemberSchema.safeParse({}).success).toBe(false);
    expect(updateMemberSchema.safeParse({ extra: 1 }).success).toBe(false);
    expect(updateMemberSchema.safeParse({ kcalTarget: null }).success).toBe(true);
  });
});
