import { z } from "zod";

// Relative imports with extensions: scripts/generate-brand.ts loads this file with plain Node.

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a #rrggbb colour");

const modeColors = z.object({ ink: color, paper: color });

const fontName = z.string().trim().min(1, "Must not be empty");

export const brandSchema = z.object({
  name: z.string().min(1, "Must be 1 to 40 characters").max(40, "Must be 1 to 40 characters"),
  icon: z
    .string()
    .regex(/^\/.*\.(svg|png)$/, "Must be a path starting with / and ending in .svg or .png")
    .refine((value) => !value.split("/").includes(".."), "Must not contain .."),
  headerDisplay: z.enum(["icon", "text", "icon_text"]),
  colors: z.object({ light: modeColors, dark: modeColors }),
  fonts: z.object({ sans: fontName, serif: fontName, defaultStyle: z.enum(["serif", "sans"]) }),
});

export type BrandConfig = z.infer<typeof brandSchema>;
