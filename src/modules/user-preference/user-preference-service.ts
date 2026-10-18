import { brand } from "@/config/generated/brand";
import * as repository from "./user-preference-repository.ts";
import {
  fontStyleSchema,
  themeSchema,
  type Appearance,
  type FontStyle,
  type Preferences,
  type UpdatePreferences,
} from "./user-preference-schema.ts";

const defaults: Preferences = { theme: null, fontStyle: null };

export function effectiveFont(fontStyle: FontStyle | null): FontStyle {
  return fontStyle ?? brand.fonts.defaultStyle;
}

export async function getPreferences(userId: string): Promise<Preferences> {
  return (await repository.findByUserId(userId)) ?? defaults;
}

export async function savePreferences(userId: string, input: UpdatePreferences): Promise<Preferences> {
  return repository.upsert(userId, input);
}

// The signed-in user's saved preferences win, then the cookies, then the defaults.
export function resolveAppearance(
  saved: Preferences | null,
  cookies: { theme?: string; font?: string },
): Appearance {
  if (saved) return { theme: saved.theme, font: effectiveFont(saved.fontStyle) };
  return {
    theme: themeSchema.safeParse(cookies.theme).data ?? null,
    font: fontStyleSchema.safeParse(cookies.font).data ?? effectiveFont(null),
  };
}

export async function getAppearance(userId: string | null, cookies: { theme?: string; font?: string }) {
  return resolveAppearance(userId ? await repository.findByUserId(userId) : null, cookies);
}
