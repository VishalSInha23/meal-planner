import { z } from "zod";

export const themeSchema = z.enum(["light", "dark"]);
export const fontStyleSchema = z.enum(["serif", "sans"]);
export const weightUnitSchema = z.enum(["kg", "lb"]);
export const heightUnitSchema = z.enum(["cm", "ft_in"]);

export type Theme = z.infer<typeof themeSchema>;
export type FontStyle = z.infer<typeof fontStyleSchema>;
export type WeightUnit = z.infer<typeof weightUnitSchema>;
export type HeightUnit = z.infer<typeof heightUnitSchema>;

export interface Units {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
}

export const DEFAULT_UNITS: Units = { weightUnit: "kg", heightUnit: "cm" };

// Only the given fields change. A null font style goes back to the brand default.
export const updatePreferencesSchema = z
  .object({
    theme: themeSchema,
    fontStyle: fontStyleSchema.nullable(),
    weightUnit: weightUnitSchema,
    heightUnit: heightUnitSchema,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Give at least one setting to change");

export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;

// A null theme means not chosen yet.
export interface Preferences extends Units {
  theme: Theme | null;
  fontStyle: FontStyle | null;
}

// What the root layout puts on <html>: a theme (none until chosen) and a concrete font style.
export interface Appearance {
  theme: Theme | null;
  font: FontStyle;
}
