import { cache } from "react";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth/session";
import { FONT_COOKIE, THEME_COOKIE } from "@/modules/user-preference/user-preference-cookies";
import { getAppearance } from "@/modules/user-preference/user-preference-service";

// Cached per render, so the root layout and the app layout cost one lookup.
export const readAppearance = cache(async () => {
  const [user, store] = await Promise.all([getUser(), cookies()]);
  return getAppearance(user?.id ?? null, { theme: store.get(THEME_COOKIE)?.value, font: store.get(FONT_COOKIE)?.value });
});
