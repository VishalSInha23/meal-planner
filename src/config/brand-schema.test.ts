import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brandSchema } from "./brand-schema.ts";

const valid = () => JSON.parse(readFileSync("config/brand.example.json", "utf8"));

type Tree = { [key: string]: unknown };

// Sets the value at a dotted path, or removes the key when the value is undefined.
function withValue(path: string, value: unknown): Tree {
  const brand = valid() as Tree;
  const keys = path.split(".");
  const last = keys.pop() as string;
  const parent = keys.reduce<Tree>((node, key) => node[key] as Tree, brand);
  if (value === undefined) delete parent[last];
  else parent[last] = value;
  return brand;
}

// The field names the schema reports for a brand file with one value changed.
function invalidFields(path: string, value: unknown): string[] {
  const result = brandSchema.safeParse(withValue(path, value));
  if (result.success) throw new Error("expected the brand to be invalid");
  return result.error.issues.map((issue) => issue.path.join("."));
}

describe("brandSchema", () => {
  it("accepts the example file", () => {
    expect(brandSchema.safeParse(valid()).success).toBe(true);
  });

  it("reports name when it is empty or over 40 characters", () => {
    expect(invalidFields("name", "")).toEqual(["name"]);
    expect(invalidFields("name", "x".repeat(41))).toEqual(["name"]);
  });

  it("accepts a name of exactly 40 characters", () => {
    expect(brandSchema.safeParse(withValue("name", "x".repeat(40))).success).toBe(true);
  });

  it.each(["brand/icon.svg", "/brand/icon.gif", "/brand/icon", "/../icon.svg", ""])("reports icon %j", (icon) => {
    expect(invalidFields("icon", icon)).toEqual(["icon"]);
  });

  it("accepts a png icon", () => {
    expect(brandSchema.safeParse(withValue("icon", "/brand/icon.png")).success).toBe(true);
  });

  it("reports headerDisplay", () => {
    expect(invalidFields("headerDisplay", "logo")).toEqual(["headerDisplay"]);
  });

  it.each(["light", "dark"])("reports each bad %s colour by its full path", (mode) => {
    expect(invalidFields(`colors.${mode}.ink`, "red")).toEqual([`colors.${mode}.ink`]);
    expect(invalidFields(`colors.${mode}.paper`, "#fff")).toEqual([`colors.${mode}.paper`]);
  });

  it("reports empty font names and a bad default style", () => {
    expect(invalidFields("fonts.sans", "")).toEqual(["fonts.sans"]);
    expect(invalidFields("fonts.serif", "  ")).toEqual(["fonts.serif"]);
    expect(invalidFields("fonts.defaultStyle", "mono")).toEqual(["fonts.defaultStyle"]);
  });

  it("reports a missing section", () => {
    expect(invalidFields("colors", undefined)).toEqual(["colors"]);
  });
});
