import { z } from "zod";

export const themeSchema = z.enum(["light", "dark"]);
export const fontStyleSchema = z.enum(["serif", "sans"]);

export type Theme = z.infer<typeof themeSchema>;
export type FontStyle = z.infer<typeof fontStyleSchema>;

// Only the given fields change. A null font style goes back to the brand default.
export const updatePreferencesSchema = z
  .object({ theme: themeSchema, fontStyle: fontStyleSchema.nullable() })
  .partial()
  .strict()
  .refine((value) => value.theme !== undefined || value.fontStyle !== undefined, "Give theme or fontStyle");

export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;

// A null theme means not chosen yet.
export interface Preferences {
  theme: Theme | null;
  fontStyle: FontStyle | null;
}

// What the root layout puts on <html>: a theme (none until chosen) and a concrete font style.
export interface Appearance {
  theme: Theme | null;
  font: FontStyle;
}
