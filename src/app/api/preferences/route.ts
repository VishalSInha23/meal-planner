import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { route } from "@/lib/http/route";
import { FONT_COOKIE, THEME_COOKIE, preferenceCookieOptions } from "@/modules/user-preference/user-preference-cookies";
import { updatePreferencesSchema } from "@/modules/user-preference/user-preference-schema";
import { effectiveFont, getPreferences, savePreferences } from "@/modules/user-preference/user-preference-service";

export const GET = route(
  async () => {
    const user = await requireUser();
    return Response.json(await getPreferences(user.id));
  },
  { route: "/api/preferences" },
);

export const PUT = route(
  async (request) => {
    const user = await requireUser();
    const input = updatePreferencesSchema.parse(await request.json().catch(() => undefined));
    const saved = await savePreferences(user.id, input);
    const response = NextResponse.json(saved);
    if (saved.theme) response.cookies.set(THEME_COOKIE, saved.theme, preferenceCookieOptions());
    else response.cookies.delete(THEME_COOKIE);
    response.cookies.set(FONT_COOKIE, effectiveFont(saved.fontStyle), preferenceCookieOptions());
    return response;
  },
  { route: "/api/preferences" },
);
